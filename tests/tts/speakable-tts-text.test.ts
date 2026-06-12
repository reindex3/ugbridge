import { describe, expect, it } from 'vitest';
import { getSpeakableUeyText } from '../../src/lib/tts/speakable-text';

describe('getSpeakableUeyText', () => {
  it('keeps UEY input for UEY to ULY conversion', () => {
    expect(
      getSpeakableUeyText({
        direction: 'uey-to-uly',
        input: 'سالام',
        output: 'salam',
      }),
    ).toBe('سالام');
  });

  it('uses UEY output for ULY to UEY conversion', () => {
    expect(
      getSpeakableUeyText({
        direction: 'uly-to-uey',
        input: 'salam',
        output: 'سالام',
      }),
    ).toBe('سالام');
  });
});
