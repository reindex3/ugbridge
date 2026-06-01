import {
  LATIN_PUNCTUATION_TO_UEY,
  UEY_PUNCTUATION_TO_LATIN,
  UEY_TO_ULY,
  ULY_TO_UEY_DIGRAPHS,
  ULY_TO_UEY_LETTERS,
  ULY_APOSTROPHES,
  ULY_VOWELS,
  WORD_INITIAL_HAMZA,
} from './mapping-table';

export type ConversionDirection = 'uey-to-uly' | 'uly-to-uey';

export type ConversionSegmentKind =
  | 'letter'
  | 'digraph'
  | 'vowel'
  | 'hamza-vowel'
  | 'hamza'
  | 'punctuation'
  | 'space'
  | 'passthrough';

export interface ConversionSegment {
  id: string;
  source: string;
  output: string;
  kind: ConversionSegmentKind;
  sourceIndex: number;
  outputIndex: number;
  canonicalSource?: string;
  note?: string;
}

export interface ConversionTrace {
  direction: ConversionDirection;
  input: string;
  output: string;
  segments: ConversionSegment[];
}

export function traceConversion(
  input: string,
  direction: ConversionDirection,
): ConversionTrace {
  return direction === 'uey-to-uly'
    ? traceUeyToUly(input)
    : traceUlyToUey(input);
}

export function traceUlyToUey(input: string): ConversionTrace {
  const segments: ConversionSegment[] = [];
  let output = '';
  let i = 0;
  let atWordStart = true;
  let previousWasVowel = false;

  while (i < input.length) {
    const sourceIndex = i;
    const outputIndex = output.length;
    const source = input[i];
    const oneChar = source.toLowerCase();
    const twoChar = input.slice(i, i + 2).toLowerCase();

    if (twoChar.length === 2 && twoChar in ULY_TO_UEY_DIGRAPHS) {
      const mapped = ULY_TO_UEY_DIGRAPHS[twoChar];
      output += mapped;
      segments.push({
        id: `${sourceIndex}-${outputIndex}`,
        source: input.slice(i, i + 2),
        output: mapped,
        kind: 'digraph',
        sourceIndex,
        outputIndex,
        canonicalSource: twoChar,
        note: 'Two Latin letters map to one UEY letter.',
      });
      i += 2;
      atWordStart = false;
      previousWasVowel = false;
      continue;
    }

    if (oneChar in ULY_TO_UEY_LETTERS) {
      const mapped = ULY_TO_UEY_LETTERS[oneChar];
      const isVowel = ULY_VOWELS.has(oneChar);
      const needsHamza = isVowel && (atWordStart || previousWasVowel);
      const segmentOutput = needsHamza
        ? `${WORD_INITIAL_HAMZA}${mapped}`
        : mapped;
      output += segmentOutput;
      segments.push({
        id: `${sourceIndex}-${outputIndex}`,
        source,
        output: segmentOutput,
        kind: needsHamza ? 'hamza-vowel' : isVowel ? 'vowel' : 'letter',
        sourceIndex,
        outputIndex,
        canonicalSource: oneChar === 'ë' ? 'é' : oneChar,
        note: needsHamza
          ? atWordStart
            ? 'Word-initial vowels take hamza in UEY.'
            : 'A vowel after another vowel takes hamza in UEY.'
          : oneChar === 'ë'
            ? 'Accepted alias; standard ULY uses é.'
            : undefined,
      });
      i += 1;
      atWordStart = false;
      previousWasVowel = isVowel;
      continue;
    }

    if (ULY_APOSTROPHES.has(source)) {
      output += WORD_INITIAL_HAMZA;
      segments.push({
        id: `${sourceIndex}-${outputIndex}`,
        source,
        output: WORD_INITIAL_HAMZA,
        kind: 'hamza',
        sourceIndex,
        outputIndex,
        canonicalSource: "'",
        note: "Apostrophe marks an in-word hamza in ULY.",
      });
      i += 1;
      atWordStart = false;
      previousWasVowel = false;
      continue;
    }

    if (oneChar in LATIN_PUNCTUATION_TO_UEY) {
      const mapped = LATIN_PUNCTUATION_TO_UEY[oneChar];
      output += mapped;
      segments.push({
        id: `${sourceIndex}-${outputIndex}`,
        source,
        output: mapped,
        kind: 'punctuation',
        sourceIndex,
        outputIndex,
      });
      i += 1;
      atWordStart = true;
      previousWasVowel = false;
      continue;
    }

    output += source;
    segments.push({
      id: `${sourceIndex}-${outputIndex}`,
      source,
      output: source,
      kind: /\s/.test(source) ? 'space' : 'passthrough',
      sourceIndex,
      outputIndex,
    });
    i += 1;
    atWordStart = true;
    previousWasVowel = false;
  }

  return { direction: 'uly-to-uey', input, output, segments };
}

export function traceUeyToUly(input: string): ConversionTrace {
  const segments: ConversionSegment[] = [];
  let output = '';
  let sourceIndex = 0;
  let atWordStart = true;

  for (const source of input) {
    const outputIndex = output.length;

    if (source === WORD_INITIAL_HAMZA) {
      const mapped = atWordStart ? '' : "'";
      output += mapped;
      segments.push({
        id: `${sourceIndex}-${outputIndex}`,
        source,
        output: mapped,
        kind: 'hamza',
        sourceIndex,
        outputIndex,
        note: atWordStart
          ? 'Word-initial hamza is a vowel carrier and is not written in ULY.'
          : "In-word hamza is written as apostrophe in ULY.",
      });
      atWordStart = false;
    } else if (source in UEY_TO_ULY) {
      const mapped = UEY_TO_ULY[source];
      output += mapped;
      segments.push({
        id: `${sourceIndex}-${outputIndex}`,
        source,
        output: mapped,
        kind:
          mapped.length > 1
            ? 'digraph'
            : ULY_VOWELS.has(mapped)
              ? 'vowel'
              : 'letter',
        sourceIndex,
        outputIndex,
      });
      atWordStart = false;
    } else if (source in UEY_PUNCTUATION_TO_LATIN) {
      const mapped = UEY_PUNCTUATION_TO_LATIN[source];
      output += mapped;
      segments.push({
        id: `${sourceIndex}-${outputIndex}`,
        source,
        output: mapped,
        kind: 'punctuation',
        sourceIndex,
        outputIndex,
      });
      atWordStart = true;
    } else {
      output += source;
      const isSpace = /\s/.test(source);
      const isBoundary = isSpace || /[.,;:!?()[\]{}"“”'‘’ʼ-]/.test(source);
      segments.push({
        id: `${sourceIndex}-${outputIndex}`,
        source,
        output: source,
        kind: isSpace ? 'space' : 'passthrough',
        sourceIndex,
        outputIndex,
      });
      atWordStart = isBoundary;
    }

    sourceIndex += source.length;
  }

  return { direction: 'uey-to-uly', input, output, segments };
}
