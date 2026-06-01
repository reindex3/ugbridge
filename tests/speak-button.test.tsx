import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SpeakButton } from '../src/components/SpeakButton';
import type { TtsProvider } from '../src/lib/tts';

describe('SpeakButton', () => {
  it('stays disabled when there is no speakable text or TTS is unavailable', () => {
    const tts = createTtsProvider();
    const { rerender } = render(
      <SpeakButton text="   " isAvailable={true} tts={tts} />,
    );

    expect(screen.getByRole('button', { name: 'Speak' })).toBeDisabled();

    rerender(<SpeakButton text="سالام" isAvailable={false} tts={tts} />);

    expect(screen.getByRole('button', { name: 'Speak' })).toBeDisabled();
  });

  it('sends the current UEY text to the TTS provider', async () => {
    const tts = createTtsProvider({
      speak: vi.fn().mockResolvedValue(undefined),
    });

    render(<SpeakButton text="سالام" isAvailable={true} tts={tts} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Speak' }));
    });

    expect(tts.speak).toHaveBeenCalledWith('سالام');
  });

  it('allows stopping while speech is still in progress', async () => {
    let resolveSpeech: () => void = () => {};
    const speaking = new Promise<void>((resolve) => {
      resolveSpeech = resolve;
    });
    const tts = createTtsProvider({
      speak: vi.fn(() => speaking),
      stop: vi.fn(),
    });

    render(<SpeakButton text="سالام" isAvailable={true} tts={tts} />);

    fireEvent.click(screen.getByRole('button', { name: 'Speak' }));

    expect(
      await screen.findByRole('button', { name: 'Stop' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));

    expect(tts.stop).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Speak' })).toBeInTheDocument();

    await act(async () => {
      resolveSpeech();
      await speaking;
    });
  });
});

function createTtsProvider(overrides: Partial<TtsProvider> = {}): TtsProvider {
  return {
    isAvailable: vi.fn(() => true),
    hasUyghurVoice: vi.fn().mockResolvedValue(true),
    speak: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    ...overrides,
  };
}
