import {
  ULY_TO_UEY_DIGRAPHS,
  ULY_TO_UEY_LETTERS,
} from './mapping-table';
import {
  buildUlyToUeyStudy,
  getUeyJoiningSample,
  type UeyJoiningForm,
  type UeyStudy,
  type UeyStudyLetter,
  UEY_LETTER_FORMS,
} from './uey-forms';
import { traceUlyToUey } from './trace';

export type AlphabetExampleLabel = UeyJoiningForm | 'word-initial';

export interface AlphabetStudyExample {
  id: string;
  label: AlphabetExampleLabel;
  uly: string;
  uey: string;
  english: string;
  highlightIndexes: number[];
  highlightGlyph: string;
}

export interface AlphabetStudyEntry {
  token: string;
  uey: string;
  displayUey: string;
  kind: 'letter' | 'digraph';
  forms: AlphabetLetterForm[];
  examples: AlphabetStudyExample[];
}

export interface AlphabetLetterForm {
  label: UeyJoiningForm | 'word-initial';
  glyph: string;
}

const ALPHABET_ORDER = [
  'p',
  'b',
  'e',
  'a',
  'x',
  'ch',
  'j',
  't',
  'zh',
  'z',
  'r',
  'd',
  'f',
  'gh',
  'sh',
  's',
  'ng',
  'g',
  'k',
  'q',
  'h',
  'n',
  'm',
  'l',
  'ü',
  'ö',
  'u',
  'o',
  'y',
  'i',
  'é',
  'w',
] as const;

const DIGRAPH_TOKENS = new Set<string>(['ch', 'sh', 'gh', 'ng', 'zh']);
const WORD_INITIAL_VOWEL_BY_TOKEN: Partial<Record<string, string>> = {
  a: 'ئا',
  e: 'ئە',
  o: 'ئو',
  u: 'ئۇ',
  ö: 'ئۆ',
  ü: 'ئۈ',
  é: 'ئې',
  i: 'ئى',
};

const PREFERRED_EXAMPLE_BY_TOKEN: Record<string, string> = {
  p: 'paqa',
  b: 'béliq',
  e: 'eynek',
  a: 'ata',
  x: 'xoraz',
  ch: 'cheynek',
  j: 'juwa',
  t: 'toshqan',
  zh: 'zhurnal',
  z: 'zenjir',
  r: 'rawap',
  d: 'dap',
  f: 'fontan',
  gh: 'ghaz',
  sh: 'shir',
  s: "sa'et",
  ng: 'yangaq',
  g: 'gül',
  k: 'kala',
  q: 'qoy',
  h: 'harwa',
  n: 'nan',
  m: 'müshük',
  l: 'lampa',
  ü: 'üzüm',
  ö: 'öy',
  u: 'uwa',
  o: 'orghaq',
  y: 'yolwas',
  i: 'it',
  é: 'éyiq',
  w: 'wélisipit',
};

interface ExampleWord {
  uly: string;
  english: string;
}

const EXAMPLE_WORDS: ExampleWord[] = [
  { uly: 'paqa', english: 'frog' },
  { uly: 'béliq', english: 'fish' },
  { uly: 'eynek', english: 'mirror' },
  { uly: 'ata', english: 'father' },
  { uly: 'xoraz', english: 'rooster' },
  { uly: 'cheynek', english: 'teapot' },
  { uly: 'juwa', english: 'garlic chives' },
  { uly: 'toshqan', english: 'rabbit' },
  { uly: 'zhurnal', english: 'journal' },
  { uly: 'zenjir', english: 'chain' },
  { uly: 'rawap', english: 'rawap' },
  { uly: 'dap', english: 'dap' },
  { uly: 'fontan', english: 'fountain' },
  { uly: 'ghaz', english: 'goose' },
  { uly: 'shir', english: 'lion' },
  { uly: "sa'et", english: 'clock' },
  { uly: 'yangaq', english: 'walnut' },
  { uly: 'gül', english: 'flower' },
  { uly: 'kala', english: 'cow' },
  { uly: 'qoy', english: 'sheep' },
  { uly: 'harwa', english: 'cart' },
  { uly: 'nan', english: 'bread' },
  { uly: 'müshük', english: 'cat' },
  { uly: 'lampa', english: 'lamp' },
  { uly: 'üzüm', english: 'grape' },
  { uly: 'öy', english: 'house' },
  { uly: 'uwa', english: 'nest' },
  { uly: 'orghaq', english: 'sickle' },
  { uly: 'yolwas', english: 'tiger' },
  { uly: 'it', english: 'dog' },
  { uly: 'éyiq', english: 'bear' },
  { uly: 'wélisipit', english: 'bicycle' },
  { uly: 'ach', english: 'open' },
  { uly: 'ah', english: 'sigh' },
  { uly: 'aq', english: 'white' },
  { uly: 'ana', english: 'mother' },
  { uly: 'ata', english: 'father' },
  { uly: 'alma', english: 'apple' },
  { uly: 'asan', english: 'easy' },
  { uly: 'ax', english: 'ah' },
  { uly: 'az', english: 'few' },
  { uly: 'bina', english: 'building' },
  { uly: 'bala', english: 'child' },
  { uly: 'besh', english: 'five' },
  { uly: 'beg', english: 'lord' },
  { uly: 'belge', english: 'sign' },
  { uly: 'bilim', english: 'knowledge' },
  { uly: 'bir', english: 'one' },
  { uly: 'bügün', english: 'today' },
  { uly: 'chay', english: 'tea' },
  { uly: 'chiq', english: 'go out' },
  { uly: 'dé', english: 'say' },
  { uly: 'démek', english: 'to say' },
  { uly: 'depter', english: 'notebook' },
  { uly: 'di', english: 'said' },
  { uly: 'dost', english: 'friend' },
  { uly: 'edeb', english: 'manners' },
  { uly: 'éshik', english: 'door' },
  { uly: 'et', english: 'meat' },
  { uly: 'futbol', english: 'football' },
  { uly: 'gherb', english: 'west' },
  { uly: 'ghulja', english: 'Ghulja' },
  { uly: 'gül', english: 'flower' },
  { uly: 'haj', english: 'pilgrimage' },
  { uly: 'herp', english: 'letter' },
  { uly: 'ich', english: 'inside' },
  { uly: 'ibadet', english: 'worship' },
  { uly: 'ifrat', english: 'extreme' },
  { uly: 'ilaj', english: 'solution' },
  { uly: 'ilham', english: 'inspiration' },
  { uly: 'iqtisad', english: 'economy' },
  { uly: 'ixlas', english: 'sincerity' },
  { uly: 'ish', english: 'work' },
  { uly: 'ip', english: 'thread' },
  { uly: 'ikki', english: 'two' },
  { uly: 'ilim', english: 'science' },
  { uly: 'islam', english: 'Islam' },
  { uly: 'jan', english: 'soul' },
  { uly: 'kichik', english: 'small' },
  { uly: 'kitab', english: 'book' },
  { uly: 'kiy', english: 'wear' },
  { uly: 'kiyim', english: 'clothing' },
  { uly: 'kaf', english: 'kaf' },
  { uly: 'kolléj', english: 'college' },
  { uly: 'kollézh', english: 'college' },
  { uly: 'kollezh', english: 'college' },
  { uly: 'köp', english: 'many' },
  { uly: 'kün', english: 'day' },
  { uly: 'mektep', english: 'school' },
  { uly: 'men', english: 'I' },
  { uly: 'min', english: 'ride' },
  { uly: 'ming', english: 'thousand' },
  { uly: 'nan', english: 'bread' },
  { uly: 'neme', english: 'what' },
  { uly: 'né', english: 'what' },
  { uly: 'ong', english: 'right' },
  { uly: 'oqu', english: 'study' },
  { uly: 'öy', english: 'house' },
  { uly: 'pak', english: 'pure' },
  { uly: 'pis', english: 'dirty' },
  { uly: 'pul', english: 'money' },
  { uly: 'qelb', english: 'heart' },
  { uly: 'qend', english: 'sugar' },
  { uly: 'qelem', english: 'pen' },
  { uly: 'qiz', english: 'girl' },
  { uly: 'rahmet', english: 'thank you' },
  { uly: 'salam', english: 'hello' },
  { uly: 'ses', english: 'voice' },
  { uly: 'sheher', english: 'city' },
  { uly: 'sinf', english: 'class' },
  { uly: 'siz', english: 'you' },
  { uly: 'su', english: 'water' },
  { uly: 'sulh', english: 'peace' },
  { uly: 'tagh', english: 'mountain' },
  { uly: 'tarix', english: 'history' },
  { uly: 'telefon', english: 'telephone' },
  { uly: 'tég', english: 'touch' },
  { uly: 'tigh', english: 'blade' },
  { uly: 'til', english: 'language' },
  { uly: 'tik', english: 'upright' },
  { uly: 'tört', english: 'four' },
  { uly: 'uchur', english: 'message' },
  { uly: 'uyghur', english: 'Uyghur' },
  { uly: 'üch', english: 'three' },
  { uly: 'waqit', english: 'time' },
  { uly: 'xet', english: 'letter' },
  { uly: 'yaxshi', english: 'good' },
  { uly: 'yenggil', english: 'light' },
  { uly: 'yéngi', english: 'new' },
  { uly: 'yipek', english: 'silk' },
  { uly: 'yol', english: 'road' },
  { uly: 'zhurnal', english: 'journal' },
];

export const ALPHABET_STUDY_ENTRIES: AlphabetStudyEntry[] = [
  ...ALPHABET_ORDER.map((token) =>
    makeAlphabetEntry(token, DIGRAPH_TOKENS.has(token) ? 'digraph' : 'letter'),
  ),
];

function makeAlphabetEntry(
  token: keyof typeof ULY_TO_UEY_DIGRAPHS | keyof typeof ULY_TO_UEY_LETTERS,
  kind: AlphabetStudyEntry['kind'],
): AlphabetStudyEntry {
  const uey =
    kind === 'digraph' ? ULY_TO_UEY_DIGRAPHS[token] : ULY_TO_UEY_LETTERS[token];

  return {
    token,
    uey,
    displayUey: WORD_INITIAL_VOWEL_BY_TOKEN[token] ?? uey,
    kind,
    forms: buildLetterForms(token, uey),
    examples: buildExamples(token, uey),
  };
}

function buildLetterForms(token: string, uey: string): AlphabetLetterForm[] {
  const info = UEY_LETTER_FORMS[uey];
  if (!info) return [];

  const forms: AlphabetLetterForm[] = ([
    'isolated',
    'initial',
    'medial',
    'final',
  ] as const)
    .filter((label) => label === 'isolated' || info[label])
    .map((label) => ({
      label,
      glyph: getUeyJoiningSample(uey, label),
    }));

  const wordInitial = WORD_INITIAL_VOWEL_BY_TOKEN[token];
  return wordInitial
    ? [{ label: 'word-initial', glyph: wordInitial }, ...forms]
    : forms;
}

function buildExamples(token: string, uey: string): AlphabetStudyExample[] {
  const candidates = EXAMPLE_WORDS.flatMap((word) =>
    makeExamplesForWord(token, uey, word),
  ).sort((a, b) => exampleRank(token, a) - exampleRank(token, b));
  const seenForms = new Set<AlphabetExampleLabel>();
  return candidates.filter((example) => {
    if (seenForms.has(example.label)) return false;
    seenForms.add(example.label);
    return true;
  });
}

function exampleRank(token: string, example: AlphabetStudyExample) {
  return example.uly === PREFERRED_EXAMPLE_BY_TOKEN[token] ? 0 : 1;
}

function makeExamplesForWord(
  token: string,
  uey: string,
  word: ExampleWord,
): AlphabetStudyExample[] {
  const study = buildUlyToUeyStudy(traceUlyToUey(word.uly));

  return study.letters
    .filter((letter) => letter.role !== 'carrier')
    .filter((letter) => letter.uey === uey && letter.uly === token)
    .map((letter) => {
      const carrier = getVowelCarrier(study, letter);
      const highlightIndexes = carrier
        ? [carrier.outputIndex, letter.outputIndex]
        : [letter.outputIndex];
      const highlightGlyph = carrier
        ? highlightIndexes.map((index) => study.output[index]).join('')
        : getUeyJoiningSample(letter.uey, letter.form);

      return {
        id: `${token}-${word.uly}-${letter.outputIndex}`,
        label: carrier ? 'word-initial' : letter.form,
        uly: word.uly,
        uey: study.output,
        english: word.english,
        highlightIndexes,
        highlightGlyph,
      };
    });
}

function getVowelCarrier(
  study: UeyStudy,
  letter: UeyStudyLetter,
): UeyStudyLetter | undefined {
  if (letter.role !== 'hamza-vowel') return undefined;
  return study.letters.find(
    (candidate) =>
      candidate.role === 'carrier' && candidate.segmentId === letter.segmentId,
  );
}
