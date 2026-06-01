import { ueyToUly } from '../converter';
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

export function searchDictionary(
  query: string,
  entries: readonly DictionaryEntry[] = DICTIONARY_ENTRIES,
  mode?: DictionarySearchMode,
): DictionarySearchResult[] {
  const normalized = normalizeQuery(query);
  if (!normalized) return [];

  const searchMode = normalizeDictionarySearchMode(mode);
  const queryAsUly = normalizeQuery(ueyToUly(query));
  const results = entries
    .map((entry) => rankEntry(entry, normalized, queryAsUly, searchMode))
    .filter((result): result is DictionarySearchResult => result !== null)
    .sort((a, b) => a.score - b.score || a.entry.uly.localeCompare(b.entry.uly));

  return results.slice(0, MAX_RESULTS);
}

function rankEntry(
  entry: DictionaryEntry,
  normalized: string,
  queryAsUly: string,
  mode: DictionarySearchMode,
): DictionarySearchResult | null {
  const uly = normalizeQuery(entry.uly);
  const uey = normalizeQuery(entry.uey);
  const exactDefinition = entry.definitions.find(
    (definition) => normalizeQuery(definition) === normalized,
  );
  const prefixDefinition = entry.definitions.find((definition) =>
    normalizeQuery(definition).startsWith(normalized),
  );
  const includedDefinition = entry.definitions.find((definition) =>
    normalizeQuery(definition).includes(normalized),
  );
  const includedExample = entry.examples?.find((example) =>
    (mode === 'english'
      ? [example.english]
      : [example.uey, example.uly, example.english]
    ).some((value) => normalizeQuery(value).includes(normalized)),
  );
  const definitionPenalty = Math.min(entry.definitions.length, 12) / 100;

  if (
    mode !== 'english' &&
    mode !== 'uey' &&
    (uly === normalized || uly === queryAsUly)
  ) {
    return {
      entry,
      score: definitionPenalty,
      matchedOn: 'uly',
      matchedText: entry.uly,
    };
  }
  if (mode !== 'english' && mode !== 'uly' && uey === normalized) {
    return {
      entry,
      score: definitionPenalty,
      matchedOn: 'uey',
      matchedText: entry.uey,
    };
  }
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
    (uly.startsWith(normalized) || uly.startsWith(queryAsUly))
  ) {
    return {
      entry,
      score: 2 + definitionPenalty,
      matchedOn: 'uly',
      matchedText: entry.uly,
    };
  }
  if (mode !== 'english' && mode !== 'uly' && uey.startsWith(normalized)) {
    return {
      entry,
      score: 2 + definitionPenalty,
      matchedOn: 'uey',
      matchedText: entry.uey,
    };
  }
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
    (uly.includes(normalized) || uly.includes(queryAsUly))
  ) {
    return {
      entry,
      score: 4 + definitionPenalty,
      matchedOn: 'uly',
      matchedText: entry.uly,
    };
  }
  if (mode !== 'english' && mode !== 'uly' && uey.includes(normalized)) {
    return {
      entry,
      score: 4 + definitionPenalty,
      matchedOn: 'uey',
      matchedText: entry.uey,
    };
  }
  if (mode !== 'uey' && mode !== 'uly' && includedDefinition) {
    return {
      entry,
      score: 5 + definitionPenalty,
      matchedOn: 'definition',
      matchedText: includedDefinition,
    };
  }
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

function normalizeQuery(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
}
