import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { QuizPanel } from '../src/components/QuizPanel';

const LEARN_PROGRESS_KEY = 'ugbridge.learnedLetters.v1';

describe('QuizPanel', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('shows letter progress above quick practice', () => {
    render(<QuizPanel />);

    const progressHeading = screen.getByRole('heading', {
      name: 'Letter progress',
    });
    const practiceHeading = screen.getByRole('heading', {
      name: 'Quick practice',
    });

    expect(
      progressHeading.compareDocumentPosition(practiceHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('ignores unknown tokens restored from local learning progress', () => {
    window.localStorage.setItem(
      LEARN_PROGRESS_KEY,
      JSON.stringify(['a', 'ghost-token', 'sh']),
    );

    render(<QuizPanel />);

    expect(screen.getByText('2/32 marked learned')).toBeInTheDocument();
    expect(screen.getByText('1/8')).toBeInTheDocument();
    expect(screen.getByText('1/5')).toBeInTheDocument();
  });
});
