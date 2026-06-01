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
});

function getConversionInput() {
  const input = document.querySelector<HTMLTextAreaElement>('#text-input');
  expect(input).not.toBeNull();
  return input!;
}
