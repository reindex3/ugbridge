import { ueyToUly, ulyToUey } from '../converter';
import { DICTIONARY_ENTRIES, type DictionaryEntry } from './entries';
import {
  normalizeDictionarySearchMode,
  type DictionarySearchMode,
} from './mode';

export interface DictionarySearchResult {
  entry: DictionaryEntry;
  score: number;
  matchedOn: 'uly' | 'uey' | 'definition' | 'example';
  matchedText: string;
}

const MAX_RESULTS = 12;
const ULY_HINT_RE = /(?:gh|ng|sh|ch|zh|[éëöü'’‘ʼ])/i;
const COMMON_ULY_QUERY_ALIASES: Record<string, string> = {
  rahmet: 'rehmet',
  rehemet: 'rehmet',
};

export function searchDictionary(
  query: string,
  entries: readonly DictionaryEntry[] = DICTIONARY_ENTRIES,
  mode?: DictionarySearchMode,
): DictionarySearchResult[] {
  const normalized = normalizeQuery(query);
  if (!normalized) return [];

  const searchMode = normalizeDictionarySearchMode(mode);
  const queryAsUly = normalizeUlyQueryAlias(normalizeQuery(ueyToUly(query)));
  const queryAsUey =
    searchMode === 'uey' || ULY_HINT_RE.test(query)
      ? normalizeQuery(ulyToUey(query))
      : '';
  const results = entries
    .map((entry) =>
      rankEntry(entry, normalized, queryAsUly, queryAsUey, searchMode),
    )
    .filter((result): result is DictionarySearchResult => result !== null)
    .sort((a, b) => a.score - b.score || a.entry.uly.localeCompare(b.entry.uly));
  const curatedExactDefinitionResults = results.filter((result) =>
    isCuratedExactDefinitionMatch(result, normalized),
  );
  const exactHeadwordResults = results.filter((result) =>
    isExactHeadwordMatch(result, normalized, queryAsUly, queryAsUey),
  );
  const visibleResults = shouldPreferCuratedEnglishResults(
    searchMode,
    query,
    curatedExactDefinitionResults,
  )
    ? curatedExactDefinitionResults
    : exactHeadwordResults.length
    ? exactHeadwordResults
    : results;

  return visibleResults.slice(0, MAX_RESULTS);
}

function rankEntry(
  entry: DictionaryEntry,
  normalized: string,
  queryAsUly: string,
  queryAsUey: string,
  mode: DictionarySearchMode,
): DictionarySearchResult | null {
  const uly = normalizeQuery(entry.uly);
  const uey = normalizeQuery(entry.uey);
  const entryPenalty = getEntryRankPenalty(entry);
  const definitionPenalty =
    Math.min(entry.definitions.length, 12) / 100 + entryPenalty;

  if (
    mode !== 'english' &&
    mode !== 'uey' &&
    matchesQuery(uly, normalized, queryAsUly)
  ) {
    return {
      entry,
      score: definitionPenalty,
      matchedOn: 'uly',
      matchedText: entry.uly,
    };
  }
  if (
    mode !== 'english' &&
    mode !== 'uly' &&
    matchesQuery(uey, normalized, queryAsUey)
  ) {
    return {
      entry,
      score: definitionPenalty,
      matchedOn: 'uey',
      matchedText: entry.uey,
    };
  }
  const exactDefinition =
    mode !== 'uey' && mode !== 'uly'
      ? findDefinition(entry, (definition) => definition === normalized)
      : undefined;
  if (mode !== 'uey' && mode !== 'uly' && exactDefinition) {
    return {
      entry,
      score: 1 + definitionPenalty,
      matchedOn: 'definition',
      matchedText: exactDefinition,
    };
  }
  if (
    mode !== 'english' &&
    mode !== 'uey' &&
    startsWithQuery(uly, normalized, queryAsUly)
  ) {
    return {
      entry,
      score: 2 + definitionPenalty,
      matchedOn: 'uly',
      matchedText: entry.uly,
    };
  }
  if (
    mode !== 'english' &&
    mode !== 'uly' &&
    startsWithQuery(uey, normalized, queryAsUey)
  ) {
    return {
      entry,
      score: 2 + definitionPenalty,
      matchedOn: 'uey',
      matchedText: entry.uey,
    };
  }
  const prefixDefinition =
    mode !== 'uey' && mode !== 'uly'
      ? findDefinition(entry, (definition) => definition.startsWith(normalized))
      : undefined;
  if (mode !== 'uey' && mode !== 'uly' && prefixDefinition) {
    return {
      entry,
      score: 3 + definitionPenalty,
      matchedOn: 'definition',
      matchedText: prefixDefinition,
    };
  }
  if (
    mode !== 'english' &&
    mode !== 'uey' &&
    includesQuery(uly, normalized, queryAsUly)
  ) {
    return {
      entry,
      score: 4 + definitionPenalty,
      matchedOn: 'uly',
      matchedText: entry.uly,
    };
  }
  if (
    mode !== 'english' &&
    mode !== 'uly' &&
    includesQuery(uey, normalized, queryAsUey)
  ) {
    return {
      entry,
      score: 4 + definitionPenalty,
      matchedOn: 'uey',
      matchedText: entry.uey,
    };
  }
  const includedDefinition =
    mode !== 'uey' && mode !== 'uly'
      ? findDefinition(entry, (definition) => definition.includes(normalized))
      : undefined;
  if (mode !== 'uey' && mode !== 'uly' && includedDefinition) {
    return {
      entry,
      score: 5 + definitionPenalty,
      matchedOn: 'definition',
      matchedText: includedDefinition,
    };
  }
  const includedExample = entry.examples?.find((example) =>
    (mode === 'english'
      ? [example.english]
      : [example.uey, example.uly, example.english]
    ).some((value) => normalizeQuery(value).includes(normalized)),
  );
  if (mode !== 'uey' && mode !== 'uly' && includedExample) {
    return {
      entry,
      score: 6 + definitionPenalty,
      matchedOn: 'example',
      matchedText: includedExample.english,
    };
  }

  return null;
}

function findDefinition(
  entry: DictionaryEntry,
  matches: (definition: string) => boolean,
) {
  for (const definition of entry.definitions) {
    if (matches(normalizeQuery(definition))) return definition;
  }

  return undefined;
}

function matchesQuery(value: string, normalized: string, fallback: string) {
  return value === normalized || Boolean(fallback && value === fallback);
}

function isExactHeadwordMatch(
  result: DictionarySearchResult,
  normalized: string,
  queryAsUly: string,
  queryAsUey: string,
) {
  if (result.matchedOn === 'uly') {
    return matchesQuery(normalizeQuery(result.entry.uly), normalized, queryAsUly);
  }

  if (result.matchedOn === 'uey') {
    return matchesQuery(normalizeQuery(result.entry.uey), normalized, queryAsUey);
  }

  return false;
}

function isCuratedExactDefinitionMatch(
  result: DictionarySearchResult,
  normalized: string,
) {
  return (
    result.matchedOn === 'definition' &&
    !result.entry.id.startsWith('static-') &&
    normalizeQuery(result.matchedText) === normalized
  );
}

function shouldPreferCuratedEnglishResults(
  mode: DictionarySearchMode,
  query: string,
  results: readonly DictionarySearchResult[],
) {
  return mode === 'auto' && results.length > 0 && isPlainLatinQuery(query);
}

function startsWithQuery(value: string, normalized: string, fallback: string) {
  return (
    value.startsWith(normalized) ||
    Boolean(fallback && value.startsWith(fallback))
  );
}

function includesQuery(value: string, normalized: string, fallback: string) {
  return (
    value.includes(normalized) ||
    Boolean(fallback && value.includes(fallback))
  );
}

function normalizeQuery(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
}

function normalizeUlyQueryAlias(value: string): string {
  return COMMON_ULY_QUERY_ALIASES[value] ?? value;
}

function isPlainLatinQuery(value: string) {
  return (
    /[a-z]/i.test(value) &&
    !ULY_HINT_RE.test(value) &&
    !/[\u0600-\u06ff]/u.test(value)
  );
}

function getEntryRankPenalty(entry: DictionaryEntry) {
  const sourcePenalty = entry.id.startsWith('static-') ? 0.1 : 0;
  const headwordWords = normalizeQuery(entry.uly).split(/\s+/).filter(Boolean);
  const lengthPenalty =
    Math.min(Math.max(headwordWords.length - 1, 0), 8) / 100;
  const punctuationPenalty = /[(),;:،؛]/u.test(entry.uly) ? 0.05 : 0;

  return sourcePenalty + lengthPenalty + punctuationPenalty;
}
