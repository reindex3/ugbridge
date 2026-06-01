import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TtsSettingsPanel } from '../src/components/TtsSettingsPanel';
import {
  DEFAULT_TTS_SETTINGS,
  DEFAULT_TTS_VOICE,
  type TtsSettings,
} from '../src/lib/tts/settings';

describe('TtsSettingsPanel', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('enables API settings and saves the selected preset', () => {
    const onChange = vi.fn();
    renderPanel({ onChange });

    fireEvent.click(screen.getByRole('button', { name: 'TTS API' }));

    expect(screen.getByLabelText('Endpoint')).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Custom API' }));
    fireEvent.change(screen.getByLabelText('Preset'), {
      target: { value: 'local-mms' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    expect(onChange).toHaveBeenCalledWith({
      mode: 'api',
      endpoint: 'http://127.0.0.1:7861/api/tts',
      apiKey: '',
      voice: DEFAULT_TTS_VOICE,
    });
    expect(screen.getByText('Saved')).toBeInTheDocument();
  });

  it('resets custom API settings back to browser speech', () => {
    const onChange = vi.fn();
    renderPanel({
      settings: {
        mode: 'api',
        endpoint: '/api/tts',
        apiKey: 'secret',
        voice: 'ug-CN-NasirNeural',
      },
      onChange,
    });

    fireEvent.click(screen.getByRole('button', { name: 'TTS API' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));

    expect(onChange).toHaveBeenCalledWith(DEFAULT_TTS_SETTINGS);
    expect(screen.getByLabelText('Endpoint')).toBeDisabled();
  });

  it('closes the panel when Escape is pressed', () => {
    renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'TTS API' }));
    expect(screen.getByLabelText('Endpoint')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByLabelText('Endpoint')).not.toBeInTheDocument();
  });
});

function renderPanel({
  settings = DEFAULT_TTS_SETTINGS,
  onChange = vi.fn(),
}: {
  settings?: TtsSettings;
  onChange?: (settings: TtsSettings) => void;
} = {}) {
  render(<TtsSettingsPanel settings={settings} onChange={onChange} />);
}
