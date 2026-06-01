import { describe, expect, it } from 'vitest';
import { buildUlyToUeyStudy, traceUlyToUey } from '../src/lib/converter';

describe('UEY study model', () => {
  it('splits UEY letters and keeps their matching ULY source', () => {
    const study = buildUlyToUeyStudy(traceUlyToUey('yaxshi'));

    expect(study.words[0].text).toBe('ياخشى');
    expect(study.words[0].uly).toBe('yaxshi');
    expect(study.words[0].letters.map((letter) => letter.uey)).toEqual([
      'ي',
      'ا',
      'خ',
      'ش',
      'ى',
    ]);
    expect(study.words[0].letters.map((letter) => letter.uly)).toEqual([
      'y',
      'a',
      'x',
      'sh',
      'i',
    ]);
  });

  it('marks word-initial hamza as a carrier for the same ULY vowel', () => {
    const study = buildUlyToUeyStudy(traceUlyToUey('alma'));
    const [carrier, vowel] = study.words[0].letters;

    expect(study.words[0].text).toBe('ئالما');
    expect(study.words[0].uly).toBe('alma');
    expect(carrier).toMatchObject({
      uey: 'ئ',
      uly: 'a',
      role: 'carrier',
      form: 'initial',
    });
    expect(vowel).toMatchObject({
      uey: 'ا',
      uly: 'a',
      role: 'hamza-vowel',
      form: 'final',
    });
  });

  it('computes contextual forms inside a word', () => {
    const study = buildUlyToUeyStudy(traceUlyToUey('yaxshi'));
    const forms = study.words[0].letters.map((letter) => letter.form);
    const sheen = study.words[0].letters[3];

    expect(forms).toEqual(['initial', 'final', 'initial', 'medial', 'final']);
    expect(sheen.formGlyph).toBe('ﺸ');
    expect(sheen.isolatedGlyph).toBe('ﺵ');
  });
});
