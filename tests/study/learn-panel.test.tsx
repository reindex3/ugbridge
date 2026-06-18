import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LearnPanel } from '../../src/components/LearnPanel';
import {
  ALPHABET_STUDY_ENTRIES,
  traceConversion,
  ulyTokenToIpa,
} from '../../src/lib/converter';

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

    const breakdown = screen
      .getByRole('heading', { name: 'UEY letters to ULY and IPA' })
      .closest('section');
    expect(breakdown).not.toBeNull();
    expect(
      within(breakdown!).getByLabelText('Learn letter highlight legend'),
    ).toHaveTextContent('vowelinitial vowelhamza carrier');
    expect(within(breakdown!).getAllByText('vowel').length).toBeGreaterThan(1);
  });

  it('makes vowel highlights prominent in breakdown and word shape views', () => {
    render(
      <LearnPanel
        trace={traceConversion('yaxshimisiz', 'uly-to-uey')}
        value="yaxshimisiz"
        onChange={vi.fn()}
      />,
    );

    const breakdown = screen
      .getByRole('heading', { name: 'UEY letters to ULY and IPA' })
      .closest('section');
    expect(breakdown).not.toBeNull();

    const breakdownVowelTile = within(breakdown!)
      .getAllByText('vowel')
      .find((node) => node.closest('div')?.className.includes('border-2'))
      ?.closest('div');
    expect(breakdownVowelTile).not.toBeUndefined();
    expect(breakdownVowelTile).toHaveClass(
      'border-2',
      'bg-emerald-100',
      'ring-2',
    );

    const wordShape = screen
      .getByRole('heading', { name: 'Word shape study' })
      .closest('section');
    expect(wordShape).not.toBeNull();
    expect(
      within(wordShape!).getByLabelText('Learn word highlight legend'),
    ).toHaveTextContent('vowelinitial vowelhamza carrier');
    expect(within(wordShape!).getByLabelText('Learn form legend')).toHaveTextContent(
      'initialmedialfinalisolated',
    );

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

  it('aligns the reference tiles with the Alphabet grid', () => {
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
    const iTile = within(reference!).getByText('i').parentElement;
    const oTile = within(reference!).getByText('o').parentElement;
    const plainTile = within(reference!).getByText('b').parentElement;
    const eTile = within(reference!).getByText('e').parentElement;
    const eyTile = within(reference!).getByText('é').parentElement;
    const precedes = (before: Element, after: Element) =>
      Boolean(
        before.compareDocumentPosition(after) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      );

    expect(precedes(vowelTile!, eTile!)).toBe(true);
    expect(precedes(eTile!, eyTile!)).toBe(true);
    expect(precedes(eyTile!, iTile!)).toBe(true);
    expect(precedes(iTile!, oTile!)).toBe(true);
    expect(precedes(oTile!, plainTile!)).toBe(true);
    expect(precedes(plainTile!, digraphTile!)).toBe(true);
    expect(vowelTile).toHaveClass('bg-emerald-100', 'ring-2');
    expect(plainTile).toHaveClass('bg-sky-100', 'ring-2');
    expect(digraphTile).toHaveClass('bg-violet-100', 'ring-2');
    expect(within(vowelTile!).getByText('ئا')).toBeInTheDocument();
    expect(within(eyTile!).getByText('ئې')).toBeInTheDocument();

    for (const entry of ALPHABET_STUDY_ENTRIES) {
      const tile = within(reference!).getByText(entry.token).parentElement;
      expect(tile, entry.token).toHaveTextContent(entry.displayUey);
      expect(tile, entry.token).toHaveTextContent(
        `/${ulyTokenToIpa(entry.token)}/`,
      );
    }
  });

  it('labels word-initial hamza carriers without yellow highlighting', () => {
    render(
      <LearnPanel
        trace={traceConversion('alma', 'uly-to-uey')}
        value="alma"
        onChange={vi.fn()}
      />,
    );

    const breakdown = screen
      .getByRole('heading', { name: 'UEY letters to ULY and IPA' })
      .closest('section');
    expect(breakdown).not.toBeNull();

    const carrierTile = within(breakdown!)
      .getAllByText('hamza carrier')
      .find((node) => node.closest('div')?.className.includes('bg-slate-50'))
      ?.closest('div');
    const initialVowelTile = within(breakdown!)
      .getAllByText('initial vowel')
      .find((node) => node.closest('div')?.className.includes('border-2'))
      ?.closest('div');

    expect(carrierTile).not.toBeUndefined();
    expect(initialVowelTile).not.toBeUndefined();
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
