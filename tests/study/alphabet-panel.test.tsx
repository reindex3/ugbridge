import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AlphabetPanel } from '../../src/components/AlphabetPanel';

describe('AlphabetPanel', () => {
  it('visually distinguishes vowels in the alphabet grid', () => {
    render(<AlphabetPanel />);

    const vowelButton = screen.getByText('a').closest('button');
    const consonantButton = screen.getByText('b').closest('button');

    expect(vowelButton).toHaveClass('bg-emerald-50', 'ring-emerald-200');
    expect(consonantButton).toHaveClass('bg-slate-50', 'ring-slate-200');
  });

  it('renders a word-initial vowel carrier and vowel as one highlighted segment', () => {
    render(<AlphabetPanel />);

    const aButton = screen.getByText('a').closest('button');
    expect(aButton).not.toBeNull();

    fireEvent.click(aButton!);

    const highlights = screen.getAllByTitle('word-initial: ئا');
    expect(highlights.length).toBeGreaterThan(0);
    expect(highlights.every((highlight) => highlight.textContent === 'ئا')).toBe(
      true,
    );
  });
});
