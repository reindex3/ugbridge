import { describe, expect, it } from 'vitest';
import {
  analyzeReaderText,
  detectReaderScript,
  getUlyLookupQueries,
  tokenizeReaderText,
} from '../../src/lib/reader';

describe('analyzeReaderText', () => {
  it('builds ULY text and lookup candidates from UEY input', () => {
    const analysis = analyzeReaderText('سالام كىتاب');

    expect(analysis.sourceScript).toBe('uey');
    expect(analysis.ueyText).toBe('سالام كىتاب');
    expect(analysis.ulyText).toBe('salam kitab');
    expect(analysis.tokens.map((token) => token.uly)).toEqual([
      'salam',
      'kitab',
    ]);
    expect(analysis.lookupCandidates.map((candidate) => candidate.uly)).toEqual(
      ['salam', 'kitab'],
    );
  });

  it('builds UEY text from ULY input', () => {
    const analysis = analyzeReaderText('salam kitab');

    expect(analysis.sourceScript).toBe('uly');
    expect(analysis.ueyText).toBe('سالام كىتاب');
    expect(analysis.ulyText).toBe('salam kitab');
  });

  it('keeps mixed-script source text readable without forcing UEY conversion', () => {
    const analysis = analyzeReaderText('سالام kitab');

    expect(analysis.sourceScript).toBe('mixed');
    expect(analysis.ueyText).toBe('سالام kitab');
    expect(analysis.ulyText).toBe('salam kitab');
    expect(analysis.notes).toContain('Mixed UEY and Latin text detected.');
  });
});

describe('tokenizeReaderText', () => {
  it('keeps token offsets and script labels', () => {
    const tokens = tokenizeReaderText('مەن 2026 salam');

    expect(tokens.map((token) => [token.text, token.script])).toEqual([
      ['مەن', 'uey'],
      ['2026', 'number'],
      ['salam', 'uly'],
    ]);
    expect(tokens[2].start).toBe(9);
  });
});

describe('getUlyLookupQueries', () => {
  it('tries the full token before simple suffix roots', () => {
    expect(getUlyLookupQueries('sizni')).toEqual(['sizni', 'siz']);
    expect(getUlyLookupQueries('kitablar')).toEqual(['kitablar', 'kitab']);
  });
});

describe('detectReaderScript', () => {
  it('detects UEY, ULY, mixed, and unknown text', () => {
    expect(detectReaderScript('ياخشى')).toBe('uey');
    expect(detectReaderScript('yaxshi')).toBe('uly');
    expect(detectReaderScript('ياخشى yaxshi')).toBe('mixed');
    expect(detectReaderScript('123')).toBe('unknown');
  });
});
