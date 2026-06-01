import { useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { GraduationCap, Repeat2, Search } from 'lucide-react';
import {
  type DictionarySearchMode,
  type DictionarySuggestion,
  type DictionarySearchResult,
} from '../lib/dictionary';
import { useDictionaryLookup } from '../hooks/useDictionaryLookup';
import { UlyInputHelper } from './UlyInputHelper';

interface DictionaryPanelProps {
  query: string;
  onQueryChange: (value: string) => void;
  onStudy: (uly: string) => void;
  onConvert: (uey: string) => void;
}

const SUGGESTED_QUERIES = ['salam', 'ياخشى', 'book', 'apple', 'thank you'];
const VISIBLE_DEFINITION_COUNT = 5;
const SEARCH_MODES: Array<{ mode: DictionarySearchMode; label: string }> = [
  { mode: 'auto', label: 'Auto' },
  { mode: 'english', label: 'English' },
  { mode: 'uey', label: 'UEY' },
  { mode: 'uly', label: 'ULY' },
];

export function DictionaryPanel({
  query,
  onQueryChange,
  onStudy,
  onConvert,
}: DictionaryPanelProps) {
  const [searchMode, setSearchMode] =
    useState<DictionarySearchMode>('auto');
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const {
    results,
    suggestions,
    isLoading,
    entryCount,
    definitionCount,
    loadedShardCount,
    error,
  } = useDictionaryLookup(query, searchMode);
  const hasQuery = query.trim().length > 0;
  const showSuggestions = isSuggesting && hasQuery && suggestions.length > 0;
  const showUlyHelper = searchMode === 'auto' || searchMode === 'uly';

  const chooseSuggestion = (suggestion: DictionarySuggestion) => {
    onQueryChange(suggestion.value);
    setIsSuggesting(false);
    setSelectedSuggestion(0);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedSuggestion((current) =>
        current + 1 >= suggestions.length ? 0 : current + 1,
      );
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedSuggestion((current) =>
        current - 1 < 0 ? suggestions.length - 1 : current - 1,
      );
    } else if (event.key === 'Enter') {
      event.preventDefault();
      chooseSuggestion(suggestions[selectedSuggestion]);
    } else if (event.key === 'Escape') {
      setIsSuggesting(false);
    }
  };

  const insertUlyText = (text: string) => {
    const input = inputRef.current;
    if (!input) {
      onQueryChange(`${query}${text}`);
      return;
    }

    const start = input.selectionStart ?? query.length;
    const end = input.selectionEnd ?? query.length;
    const next = `${query.slice(0, start)}${text}${query.slice(end)}`;
    onQueryChange(next);
    setSearchMode((current) => (current === 'english' || current === 'uey' ? 'uly' : current));
    setIsSuggesting(true);
    requestAnimationFrame(() => {
      input.focus();
      const cursor = start + text.length;
      input.setSelectionRange(cursor, cursor);
    });
  };

  return (
    <div className="grid gap-5">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div>
            <label
              htmlFor="dictionary-search"
              className="text-sm font-semibold text-slate-700"
            >
              Dictionary search
            </label>
            <div
              className="mt-2 grid grid-cols-4 rounded-lg border border-slate-200 bg-slate-50 p-1"
              aria-label="Dictionary input language"
            >
              {SEARCH_MODES.map((item) => (
                <button
                  key={item.mode}
                  type="button"
                  onClick={() => {
                    setSearchMode(item.mode);
                    setSelectedSuggestion(0);
                    setIsSuggesting(true);
                  }}
                  className={`rounded-md px-2 py-1.5 text-xs font-semibold transition ${
                    searchMode === item.mode
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                  aria-pressed={searchMode === item.mode}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="relative mt-2">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                ref={inputRef}
                id="dictionary-search"
                value={query}
                onChange={(event) => {
                  onQueryChange(event.target.value);
                  setIsSuggesting(true);
                  setSelectedSuggestion(0);
                }}
                onFocus={() => setIsSuggesting(true)}
                onKeyDown={handleKeyDown}
                placeholder={getSearchPlaceholder(searchMode)}
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={showSuggestions}
                aria-controls="dictionary-suggestions"
                aria-activedescendant={
                  showSuggestions
                    ? `dictionary-suggestion-${selectedSuggestion}`
                    : undefined
                }
                className="h-12 w-full rounded-lg border border-slate-200 bg-white px-4 pl-11 text-base text-slate-950 shadow-xs transition placeholder:text-slate-400 focus:border-indigo-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-200"
              />
              {showSuggestions ? (
                <div
                  id="dictionary-suggestions"
                  role="listbox"
                  className="absolute z-20 mt-2 max-h-80 w-full overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
                >
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={`${suggestion.entry.id}-${suggestion.value}`}
                      id={`dictionary-suggestion-${index}`}
                      type="button"
                      role="option"
                      aria-selected={index === selectedSuggestion}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => chooseSuggestion(suggestion)}
                      onMouseEnter={() => setSelectedSuggestion(index)}
                      className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left transition ${
                        index === selectedSuggestion
                          ? 'bg-indigo-50 text-indigo-900'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="min-w-0">
                        <span
                          className="block truncate text-sm font-semibold"
                          dir={suggestion.matchedOn === 'uey' ? 'rtl' : 'ltr'}
                          lang={suggestion.matchedOn === 'uey' ? 'ug' : 'en'}
                        >
                          {suggestion.value}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-slate-500">
                          {suggestion.entry.uly} · {suggestion.entry.definitions[0]}
                        </span>
                      </span>
                      <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[0.65rem] font-semibold text-slate-500 ring-1 ring-slate-200">
                        {suggestion.matchedOn}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            {showUlyHelper ? <UlyInputHelper onInsert={insertUlyText} className="mt-2" /> : null}
          </div>
          <div className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-500 ring-1 ring-slate-200">
            {entryCount.toLocaleString()} entries · {definitionCount.toLocaleString()} definitions ·{' '}
            {getSearchModeLabel(searchMode)}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTED_QUERIES.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onQueryChange(item)}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-700"
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      {hasQuery ? (
        <div className="grid gap-3">
          <DictionaryLoadState
            isLoading={isLoading}
            error={error}
            loadedShardCount={loadedShardCount}
          />
          {results.length ? (
            results.map((result) => (
              <DictionaryResultCard
                key={result.entry.id}
                result={result}
                onStudy={onStudy}
                onConvert={onConvert}
              />
            ))
          ) : isLoading ? null : (
            <EmptyDictionaryState query={query} />
          )}
        </div>
      ) : (
        <DictionaryOverview
          entryCount={entryCount}
          definitionCount={definitionCount}
        />
      )}
    </div>
  );
}

function getSearchPlaceholder(mode: DictionarySearchMode) {
  if (mode === 'english') return 'Search English definitions...';
  if (mode === 'uey') return 'Search UEY Arabic...';
  if (mode === 'uly') return 'Search ULY Latin...';
  return 'Search UEY, ULY, or English...';
}

function getSearchModeLabel(mode: DictionarySearchMode) {
  if (mode === 'english') return 'English';
  if (mode === 'uey') return 'UEY';
  if (mode === 'uly') return 'ULY';
  return 'Auto';
}

function DictionaryResultCard({
  result,
  onStudy,
  onConvert,
}: {
  result: DictionarySearchResult;
  onStudy: (uly: string) => void;
  onConvert: (uey: string) => void;
}) {
  const { entry } = result;
  const [showAllDefinitions, setShowAllDefinitions] = useState(false);
  const visibleDefinitions = showAllDefinitions
    ? entry.definitions
    : entry.definitions.slice(0, VISIBLE_DEFINITION_COUNT);
  const hiddenDefinitionCount =
    entry.definitions.length - visibleDefinitions.length;

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h2 dir="rtl" lang="ug" className="text-4xl leading-relaxed text-slate-950">
              {entry.uey}
            </h2>
            <div>
              <div className="font-mono text-lg font-semibold text-indigo-700">
                {entry.uly}
              </div>
              {entry.ipa ? (
                <div className="font-mono text-sm text-slate-500">
                  /{entry.ipa}/
                </div>
              ) : null}
            </div>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {entry.partOfSpeech}
            </span>
            <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
              {matchLabel(result)}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onStudy(entry.uly)}
            className="inline-flex items-center gap-2 rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
          >
            <GraduationCap className="h-4 w-4" aria-hidden="true" />
            Study
          </button>
          <button
            type="button"
            onClick={() => onConvert(entry.uey)}
            className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Repeat2 className="h-4 w-4" aria-hidden="true" />
            Convert
          </button>
        </div>
      </div>

      <ol className="mt-4 flex flex-wrap gap-2 text-sm text-slate-700">
        {visibleDefinitions.map((definition) => (
          <li
            key={definition}
            className={`rounded-md px-2.5 py-1 ring-1 ${
              definition === result.matchedText
                ? 'bg-amber-50 text-amber-900 ring-amber-200'
                : 'bg-slate-50 ring-slate-200'
            }`}
          >
            {definition}
          </li>
        ))}
      </ol>
      {hiddenDefinitionCount > 0 ? (
        <button
          type="button"
          onClick={() => setShowAllDefinitions(true)}
          className="mt-3 text-sm font-semibold text-indigo-700 transition hover:text-indigo-900"
        >
          Show {hiddenDefinitionCount} more definition
          {hiddenDefinitionCount === 1 ? '' : 's'}
        </button>
      ) : null}

      {entry.examples?.length ? (
        <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4">
          {entry.examples.map((example) => (
            <div key={`${entry.id}-${example.uly}`} className="rounded-md bg-slate-50 p-3">
              <div dir="rtl" lang="ug" className="text-2xl text-slate-950">
                {example.uey}
              </div>
              <div className="mt-1 font-mono text-sm font-semibold text-indigo-700">
                {example.uly}
              </div>
              <div className="mt-1 text-sm text-slate-600">
                {example.english}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function matchLabel(result: DictionarySearchResult) {
  if (result.matchedOn === 'uey') return 'UEY headword';
  if (result.matchedOn === 'uly') return 'ULY headword';
  if (result.matchedOn === 'definition') return `English: ${result.matchedText}`;
  return 'Example match';
}

function DictionaryLoadState({
  isLoading,
  error,
  loadedShardCount,
}: {
  isLoading: boolean;
  error: string | null;
  loadedShardCount: number;
}) {
  if (error) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
        Large dictionary unavailable; showing seed results only.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">
        <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-500" />
        Searching dictionary...
      </div>
    );
  }

  if (loadedShardCount > 0) {
    return (
      <div className="text-xs text-slate-400">
        Searched {loadedShardCount} dictionary shard
        {loadedShardCount === 1 ? '' : 's'}.
      </div>
    );
  }

  return null;
}

function DictionaryOverview({
  entryCount,
  definitionCount,
}: {
  entryCount: number;
  definitionCount: number;
}) {
  return (
    <section className="rounded-lg border border-dashed border-slate-300 bg-white/70 p-6 text-sm leading-6 text-slate-500">
      Search works offline against {entryCount.toLocaleString()} Uyghur
      headwords and {definitionCount.toLocaleString()} English definitions.
      The large dataset is loaded in small shards as you type.
    </section>
  );
}

function EmptyDictionaryState({ query }: { query: string }) {
  return (
    <section className="rounded-lg border border-dashed border-slate-300 bg-white/70 p-6 text-sm leading-6 text-slate-500">
      No local dictionary match for <span className="font-semibold">{query}</span>.
    </section>
  );
}
