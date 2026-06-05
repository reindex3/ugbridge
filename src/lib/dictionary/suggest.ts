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
const MIN_FUZZY_QUERY_LENGTH = 3;
const MAX_FUZZY_QUERY_LENGTH = 24;

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
  } else if (mode !== 'english' && mode !== 'uey') {
    const distance = nearMatchDistance(uly, normalized, queryAsUly);
    if (distance !== null) {
      suggestions.push({
        entry,
        value: entry.uly,
        matchedOn: 'uly',
        score: 6 + distance,
      });
    }
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
    } else {
      const distance = nearDefinitionDistance(normalizedDefinition, normalized);
      if (distance !== null) {
        suggestions.push({
          entry,
          value: definition,
          matchedOn: 'definition',
          score: 8 + distance,
        });
      }
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

function nearMatchDistance(
  value: string,
  normalized: string,
  fallback: string,
) {
  return minDefinedDistance([
    boundedEditDistance(value, normalized),
    fallback ? boundedEditDistance(value, fallback) : null,
  ]);
}

function nearDefinitionDistance(definition: string, normalized: string) {
  if (!canFuzzyMatch(normalized)) return null;

  const wholeDistance = boundedEditDistance(definition, normalized);
  const tokenDistances = definition
    .split(/[^a-z0-9éëöü'’‘ʼ]+/i)
    .filter(Boolean)
    .map((token) => boundedEditDistance(normalizeQuery(token), normalized));

  return minDefinedDistance([wholeDistance, ...tokenDistances]);
}

function boundedEditDistance(value: string, query: string) {
  if (!canFuzzyMatch(query)) return null;

  const normalizedValue = normalizeFuzzyToken(value);
  const normalizedQuery = normalizeFuzzyToken(query);
  if (!normalizedValue || !normalizedQuery || normalizedValue === normalizedQuery) {
    return null;
  }

  const limit = fuzzyLimit(normalizedQuery);
  if (Math.abs(normalizedValue.length - normalizedQuery.length) > limit) {
    return null;
  }

  const distance = editDistanceWithinLimit(
    normalizedValue,
    normalizedQuery,
    limit,
  );
  return distance <= limit ? distance : null;
}

function canFuzzyMatch(query: string) {
  return (
    query.length >= MIN_FUZZY_QUERY_LENGTH &&
    query.length <= MAX_FUZZY_QUERY_LENGTH &&
    /[a-z0-9éëöü]/i.test(query)
  );
}

function normalizeFuzzyToken(value: string) {
  return normalizeQuery(value)
    .replace(/[’‘ʼ]/g, "'")
    .replace(/ë/g, 'é')
    .replace(/[^a-z0-9éöü]+/g, '');
}

function fuzzyLimit(query: string) {
  return query.length <= 5 ? 1 : 2;
}

function editDistanceWithinLimit(a: string, b: string, limit: number) {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let row = 1; row <= a.length; row += 1) {
    const current = [row];
    let bestInRow = current[0];

    for (let column = 1; column <= b.length; column += 1) {
      const substitutionCost = a[row - 1] === b[column - 1] ? 0 : 1;
      const next = Math.min(
        previous[column] + 1,
        current[column - 1] + 1,
        previous[column - 1] + substitutionCost,
      );
      current[column] = next;
      bestInRow = Math.min(bestInRow, next);
    }

    if (bestInRow > limit) return limit + 1;
    previous = current;
  }

  return previous[b.length];
}

function minDefinedDistance(values: Array<number | null>) {
  const distances = values.filter((value): value is number => value !== null);
  return distances.length ? Math.min(...distances) : null;
}
