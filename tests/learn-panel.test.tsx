import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LearnPanel } from '../src/components/LearnPanel';
import { traceConversion } from '../src/lib/converter';

describe('LearnPanel', () => {
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

  it('makes digraph and vowel reference tiles visually prominent', () => {
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

    expect(digraphTile).toHaveClass('border-2', 'bg-indigo-100', 'ring-2');
    expect(vowelTile).toHaveClass('border-2', 'bg-emerald-100', 'ring-2');
    expect(plainTile).toHaveClass('bg-white', 'ring-1');
    expect(plainTile).not.toHaveClass('border-2');
  });
});
