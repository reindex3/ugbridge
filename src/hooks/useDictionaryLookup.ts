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

export function useDictionaryLookup(
  query: string,
  searchMode: DictionarySearchMode,
): DictionaryLookupState {
  const [staticEntries, setStaticEntries] = useState<DictionaryEntry[]>([]);
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

    if (!trimmedQuery) {
      setStaticEntries([]);
      setLoadedShardCount(0);
      setIsLoading(false);
      setError(null);
      return () => {
        isCurrent = false;
      };
    }

    setIsLoading(true);
    setError(null);

    loadStaticDictionaryEntries(trimmedQuery, searchMode)
      .then((result) => {
        if (!isCurrent) return;
        setStaticEntries(result.entries);
        setLoadedShardCount(result.loadedShardCount);
        if (result.manifest) {
          setEntryCount(result.manifest.entryCount);
          setDefinitionCount(result.manifest.definitionCount);
        }
      })
      .catch((loadError: unknown) => {
        if (!isCurrent) return;
        setStaticEntries([]);
        setLoadedShardCount(0);
        setError(loadError instanceof Error ? loadError.message : 'Dictionary load failed');
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [query, searchMode]);

  const entries = useMemo(
    () => mergeEntries(DICTIONARY_ENTRIES, staticEntries),
    [staticEntries],
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
