import { describe, expect, it } from 'vitest';
import { getReaderOcrQuality } from '../../src/lib/reader/ocr';

describe('Reader OCR helpers', () => {
  it('classifies OCR confidence for UI quality badges', () => {
    expect(getReaderOcrQuality(undefined)).toBe('unknown');
    expect(getReaderOcrQuality(20)).toBe('low');
    expect(getReaderOcrQuality(55)).toBe('medium');
    expect(getReaderOcrQuality(85)).toBe('high');
  });
});
