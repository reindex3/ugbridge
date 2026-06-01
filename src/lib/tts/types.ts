export interface TtsProvider {
  isAvailable(): boolean;
  hasUyghurVoice(): Promise<boolean>;
  speak(text: string): Promise<void>;
  stop(): void;
}
