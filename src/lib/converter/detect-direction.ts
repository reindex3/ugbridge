import {
  UEY_PUNCTUATION_TO_LATIN,
  UEY_TO_ULY,
} from './mapping-table';

export type DetectedConversionDirection = 'uey-to-uly' | 'uly-to-uey';

export interface DirectionDetection {
  direction: DetectedConversionDirection | null;
  confidence: 'none' | 'low' | 'high';
  reason: string;
}

const ULY_STRONG_SIGNALS = /(?:gh|ng|sh|ch|zh|[éëöü])/i;
const LATIN_LETTER = /[A-Za-zéëöü]/;

export function detectConversionDirection(text: string): DirectionDetection {
  const trimmed = text.trim();

  if (!trimmed) {
    return {
      direction: null,
      confidence: 'none',
      reason: 'Empty input',
    };
  }

  let ueyCount = 0;
  let latinCount = 0;

  for (const char of trimmed) {
    if (char in UEY_TO_ULY || char in UEY_PUNCTUATION_TO_LATIN) {
      ueyCount += 1;
    } else if (LATIN_LETTER.test(char)) {
      latinCount += 1;
    }
  }

  if (ueyCount > 0 && ueyCount >= latinCount) {
    return {
      direction: 'uey-to-uly',
      confidence: 'high',
      reason: 'Uyghur Arabic letters detected',
    };
  }

  if (latinCount > 0 && ULY_STRONG_SIGNALS.test(trimmed)) {
    return {
      direction: 'uly-to-uey',
      confidence: 'high',
      reason: 'ULY-specific Latin letters or digraphs detected',
    };
  }

  if (latinCount > 0 && ueyCount === 0) {
    return {
      direction: 'uly-to-uey',
      confidence: 'low',
      reason: 'Latin text detected',
    };
  }

  return {
    direction: null,
    confidence: 'none',
    reason: 'No script signal detected',
  };
}
