import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App';

const KOFI_WIDGET_SCRIPT_URL =
  'https://storage.ko-fi.com/cdn/scripts/overlay-widget.js';

describe('App conversion workflow', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.pushState({}, '', '/');
    (
      window as Window & {
        __ugbridgeKoFiWidgetDrawn?: boolean;
        kofiWidgetOverlay?: unknown;
      }
    ).__ugbridgeKoFiWidgetDrawn = false;
    delete (
      window as Window & {
        __ugbridgeKoFiWidgetDrawn?: boolean;
        kofiWidgetOverlay?: unknown;
      }
    ).kofiWidgetOverlay;
    document
      .querySelectorAll(`script[src="${KOFI_WIDGET_SCRIPT_URL}"]`)
      .forEach((script) => script.remove());
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

  it('opens a shared reader URL with its text restored', async () => {
    window.history.pushState(
      {},
      '',
      '/?view=reader&text=%D8%B3%D8%A7%D9%84%D8%A7%D9%85+%D9%83%D9%89%D8%AA%D8%A7%D8%A8',
    );

    render(<App />);

    expect(screen.getAllByText('Reader').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Reader text')).toHaveValue('سالام كىتاب');
    expect(screen.getAllByText('salam kitab').length).toBeGreaterThan(0);
    expect(await screen.findByText('hello')).toBeInTheDocument();
    expect(await screen.findByText('book')).toBeInTheDocument();
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

  it('copies a share link with reader text', async () => {
    window.history.pushState({}, '', '/?view=reader&text=سالام');
    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining(
        '?view=reader&text=%D8%B3%D8%A7%D9%84%D8%A7%D9%85',
      ),
    );
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

  it('opens image OCR from the converter toolbar', () => {
    window.history.pushState({}, '', '/?view=convert');
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Image OCR' }));

    expect(screen.getByText('Image OCR ready')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Recognize UEY' }),
    ).toBeInTheDocument();
  });

  it('saves Reader words for local review', async () => {
    window.history.pushState(
      {},
      '',
      '/?view=reader&text=%D8%B3%D8%A7%D9%84%D8%A7%D9%85+%D9%83%D9%89%D8%AA%D8%A7%D8%A8',
    );
    render(<App />);

    expect(await screen.findByText('hello')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'Save salam for review' }),
    );

    expect(screen.getByText('salam saved for review')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'salam saved for review' }),
    ).toBeDisabled();
    expect(
      JSON.parse(
        window.localStorage.getItem('ugbridge.study.progress.v1') ?? '[]',
      ),
    ).toMatchObject([
      {
        token: 'salam',
        mastered: false,
        reviewCount: 1,
      },
    ]);
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

  it('loads the Ko-fi widget with a footer support fallback', async () => {
    render(<App />);

    expect(
      screen.getByRole('link', { name: 'Support UG Bridge' }),
    ).toHaveAttribute('href', 'https://ko-fi.com/reindex33');
    await waitFor(() => {
      expect(
        document.querySelector(`script[src="${KOFI_WIDGET_SCRIPT_URL}"]`),
      ).toBeInTheDocument();
    });
  });

  it('draws a compact Ko-fi floating widget when the overlay is ready', async () => {
    const draw = vi.fn();
    (
      window as Window & {
        kofiWidgetOverlay?: {
          draw: ReturnType<typeof vi.fn>;
        };
      }
    ).kofiWidgetOverlay = { draw };

    render(<App />);

    await waitFor(() => {
      expect(draw).toHaveBeenCalledWith(
        'reindex33',
        expect.objectContaining({
          type: 'floating-chat',
          'floating-chat.cssId': 'ugbridge-kofi',
          'floating-chat.donateButton.text': 'Support',
          'floating-chat.donateButton.background-color': '#72a4f2',
          'floating-chat.donateButton.text-color': '#ffffff',
        }),
      );
    });
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
