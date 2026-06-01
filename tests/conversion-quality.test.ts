import { describe, expect, it } from 'vitest';
import {
  detectConversionDirection,
  getConversionQualityHints,
} from '../src/lib/converter';

describe('conversion quality hints', () => {
  it('flags mixed UEY and Latin text', () => {
    const text = 'سالام salam';
    const hints = getConversionQualityHints(
      text,
      'uey-to-uly',
      detectConversionDirection(text),
    );

    expect(hints).toContainEqual(
      expect.objectContaining({
        level: 'warning',
        message: 'Mixed script detected',
      }),
    );
  });

  it('flags low-confidence plain Latin text', () => {
    const text = 'hello';
    const hints = getConversionQualityHints(
      text,
      'uey-to-uly',
      detectConversionDirection(text),
    );

    expect(hints).toContainEqual(
      expect.objectContaining({
        level: 'info',
        message: 'Latin text detected',
      }),
    );
  });
});
