import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  searchDictionary,
  suggestDictionary,
} from '../../src/lib/dictionary';

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

  it.each([
    ['water', 'su', 'سۇ'],
    ['bread', 'nan', 'نان'],
    ['pen', 'qelem', 'قەلەم'],
    ['money', 'pul', 'پۇل'],
    ['house', 'öy', 'ئۆي'],
    ['home', 'öy', 'ئۆي'],
  ])('finds seeded common word %s by English definition', (query, uly, uey) => {
    const [result] = searchDictionary(query);
    expect(result.entry.uly).toBe(uly);
    expect(result.entry.uey).toBe(uey);
    expect(result.matchedText).toBe(query);
  });

  it('finds entries by example text', () => {
    const [result] = searchDictionary('love');
    expect(result.entry.uly).toBe('körimen');
    expect(result.matchedOn).toBe('example');
  });

  it('normalizes case and repeated whitespace in queries', () => {
    const [result] = searchDictionary('  THANK   YOU  ');
    expect(result.entry.uly).toBe('rehmet');
    expect(result.matchedOn).toBe('definition');
    expect(result.matchedText).toBe('thank you');
  });

  it('can limit search to English definitions', () => {
    expect(searchDictionary('book', undefined, 'english')).toHaveLength(1);
    expect(searchDictionary('kitab', undefined, 'english')).toEqual([]);
  });

  it('can limit search to UEY headwords', () => {
    const [result] = searchDictionary('ياخشى', undefined, 'uey');
    expect(result.entry.uly).toBe('yaxshi');
    expect(result.matchedOn).toBe('uey');
    expect(searchDictionary('good', undefined, 'uey')).toEqual([]);
  });

  it('can limit search to ULY headwords', () => {
    const [result] = searchDictionary('yaxshi', undefined, 'uly');
    expect(result.entry.uey).toBe('ياخشى');
    expect(result.matchedOn).toBe('uly');
    expect(searchDictionary('good', undefined, 'uly')).toEqual([]);
  });

  it('tries converted UEY text when searching UEY mode with ULY input', () => {
    const [result] = searchDictionary('yaxshi', undefined, 'uey');
    expect(result.entry.uey).toBe('ياخشى');
    expect(result.matchedOn).toBe('uey');
  });

  it('tries converted ULY text when searching ULY mode with UEY input', () => {
    const [result] = searchDictionary('ياخشى', undefined, 'uly');
    expect(result.entry.uly).toBe('yaxshi');
    expect(result.matchedOn).toBe('uly');
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

  it('ranks prefix definition matches before included definition matches', () => {
    const results = searchDictionary('app', [
      {
        id: 'included',
        uey: 'ئۇششاق نۇقۇت',
        uly: 'ushshaq nuqut',
        ipa: '',
        partOfSpeech: 'noun',
        definitions: ['snap pea'],
      },
      {
        id: 'prefix',
        uey: 'ئالما',
        uly: 'alma',
        ipa: '',
        partOfSpeech: 'noun',
        definitions: ['apple'],
      },
    ]);

    expect(results[0].entry.id).toBe('prefix');
    expect(results[0].matchedText).toBe('apple');
  });

  it('ranks curated exact English matches before noisy static matches', () => {
    const results = searchDictionary('thanks', [
      {
        id: 'static-noisy',
        uey: 'ھەشقاللا، رەھمەت، تەشەككۈر',
        uly: 'heshqalla, rehmet, teshekkür',
        ipa: '',
        partOfSpeech: 'translation',
        definitions: ['thanks'],
      },
      {
        id: 'rahmet',
        uey: 'رەھمەت',
        uly: 'rehmet',
        ipa: 'ræhmæt',
        partOfSpeech: 'interjection',
        definitions: ['thank you', 'thanks'],
      },
    ]);

    expect(results[0].entry.id).toBe('rahmet');
    expect(results[0].matchedText).toBe('thanks');
  });

  it('ranks compact English matches before long phrase headwords', () => {
    const results = searchDictionary('book', [
      {
        id: 'static-phrase',
        uey: 'ئەرز قىلىش كىتاب كىتابلار',
        uly: 'erz qilish kitab kitablar',
        ipa: '',
        partOfSpeech: 'translation',
        definitions: ['book'],
      },
      {
        id: 'static-compact',
        uey: 'كىتاب',
        uly: 'kitab',
        ipa: '',
        partOfSpeech: 'translation',
        definitions: ['book'],
      },
    ]);

    expect(results[0].entry.id).toBe('static-compact');
  });

  it('prefers curated English matches over ambiguous ULY headwords in auto mode', () => {
    const results = searchDictionary('pen', [
      {
        id: 'static-uly-pen',
        uey: 'پەن',
        uly: 'pen',
        ipa: '',
        partOfSpeech: 'translation',
        definitions: ['science'],
      },
      {
        id: 'qelem',
        uey: 'قەلەم',
        uly: 'qelem',
        ipa: 'qælæm',
        partOfSpeech: 'noun',
        definitions: ['pen'],
      },
    ]);

    expect(results[0].entry.id).toBe('qelem');
    expect(results[0].matchedOn).toBe('definition');
  });

  it('keeps ULY-hinted auto queries on exact ULY headwords', () => {
    const results = searchDictionary('ghulja', [
      {
        id: 'headword',
        uey: 'غۇلجا',
        uly: 'ghulja',
        ipa: '',
        partOfSpeech: 'proper noun',
        definitions: ['Ghulja'],
      },
      {
        id: 'english',
        uey: 'سىناق',
        uly: 'sinaq',
        ipa: '',
        partOfSpeech: 'noun',
        definitions: ['ghulja'],
      },
    ]);

    expect(results[0].entry.id).toBe('headword');
    expect(results[0].matchedOn).toBe('uly');
  });

  it('keeps ambiguous Latin input as a ULY headword in ULY mode', () => {
    const [result] = searchDictionary(
      'pen',
      [
        {
          id: 'static-uly-pen',
          uey: 'پەن',
          uly: 'pen',
          ipa: '',
          partOfSpeech: 'translation',
          definitions: ['science'],
        },
        {
          id: 'qelem',
          uey: 'قەلەم',
          uly: 'qelem',
          ipa: 'qælæm',
          partOfSpeech: 'noun',
          definitions: ['pen'],
        },
      ],
      'uly',
    );

    expect(result.entry.id).toBe('static-uly-pen');
    expect(result.matchedOn).toBe('uly');
  });

  it('shows only exact headwords when long phrase matches share the same prefix', () => {
    const results = searchDictionary('rehemet', [
      {
        id: 'phrase',
        uey: 'رەھمەت ئېيتىپ قوبۇل قىلماسلىق',
        uly: 'rehmet éytip qobul qilmasliq',
        ipa: '',
        partOfSpeech: 'phrase',
        definitions: ['decline with thanks'],
      },
      {
        id: 'exact',
        uey: 'رەھمەت',
        uly: 'rehmet',
        ipa: '',
        partOfSpeech: 'interjection',
        definitions: ['thank you', 'thanks'],
      },
    ]);

    expect(results.map((result) => result.entry.id)).toEqual(['exact']);
    expect(results[0].matchedOn).toBe('uly');
  });

  it('falls back to phrase matches when no exact headword exists', () => {
    const results = searchDictionary('rehemet', [
      {
        id: 'phrase',
        uey: 'رەھمەت ئېيتىپ قوبۇل قىلماسلىق',
        uly: 'rehmet éytip qobul qilmasliq',
        ipa: '',
        partOfSpeech: 'phrase',
        definitions: ['decline with thanks'],
      },
    ]);

    expect(results.map((result) => result.entry.id)).toEqual(['phrase']);
  });

  it('limits search results after ranking', () => {
    const results = searchDictionary(
      'test',
      Array.from({ length: 20 }, (_, index) => ({
        id: `entry-${index}`,
        uey: `سىناق-${index}`,
        uly: `sinaq-${index}`,
        ipa: '',
        partOfSpeech: 'noun',
        definitions: ['test'],
      })),
    );

    expect(results).toHaveLength(12);
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

  it('suggests near ULY spelling matches', () => {
    const [suggestion] = suggestDictionary('yaxhsi');
    expect(suggestion.value).toBe('yaxshi');
    expect(suggestion.matchedOn).toBe('uly');
  });

  it('suggests near English definition matches', () => {
    const [suggestion] = suggestDictionary('boook');
    expect(suggestion.value).toBe('book');
    expect(suggestion.entry.uly).toBe('kitab');
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

  it('dedupes repeated suggestions case-insensitively', () => {
    const suggestions = suggestDictionary('goo', [
      {
        id: 'upper',
        uey: 'ياخشى',
        uly: 'yaxshi',
        ipa: '',
        partOfSpeech: 'adjective',
        definitions: ['Good'],
      },
      {
        id: 'lower',
        uey: 'ئوبدان',
        uly: 'obdan',
        ipa: '',
        partOfSpeech: 'adjective',
        definitions: ['good'],
      },
    ]);

    expect(
      suggestions.filter(
        (suggestion) =>
          suggestion.matchedOn === 'definition' &&
          suggestion.value.toLocaleLowerCase() === 'good',
      ),
    ).toHaveLength(1);
  });

  it('limits suggestions after ranking and dedupe', () => {
    const suggestions = suggestDictionary(
      'al',
      Array.from({ length: 10 }, (_, index) => ({
        id: `entry-${index}`,
        uey: `ئا-${index}`,
        uly: `alma-${index}`,
        ipa: '',
        partOfSpeech: 'noun',
        definitions: [`apple ${index}`],
      })),
    );

    expect(suggestions).toHaveLength(6);
  });

  it('does not run fuzzy suggestions for very short queries', () => {
    const suggestions = suggestDictionary('bk', [
      {
        id: 'kitab',
        uey: 'كىتاب',
        uly: 'kitab',
        ipa: '',
        partOfSpeech: 'noun',
        definitions: ['book'],
      },
    ]);

    expect(suggestions).toEqual([]);
  });

  it('does not run fuzzy suggestions across large static entry sets', () => {
    const suggestions = suggestDictionary(
      'boook',
      Array.from({ length: 2001 }, (_, index) => ({
        id: `static-entry-${index}`,
        uey: `كىتاب-${index}`,
        uly: `kitab-${index}`,
        ipa: '',
        partOfSpeech: 'translation',
        definitions: ['book'],
      })),
    );

    expect(suggestions).toEqual([]);
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
    expect(suggestDictionary('ya', undefined, 'uey')[0].value).toBe('ياخشى');
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

  it('loads UEY and converted ULY shards for Arabic auto queries', async () => {
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
    expect(result.loadedShardCount).toBe(2);
    expect(fetchMock).toHaveBeenCalledWith('/dictionary/manifest.json');
    expect(fetchMock).toHaveBeenCalledWith('/dictionary/shards/uey-64a.json');
    expect(fetchMock).toHaveBeenCalledWith('/dictionary/shards/uly-y.json');
    expect(fetchMock).not.toHaveBeenCalledWith('/dictionary/shards/english-other.json');
  });

  it('loads English, ULY, and hinted UEY shards for Latin auto queries', async () => {
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

    expect(result.entries.map((entry) => entry.uly)).toEqual(['élik']);
    expect(result.loadedShardCount).toBe(3);
    expect(fetchMock).toHaveBeenCalledWith('/dictionary/shards/english-e.json');
    expect(fetchMock).toHaveBeenCalledWith('/dictionary/shards/uly-e.json');
    expect(fetchMock).toHaveBeenCalledWith('/dictionary/shards/uey-626.json');
  });

  it('does not load UEY shards for plain English auto queries', async () => {
    const { loadStaticDictionaryEntries } = await importStaticDictionary();
    const fetchMock = vi.fn(async (url: string) => {
      if (url === '/dictionary/manifest.json') {
        return jsonResponse(testManifest());
      }

      return jsonResponse([['ئاسان', 'asan', ['easy']]]);
    });

    vi.stubGlobal('fetch', fetchMock);

    const result = await loadStaticDictionaryEntries('easy', 'auto');

    expect(result.loadedShardCount).toBe(2);
    expect(fetchMock).toHaveBeenCalledWith('/dictionary/shards/english-e.json');
    expect(fetchMock).toHaveBeenCalledWith('/dictionary/shards/uly-e.json');
    expect(fetchMock).not.toHaveBeenCalledWith('/dictionary/shards/uey-626.json');
    expect(fetchMock).not.toHaveBeenCalledWith('/dictionary/shards/uey-64a.json');
  });

  it('loads converted UEY shards for ULY input in UEY mode', async () => {
    const { loadStaticDictionaryEntries } = await importStaticDictionary();
    const fetchMock = vi.fn(async (url: string) => {
      if (url === '/dictionary/manifest.json') {
        return jsonResponse(testManifest());
      }

      return jsonResponse([['ياخشى', 'yaxshi', ['good']]]);
    });

    vi.stubGlobal('fetch', fetchMock);

    const result = await loadStaticDictionaryEntries('yaxshi', 'uey');

    expect(result.loadedShardCount).toBe(1);
    expect(fetchMock).toHaveBeenCalledWith('/dictionary/shards/uey-64a.json');
    expect(fetchMock).not.toHaveBeenCalledWith('/dictionary/shards/uly-y.json');
  });

  it('loads converted ULY shards for UEY input in ULY mode', async () => {
    const { loadStaticDictionaryEntries } = await importStaticDictionary();
    const fetchMock = vi.fn(async (url: string) => {
      if (url === '/dictionary/manifest.json') {
        return jsonResponse(testManifest());
      }

      return jsonResponse([['ياخشى', 'yaxshi', ['good']]]);
    });

    vi.stubGlobal('fetch', fetchMock);

    const result = await loadStaticDictionaryEntries('ياخشى', 'uly');

    expect(result.loadedShardCount).toBe(1);
    expect(fetchMock).toHaveBeenCalledWith('/dictionary/shards/uly-y.json');
    expect(fetchMock).not.toHaveBeenCalledWith('/dictionary/shards/uey-64a.json');
  });

  it('dedupes identical entries loaded from multiple shard families', async () => {
    const { loadStaticDictionaryEntries } = await importStaticDictionary();
    const fetchMock = vi.fn(async (url: string) => {
      if (url === '/dictionary/manifest.json') {
        return jsonResponse(testManifest());
      }

      return jsonResponse([['ئاسان', 'asan', ['easy']]]);
    });

    vi.stubGlobal('fetch', fetchMock);

    const result = await loadStaticDictionaryEntries('easy', 'auto');

    expect(result.loadedShardCount).toBe(2);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].uly).toBe('asan');
  });

  it('loads 0-9 buckets for numeric auto queries when shards exist', async () => {
    const { loadStaticDictionaryEntries } = await importStaticDictionary();
    const fetchMock = vi.fn(async (url: string) => {
      if (url === '/dictionary/manifest.json') {
        return jsonResponse(testManifest());
      }

      return jsonResponse([['بىر يۈز', 'bir yüz', ['100']]]);
    });

    vi.stubGlobal('fetch', fetchMock);

    const result = await loadStaticDictionaryEntries('100', 'auto');

    expect(result.loadedShardCount).toBe(2);
    expect(fetchMock).toHaveBeenCalledWith('/dictionary/shards/english-0-9.json');
    expect(fetchMock).toHaveBeenCalledWith('/dictionary/shards/uly-0-9.json');
  });

  it('returns no entries when the manifest has no matching shard bucket', async () => {
    const { loadStaticDictionaryEntries } = await importStaticDictionary();
    const fetchMock = vi.fn(async (url: string) => {
      if (url === '/dictionary/manifest.json') {
        return jsonResponse(testManifest());
      }

      throw new Error(`Unexpected shard fetch: ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    const result = await loadStaticDictionaryEntries('zebra', 'auto');

    expect(result.entries).toEqual([]);
    expect(result.loadedShardCount).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('builds stable unique ids from the full static entry payload', async () => {
    const { loadStaticDictionaryEntries } = await importStaticDictionary();
    const fetchMock = vi.fn(async (url: string) => {
      if (url === '/dictionary/manifest.json') {
        return jsonResponse(testManifest());
      }

      return jsonResponse([
        ['يەر', 'yer', ['earth']],
        ['ماشىنا', 'mashina', ['engine']],
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

    const result = await loadStaticDictionaryEntries('ياخشى', 'uey');

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

    await expect(loadStaticDictionaryEntries('ياخشى', 'uey')).rejects.toThrow(
      'Dictionary shard 503',
    );

    const result = await loadStaticDictionaryEntries('ياخشى', 'uey');

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

    await loadStaticDictionaryEntries('ياخشى', 'uey');
    await loadStaticDictionaryEntries('ياخشى', 'uey');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledWith('/dictionary/manifest.json');
    expect(fetchMock).toHaveBeenCalledWith('/dictionary/shards/uey-64a.json');
  });
});

describe('build_dictionary_dataset', () => {
  it('strips parenthetical Uyghur headword notes before sharding', async () => {
    const { cleanHeadword } = await importBuildDictionaryScript();

    expect(cleanHeadword('رەھمەت (ياپون تىلى)')).toBe('رەھمەت');
    expect(cleanHeadword('رەھمەت (ياپون تىلى')).toBe('رەھمەت');
    expect(cleanHeadword('ئازراق （ ساناش مۇمكىن بولغان ئىسىملارغا ئىشلىتىلىدۇ')).toBe(
      'ئازراق',
    );
    expect(cleanHeadword('ئايلاندۇرۇپ ئورىماق ）ئۆتكەن زامان تارماق شەكلى')).toBe(
      'ئايلاندۇرۇپ ئورىماق ئۆتكەن زامان تارماق شەكلى',
    );
  });
});

async function importStaticDictionary() {
  vi.resetModules();
  return import('../../src/lib/dictionary/static-dataset');
}

async function importBuildDictionaryScript() {
  // @ts-ignore The dataset builder is a plain ESM script, not TypeScript.
  return import('../../scripts/build_dictionary_dataset.mjs') as Promise<{
    cleanHeadword: (value: string) => string;
  }>;
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
        '0-9': { file: 'shards/english-0-9.json', count: 1 },
        e: { file: 'shards/english-e.json', count: 1 },
        other: { file: 'shards/english-other.json', count: 1 },
      },
      uly: {
        '0-9': { file: 'shards/uly-0-9.json', count: 1 },
        e: { file: 'shards/uly-e.json', count: 2 },
        y: { file: 'shards/uly-y.json', count: 1 },
      },
      uey: {
        '626': { file: 'shards/uey-626.json', count: 1 },
        '64a': { file: 'shards/uey-64a.json', count: 1 },
      },
    },
  };
}

function jsonResponse(value: unknown) {
  return {
    ok: true,
    json: async () => value,
  } as Response;
}
