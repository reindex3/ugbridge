export type TtsMode = 'browser' | 'api';

export interface TtsSettings {
  mode: TtsMode;
  endpoint: string;
  apiKey: string;
  voice: string;
}

const STORAGE_KEY = 'ulybridge.tts.settings.v1';

export const DEFAULT_TTS_VOICE = 'ug-CN-YilianNeural';

export const DEFAULT_TTS_SETTINGS: TtsSettings = {
  mode: 'browser',
  endpoint: '',
  apiKey: '',
  voice: DEFAULT_TTS_VOICE,
};

export function loadTtsSettings(): TtsSettings {
  if (typeof window === 'undefined') return DEFAULT_TTS_SETTINGS;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_TTS_SETTINGS;
    return normalizeTtsSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_TTS_SETTINGS;
  }
}

export function saveTtsSettings(settings: TtsSettings): TtsSettings {
  const normalized = normalizeTtsSettings(settings);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  }
  return normalized;
}

export function clearTtsSettings(): TtsSettings {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  return DEFAULT_TTS_SETTINGS;
}

export function normalizeTtsSettings(value: unknown): TtsSettings {
  const source = value && typeof value === 'object' ? value : {};
  const record = source as Partial<Record<keyof TtsSettings, unknown>>;

  const mode = record.mode === 'api' ? 'api' : 'browser';
  const endpoint =
    typeof record.endpoint === 'string' ? record.endpoint.trim() : '';
  const apiKey =
    typeof record.apiKey === 'string' ? record.apiKey.trim() : '';
  const voice =
    typeof record.voice === 'string' && record.voice.trim()
      ? record.voice.trim()
      : DEFAULT_TTS_VOICE;

  if (mode !== 'api' || !endpoint) {
    return DEFAULT_TTS_SETTINGS;
  }

  return {
    mode: 'api',
    endpoint,
    apiKey,
    voice,
  };
}
