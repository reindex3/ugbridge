import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDictionaryLookup } from '../../src/hooks/useDictionaryLookup';
import type {
  DictionaryEntry,
  DictionarySearchMode,
} from '../../src/lib/dictionary';

const {
  loadStaticDictionaryEntriesMock,
  loadStaticDictionaryManifestMock,
} = vi.hoisted(() => ({
  loadStaticDictionaryEntriesMock: vi.fn(),
  loadStaticDictionaryManifestMock: vi.fn(),
}));

vi.mock('../../src/lib/dictionary/static-dataset', () => ({
  loadStaticDictionaryEntries: loadStaticDictionaryEntriesMock,
  loadStaticDictionaryManifest: loadStaticDictionaryManifestMock,
}));

const staticEntry: DictionaryEntry = {
  id: 'static-stale',
  uey: 'سىناق',
  uly: 'sinaq',
  ipa: '',
  partOfSpeech: 'translation',
  definitions: ['zz'],
};

describe('useDictionaryLookup', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    loadStaticDictionaryEntriesMock.mockReset();
    loadStaticDictionaryManifestMock.mockReset();
    loadStaticDictionaryManifestMock.mockResolvedValue({
      entryCount: 10,
      definitionCount: 20,
    });
    loadStaticDictionaryEntriesMock.mockResolvedValue({
      entries: [staticEntry],
      manifest: null,
      loadedShardCount: 1,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not load static shards for short queries', async () => {
    render(<LookupProbe query="sa" mode="auto" />);

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(loadStaticDictionaryEntriesMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('loading')).toHaveTextContent('idle');
  });

  it('debounces static shard loading while the user is typing', async () => {
    render(<LookupProbe query="sal" mode="auto" />);

    await act(async () => {
      vi.advanceTimersByTime(179);
    });

    expect(loadStaticDictionaryEntriesMock).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1);
      await flushPromises();
    });

    expect(loadStaticDictionaryEntriesMock).toHaveBeenCalledWith('sal', 'auto');
  });

  it('does not search stale static entries for a newer query', async () => {
    const { rerender } = render(<LookupProbe query="sal" mode="auto" />);

    await act(async () => {
      vi.advanceTimersByTime(180);
      await flushPromises();
    });

    expect(loadStaticDictionaryEntriesMock).toHaveBeenCalled();

    rerender(<LookupProbe query="zz" mode="auto" />);

    expect(screen.getByTestId('result-ids')).not.toHaveTextContent(
      'static-stale',
    );
  });
});

function LookupProbe({
  query,
  mode,
}: {
  query: string;
  mode: DictionarySearchMode;
}) {
  const state = useDictionaryLookup(query, mode);

  return (
    <>
      <div data-testid="loading">{state.isLoading ? 'loading' : 'idle'}</div>
      <div data-testid="result-ids">
        {state.results.map((result) => result.entry.id).join(',')}
      </div>
    </>
  );
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}
