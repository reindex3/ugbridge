import { ueyToUly, ulyToUey } from '../converter';
import { DICTIONARY_ENTRIES, type DictionaryEntry } from './entries';
import {
  normalizeDictionarySearchMode,
  type DictionarySearchMode,
} from './mode';

export interface DictionarySuggestion {
  entry: DictionaryEntry;
  value: string;
  matchedOn: 'uly' | 'uey' | 'definition';
  score: number;
}

const MAX_SUGGESTIONS = 6;
const ULY_HINT_RE = /(?:gh|ng|sh|ch|zh|[éëöü'’‘ʼ])/i;

export function suggestDictionary(
  query: string,
  entries: readonly DictionaryEntry[] = DICTIONARY_ENTRIES,
  mode?: DictionarySearchMode,
): DictionarySuggestion[] {
  const normalized = normalizeQuery(query);
  if (!normalized) return [];

  const searchMode = normalizeDictionarySearchMode(mode);
  const queryAsUly = normalizeQuery(ueyToUly(query));
  const queryAsUey =
    searchMode === 'uey' || ULY_HINT_RE.test(query)
      ? normalizeQuery(ulyToUey(query))
      : '';
  const suggestions = entries
    .flatMap((entry) =>
      rankSuggestions(entry, normalized, queryAsUly, queryAsUey, searchMode),
    )
    .sort((a, b) => a.score - b.score || a.value.localeCompare(b.value));

  const seen = new Set<string>();
  const unique: DictionarySuggestion[] = [];

  for (const suggestion of suggestions) {
    const key = `${suggestion.matchedOn}:${normalizeQuery(suggestion.value)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(suggestion);
    if (unique.length === MAX_SUGGESTIONS) break;
  }

  return unique;
}

function rankSuggestions(
  entry: DictionaryEntry,
  normalized: string,
  queryAsUly: string,
  queryAsUey: string,
  mode: DictionarySearchMode,
): DictionarySuggestion[] {
  const suggestions: DictionarySuggestion[] = [];
  const uly = normalizeQuery(entry.uly);
  const uey = normalizeQuery(entry.uey);

  if (
    mode !== 'english' &&
    mode !== 'uey' &&
    startsWithQuery(uly, normalized, queryAsUly)
  ) {
    suggestions.push({ entry, value: entry.uly, matchedOn: 'uly', score: 0 });
  } else if (
    mode !== 'english' &&
    mode !== 'uey' &&
    includesQuery(uly, normalized, queryAsUly)
  ) {
    suggestions.push({ entry, value: entry.uly, matchedOn: 'uly', score: 3 });
  }

  if (
    mode !== 'english' &&
    mode !== 'uly' &&
    startsWithQuery(uey, normalized, queryAsUey)
  ) {
    suggestions.push({ entry, value: entry.uey, matchedOn: 'uey', score: 1 });
  } else if (
    mode !== 'english' &&
    mode !== 'uly' &&
    includesQuery(uey, normalized, queryAsUey)
  ) {
    suggestions.push({ entry, value: entry.uey, matchedOn: 'uey', score: 4 });
  }

  if (mode === 'uey' || mode === 'uly') return suggestions;

  for (const definition of entry.definitions) {
    const normalizedDefinition = normalizeQuery(definition);
    if (normalizedDefinition.startsWith(normalized)) {
      suggestions.push({
        entry,
        value: definition,
        matchedOn: 'definition',
        score: 2,
      });
    } else if (normalizedDefinition.includes(normalized)) {
      suggestions.push({
        entry,
        value: definition,
        matchedOn: 'definition',
        score: 5,
      });
    }
  }

  return suggestions;
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
