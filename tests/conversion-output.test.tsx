import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConversionOutput } from '../src/components/ConversionOutput';

describe('ConversionOutput', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('disables copying when there is no converted text', () => {
    render(<ConversionOutput mode="uly" value="" />);

    expect(
      screen.getByRole('button', { name: 'Copy result' }),
    ).toBeDisabled();
    expect(
      screen.getByText('Converted text will appear here…'),
    ).toBeInTheDocument();
  });

  it('copies converted text and resets the copied state', async () => {
    render(<ConversionOutput mode="uly" value="salam" />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy result' }));
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('salam');
    expect(
      screen.getByRole('button', { name: 'Copied!' }),
    ).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(
      screen.getByRole('button', { name: 'Copy result' }),
    ).toBeInTheDocument();
  });

  it('renders IPA hints when provided', () => {
    render(<ConversionOutput mode="uly" value="yaxshi" ipa="jɑχʃi" />);

    expect(
      screen.getByLabelText('International Phonetic Alphabet'),
    ).toHaveTextContent('IPA /jɑχʃi/');
  });
});
