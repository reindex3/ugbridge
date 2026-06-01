import { useState } from 'react';
import { Square, Volume2 } from 'lucide-react';
import type { TtsProvider } from '../lib/tts';

interface SpeakButtonProps {
  text: string;
  isAvailable: boolean;
  tts: TtsProvider;
}

export function SpeakButton({ text, isAvailable, tts }: SpeakButtonProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleClick = async () => {
    if (isSpeaking) {
      tts.stop();
      setIsSpeaking(false);
      return;
    }
    setIsSpeaking(true);
    try {
      await tts.speak(text);
    } catch (err) {
      console.error('TTS error:', err);
    } finally {
      setIsSpeaking(false);
    }
  };

  const disabled = !text.trim() || !isAvailable;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-xs transition hover:bg-indigo-700 hover:shadow-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-300 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
    >
      {isSpeaking ? (
        <>
          <Square className="h-4 w-4" aria-hidden="true" />
          Stop
        </>
      ) : (
        <>
          <Volume2 className="h-4 w-4" aria-hidden="true" />
          Speak
        </>
      )}
    </button>
  );
}
