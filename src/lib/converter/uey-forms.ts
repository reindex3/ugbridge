import { WORD_INITIAL_HAMZA } from './mapping-table';
import type { ConversionSegment, ConversionTrace } from './trace';

export type UeyJoiningForm = 'isolated' | 'initial' | 'medial' | 'final';

interface UeyLetterInfo {
  isolated: string;
  final?: string;
  initial?: string;
  medial?: string;
  joinsBefore: boolean;
  joinsAfter: boolean;
}

export interface UeyStudyLetter {
  id: string;
  segmentId: string;
  uey: string;
  uly: string;
  form: UeyJoiningForm;
  formGlyph: string;
  isolatedGlyph: string;
  letterIndex: number;
  letterCount: number;
  wordIndex: number;
  outputIndex: number;
  sourceIndex: number;
  role: ConversionSegment['kind'] | 'carrier';
  note?: string;
}

export interface UeyStudyWord {
  id: string;
  text: string;
  uly: string;
  letters: UeyStudyLetter[];
}

export interface UeyStudy {
  output: string;
  words: UeyStudyWord[];
  letters: UeyStudyLetter[];
}

type DraftStudyLetter = Omit<
  UeyStudyLetter,
  | 'form'
  | 'formGlyph'
  | 'isolatedGlyph'
  | 'letterIndex'
  | 'letterCount'
  | 'wordIndex'
>;

interface DraftStudyWord {
  id: string;
  letters: DraftStudyLetter[];
}

const rightJoining = (
  isolated: string,
  final = isolated,
): UeyLetterInfo => ({
  isolated,
  final,
  joinsBefore: true,
  joinsAfter: false,
});

const dualJoining = (
  isolated: string,
  final: string,
  initial: string,
  medial: string,
): UeyLetterInfo => ({
  isolated,
  final,
  initial,
  medial,
  joinsBefore: true,
  joinsAfter: true,
});

const dualJoiningWithoutFinal = (
  isolated: string,
  initial: string,
  medial: string,
): UeyLetterInfo => ({
  isolated,
  initial,
  medial,
  joinsBefore: true,
  joinsAfter: true,
});

export const UEY_JOINING_FORM_LABELS: Record<UeyJoiningForm, string> = {
  isolated: 'isolated',
  initial: 'initial',
  medial: 'medial',
  final: 'final',
};

const ARABIC_TATWEEL = 'ـ';

export const UEY_LETTER_FORMS: Record<string, UeyLetterInfo> = {
  ئ: dualJoining('ﺉ', 'ﺊ', 'ﺋ', 'ﺌ'),
  ا: rightJoining('ﺍ', 'ﺎ'),
  ە: rightJoining('ە', 'ە'),
  ب: dualJoining('ﺏ', 'ﺐ', 'ﺑ', 'ﺒ'),
  پ: dualJoining('ﭖ', 'ﭗ', 'ﭘ', 'ﭙ'),
  ت: dualJoining('ﺕ', 'ﺖ', 'ﺗ', 'ﺘ'),
  ج: dualJoining('ﺝ', 'ﺞ', 'ﺟ', 'ﺠ'),
  چ: dualJoining('ﭺ', 'ﭻ', 'ﭼ', 'ﭽ'),
  خ: dualJoining('ﺥ', 'ﺦ', 'ﺧ', 'ﺨ'),
  د: rightJoining('ﺩ', 'ﺪ'),
  ر: rightJoining('ﺭ', 'ﺮ'),
  ز: rightJoining('ﺯ', 'ﺰ'),
  ژ: rightJoining('ﮊ', 'ﮋ'),
  س: dualJoining('ﺱ', 'ﺲ', 'ﺳ', 'ﺴ'),
  ش: dualJoining('ﺵ', 'ﺶ', 'ﺷ', 'ﺸ'),
  غ: dualJoining('ﻍ', 'ﻎ', 'ﻏ', 'ﻐ'),
  ف: dualJoining('ﻑ', 'ﻒ', 'ﻓ', 'ﻔ'),
  ق: dualJoining('ﻕ', 'ﻖ', 'ﻗ', 'ﻘ'),
  ك: dualJoining('ﻙ', 'ﻚ', 'ﻛ', 'ﻜ'),
  گ: dualJoining('ﮒ', 'ﮓ', 'ﮔ', 'ﮕ'),
  ڭ: dualJoining('ﯓ', 'ﯔ', 'ﯕ', 'ﯖ'),
  ل: dualJoining('ﻝ', 'ﻞ', 'ﻟ', 'ﻠ'),
  م: dualJoining('ﻡ', 'ﻢ', 'ﻣ', 'ﻤ'),
  ن: dualJoining('ﻥ', 'ﻦ', 'ﻧ', 'ﻨ'),
  ھ: dualJoiningWithoutFinal('ﮪ', 'ﮬ', 'ﮭ'),
  و: rightJoining('ﻭ', 'ﻮ'),
  ۇ: rightJoining('ﯗ', 'ﯘ'),
  ۆ: rightJoining('ﯙ', 'ﯚ'),
  ۈ: rightJoining('ﯛ', 'ﯜ'),
  ۋ: rightJoining('ﯞ', 'ﯟ'),
  ې: dualJoining('ﯤ', 'ﯥ', 'ﯦ', 'ﯧ'),
  ى: dualJoining('ﻯ', 'ﻰ', 'ﯨ', 'ﯩ'),
  ي: dualJoining('ﻱ', 'ﻲ', 'ﻳ', 'ﻴ'),
};

export function isUeyLetter(value: string) {
  return value in UEY_LETTER_FORMS;
}

export function getUeyJoiningForm(
  letters: readonly string[],
  index: number,
): UeyJoiningForm {
  const current = UEY_LETTER_FORMS[letters[index]];
  if (!current) return 'isolated';

  const previous = UEY_LETTER_FORMS[letters[index - 1]];
  const next = UEY_LETTER_FORMS[letters[index + 1]];
  const joinsBefore = Boolean(
    previous && previous.joinsAfter && current.joinsBefore,
  );
  const joinsAfter = Boolean(next && current.joinsAfter && next.joinsBefore);

  if (joinsBefore && joinsAfter) return 'medial';
  if (joinsBefore) return 'final';
  if (joinsAfter) return 'initial';
  return 'isolated';
}

export function getUeyPresentationGlyph(
  letter: string,
  form: UeyJoiningForm,
) {
  const info = UEY_LETTER_FORMS[letter];
  if (!info) return letter;

  if (form === 'medial') return info.medial ?? info.final ?? info.isolated;
  if (form === 'initial') return info.initial ?? info.isolated;
  if (form === 'final') return info.final ?? info.isolated;
  return info.isolated;
}

export function getUeyJoiningSample(letter: string, form: UeyJoiningForm) {
  const info = UEY_LETTER_FORMS[letter];
  if (!info) return letter;

  if (form === 'initial' && info.initial) return `${letter}${ARABIC_TATWEEL}`;
  if (form === 'medial' && info.medial) {
    return `${ARABIC_TATWEEL}${letter}${ARABIC_TATWEEL}`;
  }
  if (form === 'final' && info.final) return `${ARABIC_TATWEEL}${letter}`;

  return letter;
}

export function buildUlyToUeyStudy(trace: ConversionTrace): UeyStudy {
  if (trace.direction !== 'uly-to-uey') {
    return { output: trace.output, words: [], letters: [] };
  }

  const draftWords: DraftStudyWord[] = [];
  let currentWord: DraftStudyWord | null = null;

  const startWord = () => {
    currentWord = { id: `word-${draftWords.length}`, letters: [] };
    draftWords.push(currentWord);
    return currentWord;
  };

  const endWord = () => {
    currentWord = null;
  };

  for (const segment of trace.segments) {
    let offset = 0;

    for (const char of segment.output) {
      if (!isUeyLetter(char)) {
        endWord();
        offset += char.length;
        continue;
      }

      const word = currentWord ?? startWord();
      const isCarrier =
        char === WORD_INITIAL_HAMZA && segment.kind === 'hamza-vowel';
      const uly = segment.canonicalSource ?? segment.source;

      word.letters.push({
        id: `${segment.id}-${offset}`,
        segmentId: segment.id,
        uey: char,
        uly,
        outputIndex: segment.outputIndex + offset,
        sourceIndex: segment.sourceIndex,
        role: isCarrier ? 'carrier' : segment.kind,
        note: isCarrier
          ? 'Vowel carrier for a ULY vowel that needs hamza.'
          : segment.note,
      });
      offset += char.length;
    }
  }

  const words = draftWords.map((word, wordIndex): UeyStudyWord => {
    const wordLetters = word.letters.map((letter) => letter.uey);
    const letters = word.letters.map((letter, letterIndex) => {
      const form = getUeyJoiningForm(wordLetters, letterIndex);
      return {
        ...letter,
        form,
        formGlyph: getUeyPresentationGlyph(letter.uey, form),
        isolatedGlyph: getUeyPresentationGlyph(letter.uey, 'isolated'),
        letterIndex,
        letterCount: word.letters.length,
        wordIndex,
      };
    });

    return {
      id: word.id,
      text: letters.map((letter) => letter.uey).join(''),
      uly: getUniqueSourceText(letters),
      letters,
    };
  });

  return {
    output: trace.output,
    words,
    letters: words.flatMap((word) => word.letters),
  };
}

function getUniqueSourceText(letters: readonly UeyStudyLetter[]) {
  const seen = new Set<string>();
  return letters
    .map((letter) => {
      if (seen.has(letter.segmentId)) return '';
      seen.add(letter.segmentId);
      return letter.uly;
    })
    .join('');
}
