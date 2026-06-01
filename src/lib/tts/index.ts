import { WebSpeechTts } from './web-speech';
import { EdgeTtsProvider } from './edge-tts';
import type { TtsProvider } from './types';
import type { TtsSettings } from './settings';

export type { TtsProvider } from './types';
export { WebSpeechTts } from './web-speech';
export { EdgeTtsProvider } from './edge-tts';
export type { TtsSettings } from './settings';

const TTS_ENDPOINT = import.meta.env.VITE_TTS_ENDPOINT;

let cached: TtsProvider | null = null;

export function getTtsProvider(): TtsProvider {
  if (!cached) {
    cached = TTS_ENDPOINT ? new EdgeTtsProvider(TTS_ENDPOINT) : new WebSpeechTts();
  }
  return cached;
}

export function createTtsProvider(settings?: TtsSettings): TtsProvider {
  if (settings?.mode === 'api' && settings.endpoint) {
    return new EdgeTtsProvider(settings.endpoint, {
      apiKey: settings.apiKey,
      voice: settings.voice,
    });
  }

  return getTtsProvider();
}
