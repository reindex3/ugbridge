import { describe, expect, it } from 'vitest';
import { detectConversionDirection } from '../src/lib/converter';

describe('detectConversionDirection', () => {
  it('returns none for empty input', () => {
    expect(detectConversionDirection('')).toMatchObject({
      direction: null,
      confidence: 'none',
    });
  });

  it('detects UEY Arabic input with high confidence', () => {
    expect(detectConversionDirection('ياخشىمۇسىز')).toMatchObject({
      direction: 'uey-to-uly',
      confidence: 'high',
    });
  });

  it('detects ULY input with strong Latin signals', () => {
    expect(detectConversionDirection('yaxshimusiz')).toMatchObject({
      direction: 'uly-to-uey',
      confidence: 'high',
    });
    expect(detectConversionDirection('körimen')).toMatchObject({
      direction: 'uly-to-uey',
      confidence: 'high',
    });
  });

  it('keeps generic Latin text low-confidence to avoid English false positives', () => {
    expect(detectConversionDirection('Hello World')).toMatchObject({
      direction: 'uly-to-uey',
      confidence: 'low',
    });
    expect(detectConversionDirection('quick fix')).toMatchObject({
      direction: 'uly-to-uey',
      confidence: 'low',
    });
  });

  it('prefers UEY when Arabic and Latin text are mixed', () => {
    expect(detectConversionDirection('Hello سالام')).toMatchObject({
      direction: 'uey-to-uly',
      confidence: 'high',
    });
  });
});
