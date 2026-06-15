import { describe, expect, it } from 'vitest';
import {
  ALPHABET_STUDY_ENTRIES,
  UEY_LETTER_FORMS,
} from '../../src/lib/converter';

describe('ALPHABET_STUDY_ENTRIES', () => {
  it('includes letters and digraphs with IPA-backed examples', () => {
    expect(ALPHABET_STUDY_ENTRIES).toHaveLength(32);
    expect(ALPHABET_STUDY_ENTRIES[0]).toMatchObject({
      token: 'a',
      uey: 'ا',
      displayUey: 'ئا',
      kind: 'letter',
    });
  });

  it('uses a vowels-first study order', () => {
    expect(ALPHABET_STUDY_ENTRIES.map((entry) => entry.token)).toEqual([
      'a',
      'e',
      'é',
      'i',
      'o',
      'u',
      'ö',
      'ü',
      'b',
      'p',
      't',
      'j',
      'ch',
      'x',
      'd',
      'r',
      'z',
      'zh',
      's',
      'sh',
      'gh',
      'f',
      'q',
      'k',
      'g',
      'ng',
      'l',
      'm',
      'n',
      'h',
      'w',
      'y',
    ]);
  });

  it('includes classroom chart example words', () => {
    expect(
      ALPHABET_STUDY_ENTRIES.find((entry) => entry.token === 'p')?.examples[0],
    ).toMatchObject({
      uly: 'paqa',
      uey: 'پاقا',
      english: 'frog',
      image: { alt: 'Illustration of a frog' },
    });
    expect(
      ALPHABET_STUDY_ENTRIES.find((entry) => entry.token === 'zh')?.examples[0],
    ).toMatchObject({ uly: 'zhurnal', uey: 'ژۇرنال' });
    expect(
      ALPHABET_STUDY_ENTRIES.find((entry) => entry.token === 'w')?.examples.find(
        (example) => example.uly === 'wélisipit',
      ),
    ).toMatchObject({ uly: 'wélisipit', uey: 'ۋېلىسىپىت' });
  });

  it('attaches pictures to every visible example', () => {
    const examples = ALPHABET_STUDY_ENTRIES.flatMap((entry) => entry.examples);

    expect(examples.every((example) => example.image)).toBe(true);
    expect(
      ALPHABET_STUDY_ENTRIES.find((entry) => entry.token === 'ö')?.examples.find(
        (example) => example.uly === 'öy',
      )?.image,
    ).toMatchObject({ emoji: '🏠', alt: 'Illustration of a house' });
  });

  it('builds highlighted examples for a dual-joining letter', () => {
    const entry = ALPHABET_STUDY_ENTRIES.find((item) => item.token === 'sh');
    expect(entry?.examples.map((example) => example.label)).toContain(
      'isolated',
    );
    expect(entry?.examples.map((example) => example.label)).toContain('final');
    expect(entry?.examples.map((example) => example.label)).toContain('medial');
    expect(
      entry?.examples.every((example) => example.highlightIndexes.length > 0),
    ).toBe(true);
    expect(new Set(entry?.examples.map((example) => example.highlightGlyph)).size)
      .toBeGreaterThan(1);
  });

  it('lists every available presentation form for each letter', () => {
    for (const entry of ALPHABET_STUDY_ENTRIES) {
      const info = UEY_LETTER_FORMS[entry.uey];
      const expected = (
        ['isolated', 'initial', 'medial', 'final'] as const
      ).filter((label) => label === 'isolated' || info[label]);
      const expectedWithVowelCarrier = isWordInitialVowel(entry.token)
        ? ['word-initial', ...expected]
        : expected;

      expect(entry.forms.map((form) => form.label), entry.token).toEqual(
        expectedWithVowelCarrier,
      );
      expect(entry.forms.every((form) => form.glyph), entry.token).toBe(true);
    }
  });

  it('shows common hamza-carrier forms for word-initial vowels', () => {
    expect(
      ALPHABET_STUDY_ENTRIES.find((entry) => entry.token === 'a'),
    ).toMatchObject({
      uey: 'ا',
      displayUey: 'ئا',
      forms: expect.arrayContaining([
        { label: 'word-initial', glyph: 'ئا' },
      ]),
    });
    expect(
      ALPHABET_STUDY_ENTRIES.find((entry) => entry.token === 'i'),
    ).toMatchObject({
      uey: 'ى',
      displayUey: 'ئى',
      forms: expect.arrayContaining([
        { label: 'word-initial', glyph: 'ئى' },
      ]),
    });
  });

  it('covers common examples for previously sparse letters', () => {
    for (const token of ['f', 'g', 'ng', 'é']) {
      const entry = ALPHABET_STUDY_ENTRIES.find((item) => item.token === token);
      expect(entry?.examples.length, token).toBeGreaterThan(0);
    }
  });

  it('uses real example words instead of generated shape strings', () => {
    const entry = ALPHABET_STUDY_ENTRIES.find((item) => item.token === 'a');
    expect(entry?.examples.every((example) => example.english)).toBe(true);
    expect(entry?.examples.map((example) => example.uly)).toContain('ata');
  });

  it('shows word-initial vowels as a carrier plus vowel pair', () => {
    const entry = ALPHABET_STUDY_ENTRIES.find((item) => item.token === 'a');
    const initial = entry?.examples.find(
      (example) => example.label === 'word-initial',
    );

    expect(initial?.uly).toBe('ata');
    expect(initial?.highlightIndexes).toHaveLength(2);
    expect(initial?.highlightGlyph).toBe('ئا');
  });

  it('uses connected joining samples for contextual letter forms', () => {
    const entry = ALPHABET_STUDY_ENTRIES.find((item) => item.token === 'p');

    expect(entry?.forms).toEqual([
      { label: 'isolated', glyph: 'پ' },
      { label: 'initial', glyph: 'پـ' },
      { label: 'medial', glyph: 'ـپـ' },
      { label: 'final', glyph: 'ـپ' },
    ]);
    expect(entry?.examples.find((example) => example.label === 'initial'))
      .toMatchObject({ uly: 'paqa', highlightGlyph: 'پـ' });
  });

  it('does not invent impossible medial forms for right-joining vowels', () => {
    const entry = ALPHABET_STUDY_ENTRIES.find((item) => item.token === 'a');
    expect(entry?.examples.map((example) => example.label)).not.toContain(
      'medial',
    );
  });

  it('covers each practical form shown for right-joining vowels', () => {
    const entry = ALPHABET_STUDY_ENTRIES.find((item) => item.token === 'ö');

    expect(entry?.forms.map((form) => form.label)).toEqual([
      'word-initial',
      'isolated',
      'final',
    ]);
    expect(entry?.examples.map((example) => example.label)).toEqual([
      'word-initial',
      'isolated',
      'final',
    ]);
    expect(entry?.examples.find((example) => example.label === 'isolated'))
      .toMatchObject({ uly: 'dölet', uey: 'دۆلەت', english: 'state' });
  });

  it('does not show a final form for h', () => {
    const entry = ALPHABET_STUDY_ENTRIES.find((item) => item.token === 'h');

    expect(entry?.forms.map((form) => form.label)).toEqual([
      'isolated',
      'initial',
      'medial',
    ]);
    expect(entry?.examples.map((example) => example.label)).not.toContain(
      'final',
    );
  });

  it('uses corrected common word examples', () => {
    const g = ALPHABET_STUDY_ENTRIES.find((item) => item.token === 'g');
    const s = ALPHABET_STUDY_ENTRIES.find((item) => item.token === 's');

    expect(g?.examples.find((example) => example.uly === 'belge')?.english).toBe(
      'sign',
    );
    expect(s?.examples.find((example) => example.uly === "sa'et")?.uey).toBe(
      'سائەت',
    );
  });
});

function isWordInitialVowel(token: string) {
  return ['a', 'e', 'o', 'u', 'ö', 'ü', 'é', 'i'].includes(token);
}
