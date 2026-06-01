import { describe, expect, it } from 'vitest';
import { traceUeyToUly, traceUlyToUey } from '../src/lib/converter';

describe('conversion trace', () => {
  it('marks word-initial vowels with hamza', () => {
    const trace = traceUlyToUey('alma');
    expect(trace.output).toBe('ئالما');
    expect(trace.segments[0]).toMatchObject({
      source: 'a',
      output: 'ئا',
      kind: 'hamza-vowel',
    });
  });

  it('keeps digraphs as one learning segment', () => {
    const trace = traceUlyToUey('yaxshi');
    expect(trace.output).toBe('ياخشى');
    expect(trace.segments).toContainEqual(
      expect.objectContaining({
        source: 'sh',
        output: 'ش',
        kind: 'digraph',
      }),
    );
  });

  it('normalizes ë trace labels to standard é', () => {
    const trace = traceUlyToUey('mën');
    expect(trace.output).toBe('مېن');
    expect(trace.segments[1]).toMatchObject({
      source: 'ë',
      canonicalSource: 'é',
      output: 'ې',
    });
  });

  it('traces ULY apostrophe as in-word hamza', () => {
    const trace = traceUlyToUey("sa'et");

    expect(trace.output).toBe('سائەت');
    expect(trace.segments).toContainEqual(
      expect.objectContaining({
        source: "'",
        output: 'ئ',
        kind: 'hamza',
      }),
    );
  });

  it('traces in-word hamza as ULY apostrophe', () => {
    const trace = traceUeyToUly('سائەت');

    expect(trace.output).toBe("sa'et");
    expect(trace.segments).toContainEqual(
      expect.objectContaining({
        source: 'ئ',
        output: "'",
        kind: 'hamza',
      }),
    );
  });
});
