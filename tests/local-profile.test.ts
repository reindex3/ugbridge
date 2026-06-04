import { beforeEach, describe, expect, it } from 'vitest';
import {
  exportLocalProfileData,
  getQuizAccuracy,
  importLocalProfileData,
  loadDictionaryLookups,
  loadQuizProgress,
  normalizeDictionaryLookups,
  normalizeQuizProgress,
  recordDictionaryLookup,
  recordQuizAnswer,
  saveDictionaryLookups,
  saveQuizProgress,
} from '../src/lib/local-profile';
import type { DictionaryEntry } from '../src/lib/dictionary';

const yaxshiEntry: DictionaryEntry = {
  id: 'yaxshi',
  uey: 'ياخشى',
  uly: 'yaxshi',
  ipa: 'jɑχʃi',
  partOfSpeech: 'adjective',
  definitions: ['good', 'well'],
};

describe('local profile', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('records dictionary lookups newest first and counts repeats', () => {
    const first = recordDictionaryLookup([], {
      query: 'good',
      entry: yaxshiEntry,
      now: 1,
    });
    const second = recordDictionaryLookup(first, {
      query: 'ياخشى',
      entry: yaxshiEntry,
      now: 2,
    });

    expect(second).toEqual([
      {
        id: 'yaxshi',
        query: 'ياخشى',
        uey: 'ياخشى',
        uly: 'yaxshi',
        definition: 'good',
        count: 2,
        updatedAt: 2,
      },
    ]);
  });

  it('normalizes invalid local profile values', () => {
    expect(normalizeDictionaryLookups([{ uey: '', uly: 'ghost' }])).toEqual(
      [],
    );
    expect(normalizeQuizProgress({ answered: 3, correct: 9 })).toMatchObject({
      answered: 3,
      correct: 3,
    });
  });

  it('tracks quiz accuracy, streaks, and missed forms', () => {
    const first = recordQuizAnswer(loadQuizProgress(), {
      token: 'a',
      form: 'isolated',
      correct: true,
      now: 1,
    });
    const second = recordQuizAnswer(first, {
      token: 'sh',
      form: 'medial',
      correct: false,
      now: 2,
    });

    expect(second).toMatchObject({
      answered: 2,
      correct: 1,
      currentStreak: 0,
      bestStreak: 1,
    });
    expect(getQuizAccuracy(second)).toBe(50);
    expect(second.missedItems[0]).toMatchObject({
      id: 'sh:medial',
      token: 'sh',
      form: 'medial',
      missed: 1,
    });
  });

  it('exports and imports the local profile payload', () => {
    saveDictionaryLookups(
      recordDictionaryLookup([], { query: 'good', entry: yaxshiEntry, now: 1 }),
    );
    saveQuizProgress(
      recordQuizAnswer(loadQuizProgress(), {
        token: 'a',
        form: 'initial',
        correct: true,
        now: 1,
      }),
    );

    const exported = exportLocalProfileData(10);
    window.localStorage.clear();
    importLocalProfileData(exported);

    expect(loadDictionaryLookups()).toHaveLength(1);
    expect(loadQuizProgress()).toMatchObject({
      answered: 1,
      correct: 1,
    });
  });

  it('rejects unrelated import payloads without clearing saved data', () => {
    saveDictionaryLookups(
      recordDictionaryLookup([], { query: 'good', entry: yaxshiEntry, now: 1 }),
    );

    expect(() => importLocalProfileData({ hello: 'world' })).toThrow(
      'Invalid local profile data',
    );
    expect(loadDictionaryLookups()).toHaveLength(1);
  });
});
