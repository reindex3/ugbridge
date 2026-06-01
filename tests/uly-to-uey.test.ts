import { describe, it, expect } from 'vitest';
import { ulyToUey, ueyToUly } from '../src/lib/converter';

describe('ulyToUey', () => {
  it('returns empty string for empty input', () => {
    expect(ulyToUey('')).toBe('');
  });

  describe('digraphs (longest-match)', () => {
    it.each([
      ['ch', 'چ'],
      ['sh', 'ش'],
      ['gh', 'غ'],
      ['ng', 'ڭ'],
      ['zh', 'ژ'],
    ])('converts digraph %s to %s', (uly, uey) => {
      expect(ulyToUey(uly)).toBe(uey);
    });

    it('prefers digraph over splitting into two single letters', () => {
      // 'sh' should become ش (one char), not س + ھ
      expect(ulyToUey('sh')).toBe('ش');
      expect(ulyToUey('ng')).toBe('ڭ');
    });
  });

  describe('word-initial hamza', () => {
    it.each([
      ['alma', 'ئالما'],
      ['et', 'ئەت'],
      ['inim', 'ئىنىم'],
      ['oqu', 'ئوقۇ'],
      ['un', 'ئۇن'],
      ['öy', 'ئۆي'],
      ['üch', 'ئۈچ'],
      ['étim', 'ئېتىم'],
    ])('prepends hamza to word-initial vowel in %s', (uly, uey) => {
      expect(ulyToUey(uly)).toBe(uey);
    });

    it('accepts ë as a backwards-compatible alias for standard é', () => {
      expect(ulyToUey('étim')).toBe('ئېتىم');
      expect(ulyToUey('ëtim')).toBe('ئېتىم');
    });

    it('accepts é mid-word', () => {
      expect(ulyToUey('mén')).toBe(ulyToUey('mën'));
    });

    it('does not prepend hamza before mid-word vowels', () => {
      expect(ulyToUey('kitab')).toBe('كىتاب');
      expect(ulyToUey('salam')).toBe('سالام');
    });

    it('inserts hamza between adjacent vowels', () => {
      expect(ulyToUey('saet')).toBe('سائەت');
      expect(ulyToUey('muellim')).toBe('مۇئەللىم');
    });

    it('converts ULY apostrophe to in-word hamza', () => {
      expect(ulyToUey("sa'et")).toBe('سائەت');
      expect(ulyToUey("mu'ellim")).toBe('مۇئەللىم');
      expect(ulyToUey('sa’et')).toBe('سائەت');
    });

    it('does not prepend hamza when word starts with a consonant', () => {
      expect(ulyToUey('men')).toBe('مەن');
      expect(ulyToUey('bala')).toBe('بالا');
    });

    it('resets word-start after whitespace', () => {
      expect(ulyToUey('men alma')).toBe('مەن ئالما');
    });

    it('resets word-start after punctuation', () => {
      expect(ulyToUey('he, alma')).toBe('ھە، ئالما');
    });
  });

  describe('common words', () => {
    it.each([
      ['salam', 'سالام'],
      ['men', 'مەن'],
      ['yaxshi', 'ياخشى'],
      ['uyghur', 'ئۇيغۇر'],
      ['uyghurche', 'ئۇيغۇرچە'],
      ['kitab', 'كىتاب'],
      ['alma', 'ئالما'],
      ['yaxshimusiz', 'ياخشىمۇسىز'],
      ['chay', 'چاي'],
      ['mektep', 'مەكتەپ'],
      ['bala', 'بالا'],
      ['körimen', 'كۆرىمەن'],
    ])('converts %s to %s', (uly, uey) => {
      expect(ulyToUey(uly)).toBe(uey);
    });
  });

  describe('phrases', () => {
    it('converts a full sentence', () => {
      expect(ulyToUey('men sizni yaxshi körimen')).toBe(
        'مەن سىزنى ياخشى كۆرىمەن',
      );
    });

    it('preserves spaces between words', () => {
      expect(ulyToUey('yaxshi men')).toBe('ياخشى مەن');
    });

    it('preserves newlines', () => {
      expect(ulyToUey('salam\nmen')).toBe('سالام\nمەن');
    });
  });

  describe('punctuation', () => {
    it('converts Latin question mark to Arabic', () => {
      expect(ulyToUey('yaxshimu?')).toBe('ياخشىمۇ؟');
    });

    it('converts Latin comma to Arabic', () => {
      expect(ulyToUey('he, yaxshi')).toBe('ھە، ياخشى');
    });

    it('leaves Latin period alone (universal punctuation)', () => {
      expect(ulyToUey('salam.')).toBe('سالام.');
    });
  });

  describe('case-insensitive input', () => {
    it('handles uppercase first letter', () => {
      expect(ulyToUey('Salam')).toBe('سالام');
    });

    it('handles fully uppercase input', () => {
      expect(ulyToUey('YAXSHI')).toBe('ياخشى');
    });

    it('handles uppercase digraph', () => {
      expect(ulyToUey('Chay')).toBe('چاي');
    });
  });

  describe('mixed content', () => {
    it('passes through numbers unchanged', () => {
      expect(ulyToUey('5 alma')).toBe('5 ئالما');
    });

    it('passes through Arabic input unchanged (no double conversion)', () => {
      expect(ulyToUey('ئالما')).toBe('ئالما');
    });
  });
});

describe('round-trip: ueyToUly → ulyToUey', () => {
  it.each([
    'سالام',
    'مەن',
    'ياخشى',
    'ئۇيغۇر',
    'ئۇيغۇرچە',
    'كىتاب',
    'ئالما',
    'سائەت',
    'مۇئەللىم',
    'ياخشىمۇسىز',
    'چاي',
    'مەكتەپ',
    'بالا',
    'كۆرىمەن',
    'مەن سىزنى ياخشى كۆرىمەن',
    'ھە، ياخشى',
    'ياخشىمۇ؟',
  ])('round-trips %s cleanly', (uey) => {
    expect(ulyToUey(ueyToUly(uey))).toBe(uey);
  });
});
