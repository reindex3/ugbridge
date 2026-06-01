import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TTS_SETTINGS,
  DEFAULT_TTS_VOICE,
  normalizeTtsSettings,
} from '../src/lib/tts/settings';

describe('TTS settings', () => {
  it('falls back to browser mode for empty values', () => {
    expect(normalizeTtsSettings(null)).toEqual(DEFAULT_TTS_SETTINGS);
    expect(
      normalizeTtsSettings({ mode: 'api', apiKey: 'sk-test' }),
    ).toEqual(DEFAULT_TTS_SETTINGS);
  });

  it('keeps valid custom API settings', () => {
    expect(
      normalizeTtsSettings({
        mode: 'api',
        endpoint: ' https://example.com/tts ',
        apiKey: ' sk-test ',
        voice: ' ug-CN-NasirNeural ',
      }),
    ).toEqual({
      mode: 'api',
      endpoint: 'https://example.com/tts',
      apiKey: 'sk-test',
      voice: 'ug-CN-NasirNeural',
    });
  });

  it('uses the default voice when the stored voice is empty', () => {
    expect(
      normalizeTtsSettings({
        mode: 'api',
        endpoint: '/api/tts',
        voice: '',
      }).voice,
    ).toBe(DEFAULT_TTS_VOICE);
  });

  it('drops stale API settings when browser mode is selected', () => {
    expect(
      normalizeTtsSettings({
        mode: 'browser',
        endpoint: '/api/tts',
        apiKey: 'sk-test',
        voice: 'ug-CN-NasirNeural',
      }),
    ).toEqual(DEFAULT_TTS_SETTINGS);
  });
});
