import { render, screen } from '@testing-library/react';
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
});
