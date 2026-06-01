import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TextInput } from '../src/components/TextInput';

describe('TextInput', () => {
  let rafCallbacks: FrameRequestCallback[];

  beforeEach(() => {
    rafCallbacks = [];
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        rafCallbacks.push(callback);
        return rafCallbacks.length;
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows ULY insertion helpers only for ULY input', () => {
    const { rerender } = render(
      <ControlledTextInput initialValue="" mode="uly" />,
    );

    expect(screen.getByRole('button', { name: 'é' })).toBeInTheDocument();

    rerender(<ControlledTextInput initialValue="" mode="uey" />);

    expect(screen.queryByRole('button', { name: 'é' })).not.toBeInTheDocument();
  });

  it('inserts helper text at the current selection', () => {
    render(<ControlledTextInput initialValue="yak" mode="uly" />);
    const textarea = screen.getByLabelText(/ULY/) as HTMLTextAreaElement;

    textarea.setSelectionRange(1, 2);
    fireEvent.click(screen.getByRole('button', { name: 'é' }));

    expect(textarea).toHaveValue('yék');

    act(() => {
      rafCallbacks.forEach((callback) => callback(0));
    });

    expect(textarea.selectionStart).toBe(2);
    expect(textarea.selectionEnd).toBe(2);
  });

  it('uses Uyghur Arabic input attributes in UEY mode', () => {
    render(<ControlledTextInput initialValue="سالام" mode="uey" />);
    const textarea = screen.getByLabelText(/UEY/);

    expect(textarea).toHaveAttribute('dir', 'rtl');
    expect(textarea).toHaveAttribute('lang', 'ug');
    expect(textarea).toHaveAttribute('placeholder', 'ياخشىمۇسىز...');
  });
});

function ControlledTextInput({
  initialValue,
  mode,
}: {
  initialValue: string;
  mode: 'uey' | 'uly';
}) {
  const [value, setValue] = useState(initialValue);
  return <TextInput mode={mode} value={value} onChange={setValue} />;
}
