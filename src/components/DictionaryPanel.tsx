import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import {
  Check,
  Clock3,
  Copy,
  GraduationCap,
  Repeat2,
  Search,
  SearchX,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import {
  type DictionaryEntry,
  type DictionarySearchMode,
  type DictionarySuggestion,
  type DictionarySearchResult,
} from '../lib/dictionary';
import { ueyToUly, ulyToUey } from '../lib/converter';
import {
  loadDictionaryLookups,
  recordDictionaryLookup,
  saveDictionaryLookups,
} from '../lib/local-profile';
import { useDictionaryLookup } from '../hooks/useDictionaryLookup';
import { UlyInputHelper } from './UlyInputHelper';

interface DictionaryPanelProps {
  query: string;
  onQueryChange: (value: string) => void;
  onStudy: (uly: string) => void;
  onConvert: (uey: string) => void;
}

interface DictionaryFavoriteRecord {
  id: string;
  uey: string;
  uly: string;
  definition: string;
  partOfSpeech: string;
  updatedAt: number;
}

const SUGGESTED_QUERIES = ['salam', 'ياخشى', 'book', 'apple', 'thank you'];
const VISIBLE_DEFINITION_COUNT = 5;
const RECENT_QUERY_STORAGE_KEY = 'ugbridge.dictionary.recent.v1';
const FAVORITE_STORAGE_KEY = 'ugbridge.dictionary.favorites.v1';
const MAX_RECENT_QUERIES = 8;
const MAX_FAVORITE_ENTRIES = 24;
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
  const [recentQueries, setRecentQueries] = useState<string[]>(
    loadRecentDictionaryQueries,
  );
  const [favoriteEntries, setFavoriteEntries] = useState<
    DictionaryFavoriteRecord[]
  >(loadDictionaryFavorites);
  const [panelNotice, setPanelNotice] = useState('');
  const [copiedKey, setCopiedKey] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const recordedLookupRef = useRef('');
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
  const favoriteIds = new Set(favoriteEntries.map((entry) => entry.id));

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2 || isLoading) return;

    const timer = window.setTimeout(() => {
      setRecentQueries(saveRecentDictionaryQuery(trimmed));
    }, 700);

    return () => window.clearTimeout(timer);
  }, [isLoading, query]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || isLoading || !results.length) return;

    const entry = results[0].entry;
    const recordKey = `${trimmed.toLocaleLowerCase()}:${entry.id}`;
    if (recordedLookupRef.current === recordKey) return;

    recordedLookupRef.current = recordKey;
    saveDictionaryLookups(
      recordDictionaryLookup(loadDictionaryLookups(), {
        query: trimmed,
        entry,
      }),
    );
  }, [isLoading, query, results]);

  const showPanelNotice = (message: string) => {
    setPanelNotice(message);
    window.setTimeout(() => setPanelNotice(''), 1800);
  };

  const chooseSuggestion = (suggestion: DictionarySuggestion) => {
    onQueryChange(suggestion.value);
    setIsSuggesting(false);
    setSelectedSuggestion(0);
  };

  const executeSearch = () => {
    const trimmed = query.trim();
    if (!trimmed) return;

    onQueryChange(trimmed);
    setIsSuggesting(false);
    setSelectedSuggestion(0);
    setRecentQueries(saveRecentDictionaryQuery(trimmed));
    showPanelNotice('Search updated');
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestions) {
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
        event.stopPropagation();
        setIsSuggesting(false);
      }
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      executeSearch();
    } else if (event.key === 'Escape') {
      event.stopPropagation();
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

  const chooseQuery = (value: string) => {
    onQueryChange(value);
    setIsSuggesting(false);
    setSelectedSuggestion(0);
  };

  const copyDictionaryText = async (text: string, label: string) => {
    if (!navigator.clipboard?.writeText) {
      showPanelNotice('Clipboard copy unavailable');
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(label);
      window.setTimeout(() => setCopiedKey(''), 1800);
      showPanelNotice(`${label} copied`);
    } catch {
      showPanelNotice('Clipboard copy blocked');
    }
  };

  const removeRecentQuery = (value: string) => {
    setRecentQueries(removeRecentDictionaryQuery(value));
    showPanelNotice('Recent search removed');
  };

  const clearRecentQueries = () => {
    setRecentQueries(clearRecentDictionaryQueries());
    showPanelNotice('Recent searches cleared');
  };

  const toggleFavoriteEntry = (entry: DictionaryEntry) => {
    const isFavorite = favoriteIds.has(entry.id);
    setFavoriteEntries(
      isFavorite
        ? removeDictionaryFavorite(entry.id)
        : saveDictionaryFavorite(entry),
    );
    showPanelNotice(isFavorite ? 'Favorite removed' : 'Favorite saved');
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
              onClick={() => chooseQuery(item)}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-700"
            >
              {item}
            </button>
          ))}
        </div>
        <DictionaryMemoryStrip
          favorites={favoriteEntries}
          recentQueries={recentQueries}
          onChoose={chooseQuery}
          onRemoveFavorite={(id) => {
            setFavoriteEntries(removeDictionaryFavorite(id));
            showPanelNotice('Favorite removed');
          }}
          onRemoveRecent={removeRecentQuery}
          onClearRecent={clearRecentQueries}
        />
        {panelNotice ? (
          <div
            role="status"
            aria-live="polite"
            className="mt-3 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
          >
            {panelNotice}
          </div>
        ) : null}
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
                query={query}
                onStudy={onStudy}
                onConvert={onConvert}
                onCopy={copyDictionaryText}
                copiedKey={copiedKey}
                isFavorite={favoriteIds.has(result.entry.id)}
                onToggleFavorite={toggleFavoriteEntry}
              />
            ))
          ) : isLoading ? null : (
            <EmptyDictionaryState
              query={query}
              suggestions={suggestions}
              onChoose={chooseQuery}
              searchMode={searchMode}
            />
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

function DictionaryMemoryStrip({
  favorites,
  recentQueries,
  onChoose,
  onRemoveFavorite,
  onRemoveRecent,
  onClearRecent,
}: {
  favorites: readonly DictionaryFavoriteRecord[];
  recentQueries: readonly string[];
  onChoose: (value: string) => void;
  onRemoveFavorite: (id: string) => void;
  onRemoveRecent: (value: string) => void;
  onClearRecent: () => void;
}) {
  if (!favorites.length && !recentQueries.length) return null;

  return (
    <div className="mt-4 grid gap-3 border-t border-slate-100 pt-3">
      {favorites.length ? (
        <div className="grid gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700">
            <Star className="h-3.5 w-3.5 fill-amber-400" aria-hidden="true" />
            Favorites
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {favorites.map((entry) => (
              <span
                key={entry.id}
                className="inline-flex min-w-40 max-w-64 shrink-0 overflow-hidden rounded-md border border-amber-200 bg-amber-50 text-left text-xs text-amber-950"
              >
                <button
                  type="button"
                  onClick={() => onChoose(entry.uly)}
                  className="min-w-0 flex-1 px-3 py-2 text-left"
                  title={`${entry.uly} · ${entry.definition}`}
                >
                  <span
                    dir="rtl"
                    lang="ug"
                    className="block truncate text-lg leading-6"
                  >
                    {entry.uey}
                  </span>
                  <span className="block truncate font-mono font-semibold">
                    {entry.uly}
                  </span>
                  {entry.definition ? (
                    <span className="block truncate text-amber-800">
                      {entry.definition}
                    </span>
                  ) : null}
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveFavorite(entry.id)}
                  className="grid w-8 shrink-0 place-items-center border-l border-amber-200 text-amber-700 transition hover:bg-white"
                  aria-label={`Remove ${entry.uly} from dictionary favorites`}
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {recentQueries.length ? (
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
              Recent searches
            </div>
            <button
              type="button"
              onClick={onClearRecent}
              aria-label="Clear recent searches"
              className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Clear
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentQueries.map((item) => (
              <span
                key={item}
                className="inline-flex max-w-56 items-center overflow-hidden rounded-md border border-slate-200 bg-slate-50 text-xs font-medium text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
              >
                <button
                  type="button"
                  onClick={() => onChoose(item)}
                  className="min-w-0 truncate px-3 py-1.5"
                  title={item}
                >
                  {item}
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveRecent(item)}
                  className="grid h-7 w-7 shrink-0 place-items-center border-l border-slate-200 text-slate-400 transition hover:bg-white hover:text-slate-700"
                  aria-label={`Remove ${item} from recent searches`}
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DictionaryResultCard({
  result,
  query,
  onStudy,
  onConvert,
  onCopy,
  copiedKey,
  isFavorite,
  onToggleFavorite,
}: {
  result: DictionarySearchResult;
  query: string;
  onStudy: (uly: string) => void;
  onConvert: (uey: string) => void;
  onCopy: (text: string, label: string) => void;
  copiedKey: string;
  isFavorite: boolean;
  onToggleFavorite: (entry: DictionaryEntry) => void;
}) {
  const { entry } = result;
  const [showAllDefinitions, setShowAllDefinitions] = useState(false);
  const visibleDefinitions = getVisibleDefinitions(
    entry.definitions,
    result,
    showAllDefinitions,
  );
  const hiddenDefinitionCount =
    entry.definitions.length - visibleDefinitions.length;

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h2 dir="rtl" lang="ug" className="text-4xl leading-relaxed text-slate-950">
              <HighlightedText
                text={entry.uey}
                candidates={getHighlightCandidates(result, query, 'uey')}
              />
            </h2>
            <div>
              <div className="font-mono text-lg font-semibold text-indigo-700">
                <HighlightedText
                  text={entry.uly}
                  candidates={getHighlightCandidates(result, query, 'uly')}
                />
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
            onClick={() => onToggleFavorite(entry)}
            aria-label={
              isFavorite
                ? `Remove ${entry.uly} from dictionary favorites`
                : `Save ${entry.uly} to dictionary favorites`
            }
            className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition ${
              isFavorite
                ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Star
              className={`h-4 w-4 ${isFavorite ? 'fill-amber-400' : ''}`}
              aria-hidden="true"
            />
            {isFavorite ? 'Saved' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => onCopy(entry.uey, 'UEY')}
            className={getCopyButtonClass(copiedKey === 'UEY')}
          >
            {copiedKey === 'UEY' ? (
              <Check className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Copy className="h-4 w-4" aria-hidden="true" />
            )}
            Copy UEY
          </button>
          <button
            type="button"
            onClick={() => onCopy(entry.uly, 'ULY')}
            className={getCopyButtonClass(copiedKey === 'ULY')}
          >
            {copiedKey === 'ULY' ? (
              <Check className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Copy className="h-4 w-4" aria-hidden="true" />
            )}
            Copy ULY
          </button>
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
            <HighlightedText
              text={definition}
              candidates={getHighlightCandidates(result, query, 'definition')}
            />
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
                <HighlightedText
                  text={example.uey}
                  candidates={getExampleHighlightCandidates(result, query, 'uey')}
                />
              </div>
              <div className="mt-1 font-mono text-sm font-semibold text-indigo-700">
                <HighlightedText
                  text={example.uly}
                  candidates={getExampleHighlightCandidates(result, query, 'uly')}
                />
              </div>
              <div className="mt-1 text-sm text-slate-600">
                <HighlightedText
                  text={example.english}
                  candidates={getExampleHighlightCandidates(result, query, 'english')}
                />
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function getCopyButtonClass(isCopied: boolean) {
  return `inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition ${
    isCopied
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
  }`;
}

function loadRecentDictionaryQueries() {
  if (typeof window === 'undefined') return [];

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(RECENT_QUERY_STORAGE_KEY) ?? '[]',
    );
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, MAX_RECENT_QUERIES);
  } catch {
    return [];
  }
}

function loadDictionaryFavorites(): DictionaryFavoriteRecord[] {
  if (typeof window === 'undefined') return [];

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(FAVORITE_STORAGE_KEY) ?? '[]',
    );
    return normalizeDictionaryFavorites(parsed);
  } catch {
    return [];
  }
}

function saveDictionaryFavorite(entry: DictionaryEntry) {
  const favorite = dictionaryEntryToFavorite(entry);
  const next = normalizeDictionaryFavorites([
    favorite,
    ...loadDictionaryFavorites().filter((item) => item.id !== favorite.id),
  ]);
  window.localStorage.setItem(FAVORITE_STORAGE_KEY, JSON.stringify(next));
  return next;
}

function removeDictionaryFavorite(id: string) {
  const next = loadDictionaryFavorites().filter((item) => item.id !== id);
  if (next.length) {
    window.localStorage.setItem(FAVORITE_STORAGE_KEY, JSON.stringify(next));
  } else {
    window.localStorage.removeItem(FAVORITE_STORAGE_KEY);
  }
  return next;
}

function dictionaryEntryToFavorite(
  entry: DictionaryEntry,
): DictionaryFavoriteRecord {
  return {
    id: entry.id,
    uey: entry.uey.trim(),
    uly: entry.uly.trim(),
    definition: entry.definitions[0]?.trim() ?? '',
    partOfSpeech: entry.partOfSpeech.trim(),
    updatedAt: Date.now(),
  };
}

function normalizeDictionaryFavorites(
  value: unknown,
): DictionaryFavoriteRecord[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const favorites: DictionaryFavoriteRecord[] = [];

  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Partial<DictionaryFavoriteRecord>;
    const id = typeof record.id === 'string' ? record.id.trim() : '';
    const uey = typeof record.uey === 'string' ? record.uey.trim() : '';
    const uly = typeof record.uly === 'string' ? record.uly.trim() : '';
    if (!id || !uey || !uly || seen.has(id)) continue;

    seen.add(id);
    favorites.push({
      id,
      uey,
      uly,
      definition:
        typeof record.definition === 'string' ? record.definition.trim() : '',
      partOfSpeech:
        typeof record.partOfSpeech === 'string'
          ? record.partOfSpeech.trim()
          : '',
      updatedAt:
        typeof record.updatedAt === 'number' && Number.isFinite(record.updatedAt)
          ? record.updatedAt
          : 0,
    });
  }

  return favorites
    .sort(
      (a, b) => b.updatedAt - a.updatedAt || a.uly.localeCompare(b.uly),
    )
    .slice(0, MAX_FAVORITE_ENTRIES);
}

function saveRecentDictionaryQuery(query: string) {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return loadRecentDictionaryQueries();

  const key = normalizedQuery.toLocaleLowerCase();
  const next = [
    normalizedQuery,
    ...loadRecentDictionaryQueries().filter(
      (item) => item.toLocaleLowerCase() !== key,
    ),
  ].slice(0, MAX_RECENT_QUERIES);

  window.localStorage.setItem(RECENT_QUERY_STORAGE_KEY, JSON.stringify(next));
  return next;
}

function removeRecentDictionaryQuery(query: string) {
  const key = query.trim().toLocaleLowerCase();
  if (!key) return loadRecentDictionaryQueries();

  const next = loadRecentDictionaryQueries().filter(
    (item) => item.toLocaleLowerCase() !== key,
  );
  window.localStorage.setItem(RECENT_QUERY_STORAGE_KEY, JSON.stringify(next));
  return next;
}

function clearRecentDictionaryQueries() {
  window.localStorage.removeItem(RECENT_QUERY_STORAGE_KEY);
  return [];
}

function getVisibleDefinitions(
  definitions: string[],
  result: DictionarySearchResult,
  showAllDefinitions: boolean,
) {
  if (showAllDefinitions || result.matchedOn !== 'definition') {
    return showAllDefinitions
      ? definitions
      : definitions.slice(0, VISIBLE_DEFINITION_COUNT);
  }

  const visible = definitions.slice(0, VISIBLE_DEFINITION_COUNT);
  if (visible.includes(result.matchedText)) return visible;

  const matchedDefinition = definitions.find(
    (definition) => definition === result.matchedText,
  );
  return matchedDefinition ? [...visible, matchedDefinition] : visible;
}

function HighlightedText({
  text,
  candidates,
}: {
  text: string;
  candidates: string[];
}) {
  const range = findHighlightRange(text, candidates);
  if (!range) return <>{text}</>;

  const [start, end] = range;
  return (
    <>
      {text.slice(0, start)}
      <mark className="rounded-sm bg-amber-100 px-0.5 text-amber-950">
        {text.slice(start, end)}
      </mark>
      {text.slice(end)}
    </>
  );
}

function getHighlightCandidates(
  result: DictionarySearchResult,
  query: string,
  field: 'uey' | 'uly' | 'definition' | 'example',
) {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  if (field === 'uey' && result.matchedOn === 'uey') {
    return uniqueCandidates([trimmedQuery, ulyToUey(trimmedQuery)]);
  }

  if (field === 'uly' && result.matchedOn === 'uly') {
    return uniqueCandidates([trimmedQuery, ueyToUly(trimmedQuery)]);
  }

  if (field === 'definition' && result.matchedOn === 'definition') {
    return uniqueCandidates([trimmedQuery]);
  }

  if (field === 'example' && result.matchedOn === 'example') {
    return uniqueCandidates([trimmedQuery]);
  }

  return [];
}

function getExampleHighlightCandidates(
  result: DictionarySearchResult,
  query: string,
  field: 'uey' | 'uly' | 'english',
) {
  const trimmedQuery = query.trim();
  if (!trimmedQuery || result.matchedOn !== 'example') return [];

  if (field === 'uey') {
    return uniqueCandidates([trimmedQuery, ulyToUey(trimmedQuery)]);
  }

  if (field === 'uly') {
    return uniqueCandidates([trimmedQuery, ueyToUly(trimmedQuery)]);
  }

  return uniqueCandidates([trimmedQuery]);
}

function uniqueCandidates(candidates: string[]) {
  return [...new Set(candidates.map((candidate) => candidate.trim()))]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
}

function findHighlightRange(text: string, candidates: string[]) {
  const normalizedText = text.toLocaleLowerCase();

  for (const candidate of candidates) {
    const normalizedCandidate = candidate.toLocaleLowerCase();
    const start = normalizedText.indexOf(normalizedCandidate);
    if (start >= 0) return [start, start + candidate.length] as const;
  }

  return null;
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
    <section className="grid gap-4 rounded-lg border border-dashed border-slate-300 bg-white/70 p-6 text-sm leading-6 text-slate-500">
      <div className="flex gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-indigo-50 text-indigo-700">
          <Search className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <p className="font-semibold text-slate-700">
            Search UEY, ULY, or English to start.
          </p>
          <p className="mt-1">
            Search works offline against {entryCount.toLocaleString()} Uyghur
            headwords and {definitionCount.toLocaleString()} English
            definitions. The large dataset is loaded in small shards as you
            type.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {SUGGESTED_QUERIES.slice(0, 4).map((item) => (
          <span
            key={item}
            className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500 ring-1 ring-slate-200"
          >
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}

function EmptyDictionaryState({
  query,
  suggestions,
  onChoose,
  searchMode,
}: {
  query: string;
  suggestions: DictionarySuggestion[];
  onChoose: (value: string) => void;
  searchMode: DictionarySearchMode;
}) {
  const nearbySuggestions = suggestions.slice(0, 3);
  const fallbackQueries = getNoResultFallbackQueries(query);

  return (
    <section className="rounded-lg border border-dashed border-slate-300 bg-white/70 p-6 text-sm leading-6 text-slate-500">
      <div className="flex gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-rose-50 text-rose-700">
          <SearchX className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <p className="font-semibold text-slate-700">
            No local dictionary match for{' '}
            <span className="break-all text-slate-950">{query}</span>.
          </p>
          <p className="mt-1">
            Current mode is {getSearchModeLabel(searchMode)}. Try Auto mode for
            cross-script fallback, remove punctuation, or search a shorter root
            word.
          </p>
        </div>
      </div>
      {nearbySuggestions.length ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-400">
            Did you mean
          </span>
          {nearbySuggestions.map((suggestion) => (
            <button
              key={`${suggestion.matchedOn}-${suggestion.value}`}
              type="button"
              onClick={() => onChoose(suggestion.value)}
              className="max-w-44 truncate rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50"
              title={`${suggestion.value} · ${suggestion.entry.uly}`}
            >
              {suggestion.value}
            </button>
          ))}
        </div>
      ) : null}
      {!nearbySuggestions.length && fallbackQueries.length ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-400">
            Try
          </span>
          {fallbackQueries.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => onChoose(value)}
              className="max-w-44 truncate rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
              title={value}
            >
              {value}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function getNoResultFallbackQueries(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return [];

  return uniqueCandidates([
    trimmed.replace(/[،,؛;؟?!.]+$/u, ''),
    ...trimmed.split(/\s+/u).filter((part) => part.length >= 2),
  ])
    .filter(
      (value) =>
        value.toLocaleLowerCase() !== trimmed.toLocaleLowerCase(),
    )
    .slice(0, 3);
}
