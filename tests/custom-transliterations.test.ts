import { describe, expect, it } from 'vitest';
import {
  addCustomTransliteration,
  applyCustomTransliterations,
  normalizeCustomTransliterations,
  type CustomTransliterationEntry,
} from '../src/lib/custom-transliterations';

describe('custom transliterations', () => {
  it('normalizes invalid stored values to an empty list', () => {
    expect(normalizeCustomTransliterations(null)).toEqual([]);
    expect(normalizeCustomTransliterations([{ uey: 'قەشقەر' }])).toEqual([]);
  });

  it('adds newest entries first', () => {
    expect(
      addCustomTransliteration([], {
        uey: 'قەشقەر',
        uly: 'Kashgar',
        now: 1,
      }),
    ).toEqual([
      {
        id: 'قەشقەر:kashgar',
        uey: 'قەشقەر',
        uly: 'Kashgar',
        updatedAt: 1,
      },
    ]);
  });

  it('deduplicates identical UEY and ULY pairs', () => {
    const first = addCustomTransliteration([], {
      uey: 'قەشقەر',
      uly: 'Kashgar',
      now: 1,
    });
    const second = addCustomTransliteration(first, {
      uey: 'قەشقەر',
      uly: 'kashgar',
      now: 2,
    });

    expect(second).toHaveLength(1);
    expect(second[0].updatedAt).toBe(2);
  });

  it('applies custom UEY to ULY replacements before conversion', () => {
    const entries: CustomTransliterationEntry[] = [
      {
        id: 'قەشقەر:kashgar',
        uey: 'قەشقەر',
        uly: 'Kashgar',
        updatedAt: 1,
      },
    ];

    expect(
      applyCustomTransliterations('مەن قەشقەر', 'uey-to-uly', entries),
    ).toBe('مەن Kashgar');
  });

  it('applies custom ULY to UEY replacements case-insensitively', () => {
    const entries: CustomTransliterationEntry[] = [
      {
        id: 'قەشقەر:kashgar',
        uey: 'قەشقەر',
        uly: 'Kashgar',
        updatedAt: 1,
      },
    ];

    expect(
      applyCustomTransliterations('men kashgar', 'uly-to-uey', entries),
    ).toBe('men قەشقەر');
  });
});
