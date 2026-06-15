import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LearnPanel } from '../../src/components/LearnPanel';
import { traceConversion } from '../../src/lib/converter';

describe('LearnPanel', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('does not show letter progress in the learn reference view', () => {
    render(
      <LearnPanel
        trace={traceConversion('', 'uly-to-uey')}
        value=""
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'ULY to UEY + IPA reference' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Letter progress' }),
    ).not.toBeInTheDocument();
  });

  it('labels vowels in the UEY letter breakdown', () => {
    render(
      <LearnPanel
        trace={traceConversion('yaxshi', 'uly-to-uey')}
        value="yaxshi"
        onChange={vi.fn()}
      />,
    );

    expect(screen.getAllByText('vowel').length).toBeGreaterThan(0);
  });

  it('makes vowel highlights prominent in breakdown and word shape views', () => {
    render(
      <LearnPanel
        trace={traceConversion('yaxshimisiz', 'uly-to-uey')}
        value="yaxshimisiz"
        onChange={vi.fn()}
      />,
    );

    const breakdownVowelTile = screen.getAllByText('vowel')[0].closest('div');
    expect(breakdownVowelTile).toHaveClass(
      'border-2',
      'bg-emerald-100',
      'ring-2',
    );

    const wordShape = screen
      .getByRole('heading', { name: 'Word shape study' })
      .closest('section');
    expect(wordShape).not.toBeNull();

    const vowelCell = within(wordShape!)
      .getByText('a')
      .closest('dl')?.parentElement;
    const consonantCell = within(wordShape!)
      .getByText('x')
      .closest('dl')?.parentElement;

    expect(vowelCell).toHaveClass('bg-emerald-100', 'ring-2', 'ring-inset');
    expect(consonantCell).toHaveClass('bg-white');
    expect(consonantCell).not.toHaveClass('ring-2');
  });

  it('keeps reference tiles neutral and in UEY alphabet order', () => {
    render(
      <LearnPanel
        trace={traceConversion('', 'uly-to-uey')}
        value=""
        onChange={vi.fn()}
      />,
    );

    const reference = screen
      .getByRole('heading', { name: 'ULY to UEY + IPA reference' })
      .closest('section');
    expect(reference).not.toBeNull();

    const digraphTile = within(reference!).getByText('ch').parentElement;
    const vowelTile = within(reference!).getByText('a').parentElement;
    const plainTile = within(reference!).getByText('b').parentElement;
    const eTile = within(reference!).getByText('e').parentElement;
    const precedes = (before: Element, after: Element) =>
      Boolean(
        before.compareDocumentPosition(after) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      );

    expect(precedes(vowelTile!, eTile!)).toBe(true);
    expect(precedes(eTile!, plainTile!)).toBe(true);
    expect(precedes(plainTile!, digraphTile!)).toBe(true);
    expect(digraphTile).toHaveClass('bg-white', 'ring-1');
    expect(vowelTile).toHaveClass('bg-white', 'ring-1');
    expect(plainTile).toHaveClass('bg-white', 'ring-1');
    expect(digraphTile).not.toHaveClass('border-2');
    expect(vowelTile).not.toHaveClass('border-2');
    expect(plainTile).not.toHaveClass('border-2');
  });

  it('labels word-initial hamza carriers without yellow highlighting', () => {
    render(
      <LearnPanel
        trace={traceConversion('alma', 'uly-to-uey')}
        value="alma"
        onChange={vi.fn()}
      />,
    );

    const carrierTile = screen.getAllByText('hamza carrier')[0].closest('div');
    const initialVowelTile = screen
      .getAllByText('initial vowel')[0]
      .closest('div');

    expect(carrierTile).toHaveClass('bg-slate-50', 'ring-1');
    expect(carrierTile).not.toHaveClass('bg-amber-100', 'ring-2');
    expect(initialVowelTile).toHaveClass('bg-emerald-100', 'ring-2');
  });

  it('saves word study progress locally', () => {
    render(
      <LearnPanel
        trace={traceConversion('yaxshi', 'uly-to-uey')}
        value="yaxshi"
        onChange={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Mark yaxshi mastered' }),
    );

    expect(screen.getByText('Mastered 1/1')).toBeInTheDocument();
    expect(
      JSON.parse(
        window.localStorage.getItem('ugbridge.study.progress.v1') ?? '[]',
      ),
    ).toMatchObject([
      {
        token: 'yaxshi',
        mastered: true,
      },
    ]);
  });
});
