import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';

describe('App conversion workflow', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.pushState({}, '', '/');
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('opens a shared convert URL with its query and direction restored', () => {
    window.history.pushState(
      {},
      '',
      '/?view=convert&d=uly-to-uey&q=salam',
    );

    render(<App />);

    expect(getConversionInput()).toHaveValue('salam');
    expect(screen.getAllByText('سالام').length).toBeGreaterThan(0);
    expect(
      screen.getByRole('button', {
        name: /Currently ULY to UEY/i,
      }),
    ).toBeInTheDocument();
  });

  it('opens a shared convert URL with text and lookup restored', () => {
    window.history.pushState(
      {},
      '',
      '/?view=convert&d=uly-to-uey&text=salam&lookup=salam',
    );

    render(<App />);

    expect(getConversionInput()).toHaveValue('salam');
    expect(screen.getAllByText('سالام').length).toBeGreaterThan(0);
    expect(screen.getByText('Dictionary lookup:')).toBeInTheDocument();
    expect(screen.getByLabelText('Dictionary search')).toHaveValue('salam');
  });

  it('opens a shared dictionary URL with its query restored', () => {
    window.history.pushState({}, '', '/?dict=yaxshi');

    render(<App />);

    expect(screen.getByText('Local dictionary')).toBeInTheDocument();
    expect(screen.getByLabelText('Dictionary search')).toHaveValue('yaxshi');
    expect(new URLSearchParams(window.location.search).get('dict')).toBe(
      'yaxshi',
    );
  });

  it('detects strong ULY input and converts it to UEY', () => {
    window.history.pushState({}, '', '/?view=convert');
    render(<App />);

    fireEvent.change(getConversionInput(), {
      target: { value: 'yaxshi' },
    });

    expect(screen.getByText('Detected ULY input')).toBeInTheDocument();
    expect(screen.getAllByText('ياخشى').length).toBeGreaterThan(0);
    expect(
      screen.getByRole('button', {
        name: /Currently ULY to UEY/i,
      }),
    ).toBeInTheDocument();
  });

  it('shows a low-confidence hint for plain Latin text', () => {
    window.history.pushState({}, '', '/?view=convert');
    render(<App />);

    fireEvent.change(getConversionInput(), {
      target: { value: 'hello' },
    });

    expect(screen.getByText('Latin text detected')).toBeInTheDocument();
  });

  it('opens inline dictionary lookup from converted words', () => {
    window.history.pushState({}, '', '/?view=convert');
    render(<App />);

    fireEvent.change(getConversionInput(), {
      target: { value: 'سالام كىتاب' },
    });
    fireEvent.click(
      screen.getByRole('button', {
        name: /Look up salam in dictionary/i,
      }),
    );

    expect(screen.getByText('Dictionary lookup:')).toBeInTheDocument();
    expect(screen.getByLabelText('Dictionary search')).toHaveValue('salam');
  });

  it('copies a share link with the current text and lookup query', async () => {
    window.history.pushState({}, '', '/?view=convert');
    render(<App />);

    fireEvent.change(getConversionInput(), {
      target: { value: 'سالام كىتاب' },
    });
    fireEvent.click(
      screen.getByRole('button', {
        name: /Look up salam in dictionary/i,
      }),
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining(
        '?view=convert&d=uey-to-uly&text=%D8%B3%D8%A7%D9%84%D8%A7%D9%85+%D9%83%D9%89%D8%AA%D8%A7%D8%A8&lookup=salam',
      ),
    );
  });

  it('copies a share link with a dictionary query', async () => {
    window.history.pushState({}, '', '/?dict=yaxshi');
    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('/?dict=yaxshi'),
    );
    expect(screen.getByText('Share link copied')).toBeInTheDocument();
  });

  it('keeps the current convert state in the URL', () => {
    window.history.pushState({}, '', '/?view=convert');
    render(<App />);

    fireEvent.change(getConversionInput(), {
      target: { value: 'سالام' },
    });

    const params = new URLSearchParams(window.location.search);
    expect(params.get('view')).toBe('convert');
    expect(params.get('d')).toBe('uey-to-uly');
    expect(params.get('text')).toBe('سالام');
  });

  it('opens the converter with Ctrl Enter and infers Latin input direction', () => {
    window.history.pushState({}, '', '/?view=dictionary&q=salam');
    render(<App />);

    fireEvent.keyDown(window, { key: 'Enter', ctrlKey: true });

    expect(getConversionInput()).toHaveValue('salam');
    expect(screen.getAllByText('سالام').length).toBeGreaterThan(0);
    expect(
      screen.getByRole('button', {
        name: /Currently ULY to UEY/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Converter opened')).toBeInTheDocument();
  });

  it('uses Escape to hide inline lookup before clearing text', () => {
    window.history.pushState(
      {},
      '',
      '/?view=convert&d=uly-to-uey&text=salam&lookup=salam',
    );
    render(<App />);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.queryByText('Dictionary lookup:')).not.toBeInTheDocument();
    expect(getConversionInput()).toHaveValue('salam');
    expect(screen.getByText('Lookup hidden')).toBeInTheDocument();
  });

  it('shows feedback when copying converted text is blocked', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn().mockRejectedValue(new Error('blocked')),
      },
    });
    window.history.pushState({}, '', '/?view=convert');
    render(<App />);

    fireEvent.change(getConversionInput(), {
      target: { value: 'سالام' },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy ULY' }));
    });

    expect(screen.getByText('Clipboard copy blocked')).toBeInTheDocument();
  });

  it('shows feedback when clipboard copy is unavailable', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });
    window.history.pushState({}, '', '/?view=convert');
    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    });

    expect(screen.getByText('Clipboard copy unavailable')).toBeInTheDocument();
  });

  it('uses the current output as the new input when swapping direction', () => {
    window.history.pushState({}, '', '/?view=convert');
    render(<App />);

    fireEvent.change(getConversionInput(), {
      target: { value: 'سالام' },
    });
    fireEvent.click(
      screen.getByRole('button', {
        name: /Currently UEY to ULY/i,
      }),
    );

    expect(getConversionInput()).toHaveValue('salam');
    expect(screen.getAllByText('سالام').length).toBeGreaterThan(0);
    expect(
      screen.getByRole('button', {
        name: /Currently ULY to UEY/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Direction swapped')).toBeInTheDocument();
  });

  it('cycles theme mode with a single slider control', () => {
    render(<App />);

    const getThemeToggle = () =>
      screen.getByRole('button', { name: /Theme mode:/i });

    expect(getThemeToggle()).toHaveAccessibleName(/Theme mode: System/i);

    fireEvent.click(getThemeToggle());
    expect(getThemeToggle()).toHaveAccessibleName(/Theme mode: Day/i);

    fireEvent.click(getThemeToggle());
    expect(getThemeToggle()).toHaveAccessibleName(/Theme mode: Night/i);
  });

  it('shows dictionary search on the home page', () => {
    render(<App />);

    expect(screen.getByLabelText('Dictionary search')).toBeInTheDocument();
  });

  it('shows local study profile data on the home page', () => {
    window.localStorage.setItem(
      'ugbridge.dictionary.lookups.v1',
      JSON.stringify([
        {
          id: 'yaxshi',
          query: 'good',
          uey: 'ياخشى',
          uly: 'yaxshi',
          definition: 'good',
          count: 2,
          updatedAt: 2,
        },
      ]),
    );
    window.localStorage.setItem(
      'ugbridge.quiz.progress.v1',
      JSON.stringify({
        answered: 4,
        correct: 3,
        currentStreak: 1,
        bestStreak: 2,
        updatedAt: 2,
        missedItems: [
          {
            id: 'ng:final',
            token: 'ng',
            form: 'final',
            missed: 1,
            updatedAt: 2,
          },
        ],
      }),
    );
    window.localStorage.setItem(
      'ugbridge.study.progress.v1',
      JSON.stringify([
        {
          id: 'yaxshi',
          token: 'yaxshi',
          mastered: true,
          reviewCount: 0,
          updatedAt: 3,
        },
      ]),
    );

    render(<App />);

    const profileHeading = screen.getByRole('heading', {
      name: 'Local study profile',
    });
    const heroHeading = screen.getByRole('heading', {
      name: 'Convert, search, and study Uyghur across UEY and ULY.',
    });
    const dictionaryHeading = screen.getByRole('heading', {
      name: 'Dictionary',
    });

    expect(profileHeading).toBeInTheDocument();
    expect(
      screen.getByText(/To avoid retaining study data on a backend/),
    ).toBeInTheDocument();
    expect(
      heroHeading.compareDocumentPosition(profileHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      profileHeading.compareDocumentPosition(dictionaryHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByText('75% correct · best streak 2')).toBeInTheDocument();
    expect(screen.getByText('ng · final')).toBeInTheDocument();
    expect(screen.getByText('Study mastered')).toBeInTheDocument();
    expect(screen.getByText('Last studied yaxshi')).toBeInTheDocument();
    expect(screen.getByTitle('yaxshi · good')).toBeInTheDocument();
  });
});

function getConversionInput() {
  const input = document.querySelector<HTMLTextAreaElement>('#text-input');
  expect(input).not.toBeNull();
  return input!;
}
