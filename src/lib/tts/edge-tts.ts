import type { TtsProvider } from './types';

const DEFAULT_VOICE = 'ug-CN-YilianNeural';

interface EdgeTtsOptions {
  apiKey?: string;
  voice?: string;
}

export class EdgeTtsProvider implements TtsProvider {
  private currentAudio: HTMLAudioElement | null = null;
  private currentObjectUrl: string | null = null;
  private currentAbort: AbortController | null = null;
  private currentResolver: (() => void) | null = null;
  private voice: string;
  private apiKey: string;

  constructor(
    private endpoint: string,
    options: EdgeTtsOptions = {},
  ) {
    this.voice = options.voice?.trim() || DEFAULT_VOICE;
    this.apiKey = options.apiKey?.trim() || '';
  }

  isAvailable(): boolean {
    return typeof window !== 'undefined' && typeof Audio !== 'undefined';
  }

  async hasUyghurVoice(): Promise<boolean> {
    return true;
  }

  async speak(text: string): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Audio playback not available in this environment');
    }
    const trimmed = text.trim();
    if (!trimmed) return;

    this.stop();

    const abort = new AbortController();
    this.currentAbort = abort;

    let response: Response;
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (this.apiKey) {
        headers.Authorization = `Bearer ${this.apiKey}`;
      }

      response = await fetch(this.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ text: trimmed, voice: this.voice }),
        signal: abort.signal,
      });
    } catch (err) {
      if (abort.signal.aborted) return;
      throw err;
    }

    if (!response.ok) {
      const message = await response
        .text()
        .catch(() => response.statusText);
      throw new Error(
        `TTS request failed (${response.status}): ${message}`,
      );
    }

    const blob = await response.blob();
    if (abort.signal.aborted) return;

    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    this.currentAudio = audio;
    this.currentObjectUrl = url;

    return new Promise<void>((resolve, reject) => {
      this.currentResolver = resolve;

      const cleanup = () => {
        if (this.currentObjectUrl === url) {
          URL.revokeObjectURL(url);
          this.currentObjectUrl = null;
        }
        if (this.currentAudio === audio) {
          this.currentAudio = null;
        }
        this.currentResolver = null;
        this.currentAbort = null;
      };

      audio.onended = () => {
        cleanup();
        resolve();
      };
      audio.onerror = () => {
        cleanup();
        reject(new Error('Audio playback failed'));
      };
      audio.play().catch((err) => {
        cleanup();
        reject(err);
      });
    });
  }

  stop(): void {
    this.currentAbort?.abort();
    if (this.currentAudio) {
      this.currentAudio.pause();
    }
    if (this.currentObjectUrl) {
      URL.revokeObjectURL(this.currentObjectUrl);
      this.currentObjectUrl = null;
    }
    this.currentAudio = null;
    this.currentAbort = null;

    const resolver = this.currentResolver;
    this.currentResolver = null;
    resolver?.();
  }
}
