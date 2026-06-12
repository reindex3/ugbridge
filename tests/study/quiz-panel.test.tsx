import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { QuizPanel } from '../../src/components/QuizPanel';
import { ALPHABET_STUDY_ENTRIES } from '../../src/lib/converter';

const LEARN_PROGRESS_KEY = 'ugbridge.learnedLetters.v1';
const QUIZ_PROGRESS_KEY = 'ugbridge.quiz.progress.v1';

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
    expect(
      screen.getByText(`${ALPHABET_STUDY_ENTRIES.length * 4} forms · Score 0`),
    ).toBeInTheDocument();
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
    expect(screen.getByText('8 forms · Score 0')).toBeInTheDocument();
  });

  it('shows saved local quiz progress', () => {
    window.localStorage.setItem(
      QUIZ_PROGRESS_KEY,
      JSON.stringify({
        answered: 8,
        correct: 6,
        currentStreak: 1,
        bestStreak: 3,
        updatedAt: 1,
        missedItems: [
          {
            id: 'sh:medial',
            token: 'sh',
            form: 'medial',
            missed: 2,
            updatedAt: 1,
          },
        ],
      }),
    );

    render(<QuizPanel />);

    expect(
      screen.getByText('8 answered · 75% correct · best streak 3'),
    ).toBeInTheDocument();
    expect(screen.getByText('sh · medial · 2 missed')).toBeInTheDocument();
  });

  it('switches to UEY/ULY mini quiz mode', () => {
    render(<QuizPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'UEY/ULY' }));

    expect(screen.getByText('Pick the matching UEY form.')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Shuffle practice set' }),
    ).toBeInTheDocument();
  });

  it('starts review from saved missed forms', () => {
    window.localStorage.setItem(
      QUIZ_PROGRESS_KEY,
      JSON.stringify({
        answered: 2,
        correct: 1,
        currentStreak: 0,
        bestStreak: 1,
        updatedAt: 1,
        missedItems: [
          {
            id: 'a:isolated',
            token: 'a',
            form: 'isolated',
            missed: 1,
            updatedAt: 1,
          },
        ],
      }),
    );

    render(<QuizPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'Review missed' }));

    expect(screen.getByText('Review 1 / 1')).toBeInTheDocument();
    expect(screen.getByText('Review saved missed forms.')).toBeInTheDocument();
  });
});
