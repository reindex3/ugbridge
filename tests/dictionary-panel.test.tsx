import { act, fireEvent, render, screen, within } from '@testing-library/react';
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
    window.localStorage.clear();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
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

  it('copies result headwords from the result card', async () => {
    const result: DictionarySearchResult = {
      entry: yaxshiEntry,
      score: 0,
      matchedOn: 'definition',
      matchedText: 'good',
    };
    setLookupState({ results: [result] });
    renderPanel({ query: 'good' });
    const card = screen.getByRole('article');

    await act(async () => {
      fireEvent.click(within(card).getByRole('button', { name: 'Copy ULY' }));
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('yaxshi');
    expect(screen.getByText('ULY copied')).toBeInTheDocument();
  });

  it('shows saved recent searches and reuses them', () => {
    window.localStorage.setItem(
      'ugbridge.dictionary.recent.v1',
      JSON.stringify(['kitab', 'alma']),
    );
    const { onQueryChange } = renderPanel();

    expect(screen.getByText('Recent')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'kitab' }));

    expect(onQueryChange).toHaveBeenCalledWith('kitab');
  });

  it('highlights matched fragments in visible result text', () => {
    const result: DictionarySearchResult = {
      entry: {
        ...yaxshiEntry,
        definitions: [
          'fine',
          'well',
          'nice',
          'ok',
          'solid',
          'very good',
          'excellent',
        ],
      },
      score: 0,
      matchedOn: 'definition',
      matchedText: 'very good',
    };
    setLookupState({ results: [result] });

    renderPanel({ query: 'good' });

    const highlight = screen.getByText('good');
    expect(highlight.tagName).toBe('MARK');
    expect(screen.getByText(/Show 1 more definition/)).toBeInTheDocument();
  });

  it('highlights converted ULY headword matches from UEY queries', () => {
    const result: DictionarySearchResult = {
      entry: yaxshiEntry,
      score: 0,
      matchedOn: 'uly',
      matchedText: 'yaxshi',
    };
    setLookupState({ results: [result] });

    renderPanel({ query: 'ياخشى' });

    const highlight = screen.getByText('yaxshi');
    expect(highlight.tagName).toBe('MARK');
  });

  it('highlights converted UEY headword matches from ULY queries', () => {
    const result: DictionarySearchResult = {
      entry: yaxshiEntry,
      score: 0,
      matchedOn: 'uey',
      matchedText: 'ياخشى',
    };
    setLookupState({ results: [result] });

    renderPanel({ query: 'yaxshi' });

    const highlight = screen.getAllByText('ياخشى').find(
      (element) => element.tagName === 'MARK',
    );
    expect(highlight?.tagName).toBe('MARK');
  });

  it('highlights example text matches', () => {
    const result: DictionarySearchResult = {
      entry: {
        ...salamEntry,
        examples: [
          {
            uey: 'مەن سالام دەيمەن',
            uly: 'men salam deymen',
            english: 'I say hello',
          },
        ],
      },
      score: 0,
      matchedOn: 'example',
      matchedText: 'I say hello',
    };
    setLookupState({ results: [result] });

    renderPanel({ query: 'hello' });

    const highlight = screen.getAllByText('hello').find(
      (element) => element.tagName === 'MARK',
    );
    expect(highlight).toBeDefined();
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
