import { describe, expect, it } from 'vitest';
import { ulyToIpa, ulyTokenToIpa } from '../src/lib/converter';

describe('ulyToIpa', () => {
  it('returns empty string for empty input', () => {
    expect(ulyToIpa('')).toBe('');
  });

  it('maps common Uyghur Latin letters and vowels', () => {
    expect(ulyToIpa('salam')).toBe('sɑlɑm');
    expect(ulyToIpa('körimen')).toBe('kørimæn');
    expect(ulyToIpa('üch')).toBe('ytʃ');
  });

  it('uses longest-match digraphs', () => {
    expect(ulyToIpa('yaxshi')).toBe('jɑχʃi');
    expect(ulyToIpa('uyghurche')).toBe('ujʁurtʃæ');
    expect(ulyToIpa('zhurnal')).toBe('ʒurnɑl');
  });

  it('accepts ë as an alias for standard é', () => {
    expect(ulyToIpa('mén')).toBe('men');
    expect(ulyToIpa('mën')).toBe('men');
  });

  it('preserves spacing, punctuation, and unknown characters', () => {
    expect(ulyToIpa('Salam, 123!')).toBe('sɑlɑm, 123!');
  });
});

describe('ulyTokenToIpa', () => {
  it('maps individual letters and digraphs', () => {
    expect(ulyTokenToIpa('a')).toBe('ɑ');
    expect(ulyTokenToIpa('sh')).toBe('ʃ');
    expect(ulyTokenToIpa('Ch')).toBe('tʃ');
  });

  it('returns empty string for unknown tokens', () => {
    expect(ulyTokenToIpa('?')).toBe('');
  });
});
