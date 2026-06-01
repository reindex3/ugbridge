import { describe, expect, it } from 'vitest';
import {
  addConversionHistoryEntry,
  type ConversionHistoryEntry,
  normalizeConversionHistory,
} from '../src/lib/conversion-history';

describe('conversion history', () => {
  it('normalizes invalid stored values to an empty list', () => {
    expect(normalizeConversionHistory(null)).toEqual([]);
    expect(normalizeConversionHistory([{ input: 'salam' }])).toEqual([]);
    expect(
      normalizeConversionHistory([
        {
          direction: 'invalid',
          input: 'salam',
          output: 'سالام',
        },
      ]),
    ).toEqual([]);
  });

  it('adds newest entries first', () => {
    const history = addConversionHistoryEntry([], {
      direction: 'uly-to-uey',
      input: 'salam',
      output: 'سالام',
      now: 1,
    });

    expect(history).toEqual([
      {
        id: 'uly-to-uey:salam',
        direction: 'uly-to-uey',
        input: 'salam',
        output: 'سالام',
        updatedAt: 1,
      },
    ]);
  });

  it('deduplicates by direction and input', () => {
    const first = addConversionHistoryEntry([], {
      direction: 'uly-to-uey',
      input: 'salam',
      output: 'سالام',
      now: 1,
    });
    const second = addConversionHistoryEntry(first, {
      direction: 'uly-to-uey',
      input: 'salam',
      output: 'سالام',
      now: 2,
    });

    expect(second).toHaveLength(1);
    expect(second[0].updatedAt).toBe(2);
  });

  it('keeps at most six entries', () => {
    const history = Array.from({ length: 8 }).reduce<ConversionHistoryEntry[]>(
      (items, _, index) =>
        addConversionHistoryEntry(items, {
          direction: 'uly-to-uey',
          input: `text ${index}`,
          output: `تېكىست ${index}`,
          now: index,
        }),
      [],
    );

    expect(history).toHaveLength(6);
    expect(history[0].input).toBe('text 7');
    expect(history[5].input).toBe('text 2');
  });
});
