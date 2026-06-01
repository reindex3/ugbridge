import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useTtsStatus } from '../src/hooks/useTtsStatus';
import type { TtsProvider } from '../src/lib/tts';

describe('useTtsStatus', () => {
  it('treats failed voice detection as no Uyghur voice', async () => {
    const tts = createTtsProvider({
      hasUyghurVoice: vi.fn().mockRejectedValue(new Error('voice probe failed')),
    });

    render(<TtsStatusProbe tts={tts} />);

    expect(await screen.findByText('available:false')).toBeInTheDocument();
  });
});

function TtsStatusProbe({ tts }: { tts: TtsProvider }) {
  const { isAvailable, hasUyghurVoice } = useTtsStatus(tts);

  return (
    <div>
      {isAvailable ? 'available' : 'unavailable'}:{String(hasUyghurVoice)}
    </div>
  );
}

function createTtsProvider(overrides: Partial<TtsProvider> = {}): TtsProvider {
  return {
    isAvailable: vi.fn(() => true),
    hasUyghurVoice: vi.fn().mockResolvedValue(true),
    speak: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    ...overrides,
  };
}
