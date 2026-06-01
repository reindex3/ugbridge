import { describe, it, expect } from 'vitest';
import { ueyToUly } from '../src/lib/converter';

describe('ueyToUly', () => {
  it('returns empty string for empty input', () => {
    expect(ueyToUly('')).toBe('');
  });

  it('preserves ASCII text unchanged', () => {
    expect(ueyToUly('Hello World 123')).toBe('Hello World 123');
  });

  describe('single-letter mappings', () => {
    it.each([
      ['ا', 'a'],
      ['ە', 'e'],
      ['ب', 'b'],
      ['پ', 'p'],
      ['ت', 't'],
      ['ج', 'j'],
      ['د', 'd'],
      ['ر', 'r'],
      ['ز', 'z'],
      ['س', 's'],
      ['ف', 'f'],
      ['ق', 'q'],
      ['ك', 'k'],
      ['ل', 'l'],
      ['م', 'm'],
      ['ن', 'n'],
      ['ھ', 'h'],
      ['و', 'o'],
      ['ۇ', 'u'],
      ['ۆ', 'ö'],
      ['ۈ', 'ü'],
      ['ۋ', 'w'],
      ['ې', 'é'],
      ['ى', 'i'],
      ['ي', 'y'],
    ])('maps %s to %s', (uey, uly) => {
      expect(ueyToUly(uey)).toBe(uly);
    });
  });

  describe('multi-character mappings', () => {
    it.each([
      ['چ', 'ch'],
      ['خ', 'x'],
      ['ژ', 'zh'],
      ['ش', 'sh'],
      ['غ', 'gh'],
      ['گ', 'g'],
      ['ڭ', 'ng'],
    ])('maps %s to %s', (uey, uly) => {
      expect(ueyToUly(uey)).toBe(uly);
    });
  });

  describe('hamza handling', () => {
    it('drops word-initial hamza before vowels', () => {
      expect(ueyToUly('ئا')).toBe('a');
      expect(ueyToUly('ئە')).toBe('e');
      expect(ueyToUly('ئۇ')).toBe('u');
      expect(ueyToUly('ئى')).toBe('i');
    });

    it('keeps in-word hamza as apostrophe', () => {
      expect(ueyToUly('سائەت')).toBe("sa'et");
      expect(ueyToUly('مۇئەللىم')).toBe("mu'ellim");
      expect(ueyToUly('ئالما سائەت')).toBe("alma sa'et");
    });
  });

  describe('common words', () => {
    it.each([
      ['سالام', 'salam'],
      ['مەن', 'men'],
      ['ياخشى', 'yaxshi'],
      ['ئۇيغۇر', 'uyghur'],
      ['ئۇيغۇرچە', 'uyghurche'],
      ['كىتاب', 'kitab'],
      ['ئالما', 'alma'],
      ['ياخشىمۇسىز', 'yaxshimusiz'],
      ['چاي', 'chay'],
      ['مەكتەپ', 'mektep'],
      ['بالا', 'bala'],
    ])('converts %s to %s', (uey, uly) => {
      expect(ueyToUly(uey)).toBe(uly);
    });
  });

  describe('phrases', () => {
    it('converts a full sentence', () => {
      expect(ueyToUly('مەن سىزنى ياخشى كۆرىمەن')).toBe(
        'men sizni yaxshi körimen',
      );
    });

    it('preserves spaces between words', () => {
      expect(ueyToUly('ياخشى مەن')).toBe('yaxshi men');
    });

    it('preserves newlines', () => {
      expect(ueyToUly('سالام\nمەن')).toBe('salam\nmen');
    });
  });

  describe('punctuation', () => {
    it('converts Arabic question mark', () => {
      expect(ueyToUly('ياخشىمۇ؟')).toBe('yaxshimu?');
    });

    it('converts Arabic comma', () => {
      expect(ueyToUly('ھە، ياخشى')).toBe('he, yaxshi');
    });
  });

  describe('mixed content', () => {
    it('handles Arabic + Latin together', () => {
      expect(ueyToUly('Hello سالام')).toBe('Hello salam');
    });

    it('handles numbers in Uyghur text', () => {
      expect(ueyToUly('12 كىتاب')).toBe('12 kitab');
    });
  });
});
