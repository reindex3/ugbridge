import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AlphabetPanel } from '../../src/components/AlphabetPanel';

describe('AlphabetPanel', () => {
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
