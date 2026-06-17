import { describe, expect, it } from 'vitest';
import {
  getReaderOcrQuality,
  isUsablePaddleOcrResult,
} from '../../src/lib/reader/ocr';

describe('Reader OCR helpers', () => {
  it('classifies OCR confidence for UI quality badges', () => {
    expect(getReaderOcrQuality(undefined)).toBe('unknown');
    expect(getReaderOcrQuality(20)).toBe('low');
    expect(getReaderOcrQuality(55)).toBe('medium');
    expect(getReaderOcrQuality(85)).toBe('high');
  });

  it('only accepts high-confidence PP-OCR results before fallback', () => {
    expect(
      isUsablePaddleOcrResult({
        text: 'سالام',
        confidence: 75,
        engine: 'paddle',
      }),
    ).toBe(true);
    expect(
      isUsablePaddleOcrResult({
        text: 'سالام',
        confidence: 74,
        engine: 'paddle',
      }),
    ).toBe(false);
    expect(
      isUsablePaddleOcrResult({
        text: '',
        confidence: 95,
        engine: 'paddle',
      }),
    ).toBe(false);
  });
});
