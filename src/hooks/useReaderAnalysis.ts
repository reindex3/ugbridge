import { useEffect, useMemo, useState } from 'react';
import {
  DICTIONARY_ENTRIES,
  loadStaticDictionaryEntries,
  searchDictionary,
  type DictionaryEntry,
  type DictionarySearchResult,
} from '../lib/dictionary';
import {
  analyzeReaderText,
  type ReaderLookupCandidate,
} from '../lib/reader';

export interface ReaderLookupMatch {
  candidate: ReaderLookupCandidate;
  query: string;
  results: DictionarySearchResult[];
  isRootFallback: boolean;
}

interface ReaderLookupState {
  matches: Record<string, ReaderLookupMatch>;
  isLoading: boolean;
  loadedShardCount: number;
  error: string | null;
}

const EMPTY_LOOKUP_STATE: ReaderLookupState = {
  matches: {},
  isLoading: false,
  loadedShardCount: 0,
  error: null,
};

export function useReaderAnalysis(text: string) {
  const analysis = useMemo(() => analyzeReaderText(text), [text]);
  const [lookupState, setLookupState] =
    useState<ReaderLookupState>(EMPTY_LOOKUP_STATE);
  const candidateKey = useMemo(
    () => analysis.lookupCandidates.map((candidate) => candidate.key).join('|'),
    [analysis.lookupCandidates],
  );

  useEffect(() => {
    let isCurrent = true;
    const candidates = analysis.lookupCandidates;

    if (!candidates.length) {
      setLookupState(EMPTY_LOOKUP_STATE);
      return () => {
        isCurrent = false;
      };
    }

    setLookupState((current) => ({
      ...current,
      isLoading: true,
      error: null,
    }));

    Promise.all(candidates.map(loadCandidateMatch))
      .then((matches) => {
        if (!isCurrent) return;

        const nextMatches: Record<string, ReaderLookupMatch> = {};
        let loadedShardCount = 0;

        for (const item of matches) {
          loadedShardCount += item.loadedShardCount;
          if (item.match) nextMatches[item.match.candidate.key] = item.match;
        }

        setLookupState({
          matches: nextMatches,
          isLoading: false,
          loadedShardCount,
          error: null,
        });
      })
      .catch((error: unknown) => {
        if (!isCurrent) return;
        setLookupState({
          matches: {},
          isLoading: false,
          loadedShardCount: 0,
          error:
            error instanceof Error
              ? error.message
              : 'Reader dictionary lookup failed',
        });
      });

    return () => {
      isCurrent = false;
    };
  }, [analysis.lookupCandidates, candidateKey]);

  return {
    analysis,
    ...lookupState,
  };
}

async function loadCandidateMatch(candidate: ReaderLookupCandidate) {
  let loadedShardCount = 0;

  for (const query of candidate.queries) {
    const staticResult = await loadStaticDictionaryEntries(query, 'uly');
    loadedShardCount += staticResult.loadedShardCount;
    const entries = mergeEntries(DICTIONARY_ENTRIES, staticResult.entries);
    const results = searchDictionary(query, entries, 'uly');

    if (results.length) {
      return {
        loadedShardCount,
        match: {
          candidate,
          query,
          results: results.slice(0, 3),
          isRootFallback: query !== candidate.queries[0],
        },
      };
    }
  }

  return { loadedShardCount, match: null };
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
