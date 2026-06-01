import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DictionaryPanel } from '../src/components/DictionaryPanel';
import type {
  DictionaryEntry,
  DictionarySearchResult,
  DictionarySuggestion,
} from '../src/lib/dictionary';

const { useDictionaryLookupMock } = vi.hoisted(() => ({
  useDictionaryLookupMock: vi.fn(),
}));

vi.mock('../src/hooks/useDictionaryLookup', () => ({
  useDictionaryLookup: useDictionaryLookupMock,
}));

const yaxshiEntry: DictionaryEntry = {
  id: 'yaxshi',
  uey: 'ياخشى',
  uly: 'yaxshi',
  ipa: 'jɑχʃi',
  partOfSpeech: 'adjective',
  definitions: ['good', 'well', 'fine'],
};

const salamEntry: DictionaryEntry = {
  id: 'salam',
  uey: 'سالام',
  uly: 'salam',
  ipa: 'sɑlɑm',
  partOfSpeech: 'interjection',
  definitions: ['hello', 'greeting'],
};

describe('DictionaryPanel', () => {
  beforeEach(() => {
    useDictionaryLookupMock.mockReset();
    setLookupState();
  });

  it('shows dictionary totals when no query has been entered', () => {
    renderPanel();

    expect(
      screen.getByText(/350,000 entries · 500,000 definitions · Auto/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Search works offline against 350,000 Uyghur/),
    ).toBeInTheDocument();
  });

  it('passes the selected search mode to lookup', () => {
    renderPanel({ query: 'good' });

    fireEvent.click(screen.getByRole('button', { name: 'English' }));

    expect(useDictionaryLookupMock).toHaveBeenLastCalledWith(
      'good',
      'english',
    );
    expect(
      screen.getByPlaceholderText('Search English definitions...'),
    ).toBeInTheDocument();
  });

  it('chooses suggestions with the keyboard', () => {
    const suggestions: DictionarySuggestion[] = [
      { entry: yaxshiEntry, value: 'yaxshi', matchedOn: 'uly', score: 0 },
      { entry: salamEntry, value: 'salam', matchedOn: 'uly', score: 1 },
    ];
    setLookupState({ suggestions });
    const { onQueryChange } = renderPanel({ query: 'ya' });
    const input = screen.getByRole('combobox', {
      name: 'Dictionary search',
    });

    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onQueryChange).toHaveBeenCalledWith('salam');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('routes result actions to study and conversion handlers', () => {
    const result: DictionarySearchResult = {
      entry: yaxshiEntry,
      score: 0,
      matchedOn: 'definition',
      matchedText: 'good',
    };
    setLookupState({ results: [result] });
    const { onStudy, onConvert } = renderPanel({ query: 'good' });
    const card = screen.getByRole('article');

    fireEvent.click(within(card).getByRole('button', { name: 'Study' }));
    fireEvent.click(within(card).getByRole('button', { name: 'Convert' }));

    expect(onStudy).toHaveBeenCalledWith('yaxshi');
    expect(onConvert).toHaveBeenCalledWith('ياخشى');
  });
});

function renderPanel({ query = '' }: { query?: string } = {}) {
  const onQueryChange = vi.fn();
  const onStudy = vi.fn();
  const onConvert = vi.fn();

  render(
    <DictionaryPanel
      query={query}
      onQueryChange={onQueryChange}
      onStudy={onStudy}
      onConvert={onConvert}
    />,
  );

  return { onQueryChange, onStudy, onConvert };
}

function setLookupState(
  overrides: Partial<ReturnType<typeof defaultLookupState>> = {},
) {
  useDictionaryLookupMock.mockReturnValue({
    ...defaultLookupState(),
    ...overrides,
  });
}

function defaultLookupState() {
  return {
    results: [] as DictionarySearchResult[],
    suggestions: [] as DictionarySuggestion[],
    isLoading: false,
    entryCount: 350000,
    definitionCount: 500000,
    loadedShardCount: 0,
    error: null,
  };
}
