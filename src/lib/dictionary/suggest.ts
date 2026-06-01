import { ueyToUly } from '../converter';
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

export function suggestDictionary(
  query: string,
  entries: readonly DictionaryEntry[] = DICTIONARY_ENTRIES,
  mode?: DictionarySearchMode,
): DictionarySuggestion[] {
  const normalized = normalizeQuery(query);
  if (!normalized) return [];

  const searchMode = normalizeDictionarySearchMode(mode);
  const queryAsUly = normalizeQuery(ueyToUly(query));
  const suggestions = entries
    .flatMap((entry) =>
      rankSuggestions(entry, normalized, queryAsUly, searchMode),
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
  mode: DictionarySearchMode,
): DictionarySuggestion[] {
  const suggestions: DictionarySuggestion[] = [];
  const uly = normalizeQuery(entry.uly);
  const uey = normalizeQuery(entry.uey);

  if (mode !== 'english' && mode !== 'uey' && (uly.startsWith(normalized) || uly.startsWith(queryAsUly))) {
    suggestions.push({ entry, value: entry.uly, matchedOn: 'uly', score: 0 });
  } else if (mode !== 'english' && mode !== 'uey' && (uly.includes(normalized) || uly.includes(queryAsUly))) {
    suggestions.push({ entry, value: entry.uly, matchedOn: 'uly', score: 3 });
  }

  if (mode !== 'english' && mode !== 'uly' && uey.startsWith(normalized)) {
    suggestions.push({ entry, value: entry.uey, matchedOn: 'uey', score: 1 });
  } else if (mode !== 'english' && mode !== 'uly' && uey.includes(normalized)) {
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

function normalizeQuery(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
}
