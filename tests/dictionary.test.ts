import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  searchDictionary,
  suggestDictionary,
} from '../src/lib/dictionary';

describe('searchDictionary', () => {
  it('returns no results for empty queries', () => {
    expect(searchDictionary('')).toEqual([]);
    expect(searchDictionary('   ')).toEqual([]);
  });

  it('finds entries by ULY headword', () => {
    const [result] = searchDictionary('salam');
    expect(result.entry.uey).toBe('سالام');
    expect(result.matchedOn).toBe('uly');
    expect(result.matchedText).toBe('salam');
  });

  it('finds entries by UEY headword', () => {
    const [result] = searchDictionary('ياخشى');
    expect(result.entry.uly).toBe('yaxshi');
    expect(result.matchedOn).toBe('uly');
  });

  it('finds entries by English definition', () => {
    const [result] = searchDictionary('book');
    expect(result.entry.uly).toBe('kitab');
    expect(result.matchedOn).toBe('definition');
    expect(result.matchedText).toBe('book');
  });

  it('finds entries by example text', () => {
    const [result] = searchDictionary('love');
    expect(result.entry.uly).toBe('körimen');
    expect(result.matchedOn).toBe('example');
  });

  it('can limit search to English definitions', () => {
    expect(searchDictionary('book', undefined, 'english')).toHaveLength(1);
    expect(searchDictionary('kitab', undefined, 'english')).toEqual([]);
  });

  it('can limit search to UEY headwords', () => {
    const [result] = searchDictionary('ياخشى', undefined, 'uey');
    expect(result.entry.uly).toBe('yaxshi');
    expect(result.matchedOn).toBe('uey');
    expect(searchDictionary('yaxshi', undefined, 'uey')).toEqual([]);
  });

  it('can limit search to ULY headwords', () => {
    const [result] = searchDictionary('yaxshi', undefined, 'uly');
    expect(result.entry.uey).toBe('ياخشى');
    expect(result.matchedOn).toBe('uly');
    expect(searchDictionary('good', undefined, 'uly')).toEqual([]);
  });

  it('ranks exact and compact matches before broad noisy matches', () => {
    const results = searchDictionary('book', [
      {
        id: 'broad',
        uey: 'ئالدىن بېكىتىش',
        uly: 'aldin békitish',
        ipa: '',
        partOfSpeech: 'translation',
        definitions: ['schedule budgeting book', 'reservation', 'book up'],
      },
      {
        id: 'exact',
        uey: 'كىتاب',
        uly: 'kitab',
        ipa: '',
        partOfSpeech: 'noun',
        definitions: ['book'],
      },
    ]);

    expect(results[0].entry.id).toBe('exact');
    expect(results[0].matchedText).toBe('book');
  });
});

describe('suggestDictionary', () => {
  it('returns no suggestions for empty queries', () => {
    expect(suggestDictionary('')).toEqual([]);
    expect(suggestDictionary('   ')).toEqual([]);
  });

  it('suggests ULY headwords by prefix', () => {
    const [suggestion] = suggestDictionary('ya');
    expect(suggestion.value).toBe('yaxshi');
    expect(suggestion.matchedOn).toBe('uly');
  });

  it('suggests UEY headwords by prefix', () => {
    const [suggestion] = suggestDictionary('يا');
    expect(suggestion.entry.uly).toBe('yaxshi');
    expect(suggestion.matchedOn).toBe('uly');
  });

  it('suggests English definitions', () => {
    const [suggestion] = suggestDictionary('goo');
    expect(suggestion.value).toBe('good');
    expect(suggestion.entry.uly).toBe('yaxshi');
    expect(suggestion.matchedOn).toBe('definition');
  });

  it('dedupes repeated suggestion values across entries', () => {
    const suggestions = suggestDictionary('apple', [
      {
        id: 'plain',
        uey: 'ئالما',
        uly: 'alma',
        ipa: '',
        partOfSpeech: 'noun',
        definitions: ['apple'],
      },
      {
        id: 'tree',
        uey: 'ئالما دەرىخى',
        uly: 'alma derixi',
        ipa: '',
        partOfSpeech: 'noun',
        definitions: ['apple', 'apple tree'],
      },
    ]);

    expect(
      suggestions.filter(
        (suggestion) =>
          suggestion.matchedOn === 'definition' &&
          suggestion.value === 'apple',
      ),
    ).toHaveLength(1);
  });

  it('can limit suggestions to English definitions', () => {
    const [suggestion] = suggestDictionary('goo', undefined, 'english');
    expect(suggestion.value).toBe('good');
    expect(suggestDictionary('ya', undefined, 'english')).toEqual([]);
  });

  it('can limit suggestions to UEY headwords', () => {
    const [suggestion] = suggestDictionary('يا', undefined, 'uey');
    expect(suggestion.value).toBe('ياخشى');
    expect(suggestion.matchedOn).toBe('uey');
    expect(suggestDictionary('ya', undefined, 'uey')).toEqual([]);
  });

  it('can limit suggestions to ULY headwords', () => {
    const [suggestion] = suggestDictionary('ya', undefined, 'uly');
    expect(suggestion.value).toBe('yaxshi');
    expect(suggestion.matchedOn).toBe('uly');
    expect(suggestDictionary('يا', undefined, 'uly')[0].value).toBe('yaxshi');
  });
});

describe('loadStaticDictionaryEntries', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads only UEY shards for Arabic auto queries', async () => {
    const { loadStaticDictionaryEntries } = await importStaticDictionary();
    const fetchMock = vi.fn(async (url: string) => {
      if (url === '/dictionary/manifest.json') {
        return jsonResponse(testManifest());
      }

      return jsonResponse([['ياخشى', 'yaxshi', ['good']]]);
    });

    vi.stubGlobal('fetch', fetchMock);

    const result = await loadStaticDictionaryEntries('ياخشى', 'auto');

    expect(result.entries[0].uly).toBe('yaxshi');
    expect(result.loadedShardCount).toBe(1);
    expect(fetchMock).toHaveBeenCalledWith('/dictionary/manifest.json');
    expect(fetchMock).toHaveBeenCalledWith('/dictionary/shards/uey-64a.json');
    expect(fetchMock).not.toHaveBeenCalledWith('/dictionary/shards/english-other.json');
    expect(fetchMock).not.toHaveBeenCalledWith('/dictionary/shards/uly-y.json');
  });

  it('loads English and ULY shards for Latin auto queries and dedupes overlap', async () => {
    const { loadStaticDictionaryEntries } = await importStaticDictionary();
    const fetchMock = vi.fn(async (url: string) => {
      if (url === '/dictionary/manifest.json') {
        return jsonResponse(testManifest());
      }

      if (url === '/dictionary/shards/english-e.json') {
        return jsonResponse([['ئېلىك', 'élik', ['quantity']]]);
      }

      return jsonResponse([
        ['ئېلىك', 'élik', ['quantity']],
        ['ئەللىك', 'ellik', ['fifty']],
      ]);
    });

    vi.stubGlobal('fetch', fetchMock);

    const result = await loadStaticDictionaryEntries('élik', 'auto');

    expect(result.entries.map((entry) => entry.uly)).toEqual(['élik', 'ellik']);
    expect(result.loadedShardCount).toBe(2);
    expect(fetchMock).toHaveBeenCalledWith('/dictionary/shards/english-e.json');
    expect(fetchMock).toHaveBeenCalledWith('/dictionary/shards/uly-e.json');
    expect(fetchMock).not.toHaveBeenCalledWith('/dictionary/shards/uey-64a.json');
  });

  it('builds stable unique ids from the full static entry payload', async () => {
    const { loadStaticDictionaryEntries } = await importStaticDictionary();
    const fetchMock = vi.fn(async (url: string) => {
      if (url === '/dictionary/manifest.json') {
        return jsonResponse(testManifest());
      }

      return jsonResponse([
        ['موللاق', 'mollaq', ['a somersault', 'head-over-heels']],
        ['مونچاق', 'monchaq', ['necklace', 'torque', 'a pearl']],
      ]);
    });

    vi.stubGlobal('fetch', fetchMock);

    const result = await loadStaticDictionaryEntries('e', 'english');

    expect(result.entries.map((entry) => entry.id)).toHaveLength(2);
    expect(new Set(result.entries.map((entry) => entry.id))).toHaveLength(2);
  });

  it('keeps empty queries to manifest loading only', async () => {
    const { loadStaticDictionaryEntries } = await importStaticDictionary();
    const fetchMock = vi.fn(async (url: string) => {
      if (url === '/dictionary/manifest.json') {
        return jsonResponse(testManifest());
      }

      throw new Error(`Unexpected shard fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    const result = await loadStaticDictionaryEntries('   ', 'auto');

    expect(result.entries).toEqual([]);
    expect(result.manifest?.entryCount).toBe(3);
    expect(result.loadedShardCount).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns an empty result when the manifest cannot be loaded', async () => {
    const { loadStaticDictionaryEntries } = await importStaticDictionary();
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 500,
    }) as Response);

    vi.stubGlobal('fetch', fetchMock);

    await expect(loadStaticDictionaryEntries('salam', 'auto')).resolves.toEqual({
      entries: [],
      manifest: null,
      loadedShardCount: 0,
    });
    expect(fetchMock).toHaveBeenCalledWith('/dictionary/manifest.json');
  });

  it('retries manifest loading after a transient failure', async () => {
    const { loadStaticDictionaryEntries } = await importStaticDictionary();
    const fetchMock = vi.fn(async (url: string) => {
      if (
        url === '/dictionary/manifest.json' &&
        fetchMock.mock.calls.length === 1
      ) {
        return {
          ok: false,
          status: 500,
        } as Response;
      }

      if (url === '/dictionary/manifest.json') {
        return jsonResponse(testManifest());
      }

      return jsonResponse([['ياخشى', 'yaxshi', ['good']]]);
    });

    vi.stubGlobal('fetch', fetchMock);

    await expect(loadStaticDictionaryEntries('ياخشى', 'auto')).resolves.toEqual({
      entries: [],
      manifest: null,
      loadedShardCount: 0,
    });

    const result = await loadStaticDictionaryEntries('ياخشى', 'auto');

    expect(result.entries[0].uly).toBe('yaxshi');
    expect(fetchMock).toHaveBeenCalledWith('/dictionary/manifest.json');
    expect(fetchMock).toHaveBeenCalledWith('/dictionary/shards/uey-64a.json');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('retries shard loading after a transient failure', async () => {
    const { loadStaticDictionaryEntries } = await importStaticDictionary();
    const fetchMock = vi.fn(async (url: string) => {
      if (url === '/dictionary/manifest.json') {
        return jsonResponse(testManifest());
      }

      if (
        url === '/dictionary/shards/uey-64a.json' &&
        fetchMock.mock.calls.filter(
          ([calledUrl]) => calledUrl === '/dictionary/shards/uey-64a.json',
        ).length === 1
      ) {
        return {
          ok: false,
          status: 503,
        } as Response;
      }

      return jsonResponse([['ياخشى', 'yaxshi', ['good']]]);
    });

    vi.stubGlobal('fetch', fetchMock);

    await expect(loadStaticDictionaryEntries('ياخشى', 'auto')).rejects.toThrow(
      'Dictionary shard 503',
    );

    const result = await loadStaticDictionaryEntries('ياخشى', 'auto');

    expect(result.entries[0].uly).toBe('yaxshi');
    expect(
      fetchMock.mock.calls.filter(
        ([url]) => url === '/dictionary/shards/uey-64a.json',
      ),
    ).toHaveLength(2);
  });

  it('caches manifest and shard fetches within the same loader instance', async () => {
    const { loadStaticDictionaryEntries } = await importStaticDictionary();
    const fetchMock = vi.fn(async (url: string) => {
      if (url === '/dictionary/manifest.json') {
        return jsonResponse(testManifest());
      }

      return jsonResponse([['ياخشى', 'yaxshi', ['good']]]);
    });

    vi.stubGlobal('fetch', fetchMock);

    await loadStaticDictionaryEntries('ياخشى', 'auto');
    await loadStaticDictionaryEntries('ياخشى', 'auto');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledWith('/dictionary/manifest.json');
    expect(fetchMock).toHaveBeenCalledWith('/dictionary/shards/uey-64a.json');
  });
});

async function importStaticDictionary() {
  vi.resetModules();
  return import('../src/lib/dictionary/static-dataset');
}

function testManifest() {
  return {
    entryCount: 3,
    definitionCount: 3,
    source: {
      repo: 'test/repo',
      license: 'apache-2.0',
      url: 'https://example.com',
    },
    shards: {
      english: {
        e: { file: 'shards/english-e.json', count: 1 },
        other: { file: 'shards/english-other.json', count: 1 },
      },
      uly: {
        e: { file: 'shards/uly-e.json', count: 2 },
        y: { file: 'shards/uly-y.json', count: 1 },
      },
      uey: { '64a': { file: 'shards/uey-64a.json', count: 1 } },
    },
  };
}

function jsonResponse(value: unknown) {
  return {
    ok: true,
    json: async () => value,
  } as Response;
}
