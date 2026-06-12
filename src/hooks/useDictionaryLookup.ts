import { useEffect, useMemo, useState } from 'react';
import {
  DICTIONARY_ENTRIES,
  loadStaticDictionaryEntries,
  loadStaticDictionaryManifest,
  searchDictionary,
  suggestDictionary,
  type DictionaryEntry,
  type DictionarySearchMode,
  type DictionarySearchResult,
  type DictionarySuggestion,
} from '../lib/dictionary';

interface DictionaryLookupState {
  results: DictionarySearchResult[];
  suggestions: DictionarySuggestion[];
  isLoading: boolean;
  entryCount: number;
  definitionCount: number;
  loadedShardCount: number;
  error: string | null;
}

const STATIC_LOOKUP_DEBOUNCE_MS = 180;
const MIN_STATIC_LOOKUP_QUERY_LENGTH = 3;
const EMPTY_STATIC_ENTRIES: readonly DictionaryEntry[] = [];

export function useDictionaryLookup(
  query: string,
  searchMode: DictionarySearchMode,
): DictionaryLookupState {
  const [staticEntries, setStaticEntries] = useState<DictionaryEntry[]>([]);
  const [staticEntriesKey, setStaticEntriesKey] = useState('');
  const [entryCount, setEntryCount] = useState(DICTIONARY_ENTRIES.length);
  const [definitionCount, setDefinitionCount] = useState(
    DICTIONARY_ENTRIES.reduce(
      (total, entry) => total + entry.definitions.length,
      0,
    ),
  );
  const [loadedShardCount, setLoadedShardCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;

    loadStaticDictionaryManifest().then((manifest) => {
      if (!isCurrent || !manifest) return;
      setEntryCount(manifest.entryCount);
      setDefinitionCount(manifest.definitionCount);
    });

    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    let isCurrent = true;
    const trimmedQuery = query.trim();
    const lookupKey = getLookupKey(trimmedQuery, searchMode);

    if (
      !trimmedQuery ||
      trimmedQuery.length < MIN_STATIC_LOOKUP_QUERY_LENGTH
    ) {
      setStaticEntries([]);
      setStaticEntriesKey('');
      setLoadedShardCount(0);
      setIsLoading(false);
      setError(null);
      return () => {
        isCurrent = false;
      };
    }

    setIsLoading(true);
    setError(null);

    const timeoutId = window.setTimeout(() => {
      loadStaticDictionaryEntries(trimmedQuery, searchMode)
        .then((result) => {
          if (!isCurrent) return;
          setStaticEntries(result.entries);
          setStaticEntriesKey(lookupKey);
          setLoadedShardCount(result.loadedShardCount);
          if (result.manifest) {
            setEntryCount(result.manifest.entryCount);
            setDefinitionCount(result.manifest.definitionCount);
          }
        })
        .catch((loadError: unknown) => {
          if (!isCurrent) return;
          setStaticEntries([]);
          setStaticEntriesKey('');
          setLoadedShardCount(0);
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Dictionary load failed',
          );
        })
        .finally(() => {
          if (isCurrent) setIsLoading(false);
        });
    }, STATIC_LOOKUP_DEBOUNCE_MS);

    return () => {
      isCurrent = false;
      window.clearTimeout(timeoutId);
    };
  }, [query, searchMode]);

  const trimmedQuery = query.trim();
  const lookupKey = getLookupKey(trimmedQuery, searchMode);
  const activeStaticEntries =
    staticEntriesKey === lookupKey ? staticEntries : EMPTY_STATIC_ENTRIES;
  const entries = useMemo(
    () => mergeEntries(DICTIONARY_ENTRIES, activeStaticEntries),
    [activeStaticEntries],
  );

  const results = useMemo(
    () => searchDictionary(query, entries, searchMode),
    [entries, query, searchMode],
  );

  const suggestions = useMemo(
    () => suggestDictionary(query, entries, searchMode),
    [entries, query, searchMode],
  );

  return {
    results,
    suggestions,
    isLoading,
    entryCount,
    definitionCount,
    loadedShardCount,
    error,
  };
}

function getLookupKey(query: string, searchMode: DictionarySearchMode) {
  return query ? `${searchMode}:${query}` : '';
}

function mergeEntries(
  seedEntries: readonly DictionaryEntry[],
  staticEntries: readonly DictionaryEntry[],
) {
  const entries = [...seedEntries];
  const seen = new Set(seedEntries.map((entry) => entry.uey));

  for (const entry of staticEntries) {
    if (seen.has(entry.uey)) continue;
    seen.add(entry.uey);
    entries.push(entry);
  }

  return entries;
}
