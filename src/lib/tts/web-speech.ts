import type { TtsProvider } from './types';

const UYGHUR_LANG_PREFIX = 'ug';

function waitForVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    const initial = synth.getVoices();
    if (initial.length > 0) {
      resolve(initial);
      return;
    }
    const handler = () => {
      synth.removeEventListener('voiceschanged', handler);
      resolve(synth.getVoices());
    };
    synth.addEventListener('voiceschanged', handler);
    setTimeout(() => {
      synth.removeEventListener('voiceschanged', handler);
      resolve(synth.getVoices());
    }, 1500);
  });
}

export class WebSpeechTts implements TtsProvider {
  isAvailable(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  private async findUyghurVoice(): Promise<SpeechSynthesisVoice | null> {
    if (!this.isAvailable()) return null;
    const voices = await waitForVoices();
    return (
      voices.find((v) =>
        v.lang.toLowerCase().startsWith(UYGHUR_LANG_PREFIX),
      ) ?? null
    );
  }

  async hasUyghurVoice(): Promise<boolean> {
    const voice = await this.findUyghurVoice();
    return voice !== null;
  }

  async speak(text: string): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Speech synthesis not available in this browser');
    }
    const trimmed = text.trim();
    if (!trimmed) return;

    const voice = await this.findUyghurVoice();
    window.speechSynthesis.cancel();

    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(trimmed);
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else {
        utterance.lang = 'ug-CN';
      }
      utterance.onend = () => resolve();
      utterance.onerror = (event) =>
        reject(new Error(`Speech synthesis failed: ${event.error}`));
      window.speechSynthesis.speak(utterance);
    });
  }

  stop(): void {
    if (this.isAvailable()) {
      window.speechSynthesis.cancel();
    }
  }
}
