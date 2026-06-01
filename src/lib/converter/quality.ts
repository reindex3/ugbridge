import {
  UEY_PUNCTUATION_TO_LATIN,
  UEY_TO_ULY,
} from './mapping-table';
import type {
  DetectedConversionDirection,
  DirectionDetection,
} from './detect-direction';

export interface ConversionQualityHint {
  level: 'info' | 'warning';
  message: string;
  detail: string;
}

const LATIN_LETTER = /[A-Za-zéëöüÉËÖÜ]/;

export function getConversionQualityHints(
  text: string,
  direction: DetectedConversionDirection,
  detection: DirectionDetection,
): ConversionQualityHint[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  let ueyCount = 0;
  let latinCount = 0;

  for (const char of trimmed) {
    if (char in UEY_TO_ULY || char in UEY_PUNCTUATION_TO_LATIN) {
      ueyCount += 1;
    } else if (LATIN_LETTER.test(char)) {
      latinCount += 1;
    }
  }

  const hints: ConversionQualityHint[] = [];

  if (ueyCount > 0 && latinCount > 0) {
    hints.push({
      level: 'warning',
      message: 'Mixed script detected',
      detail: 'UEY and Latin letters are both present; check the direction before copying.',
    });
  }

  if (detection.confidence === 'low' && detection.direction === 'uly-to-uey') {
    hints.push({
      level: 'info',
      message:
        direction === 'uly-to-uey'
          ? 'Low-confidence ULY input'
          : 'Latin text detected',
      detail:
        direction === 'uly-to-uey'
          ? 'Plain Latin text is being treated as ULY; switch direction if this is not Uyghur Latin.'
          : 'This looks like plain Latin text; switch to ULY → UEY if it is Uyghur Latin.',
    });
  }

  if (detection.confidence === 'none' && (ueyCount > 0 || latinCount > 0)) {
    hints.push({
      level: 'info',
      message: 'Weak script signal',
      detail: 'Some characters may pass through unchanged.',
    });
  }

  return hints;
}
