export const UEY_TO_ULY: Record<string, string> = {
  'ا': 'a',
  'ە': 'e',
  'ب': 'b',
  'پ': 'p',
  'ت': 't',
  'ج': 'j',
  'چ': 'ch',
  'خ': 'x',
  'د': 'd',
  'ر': 'r',
  'ز': 'z',
  'ژ': 'zh',
  'س': 's',
  'ش': 'sh',
  'غ': 'gh',
  'ف': 'f',
  'ق': 'q',
  'ك': 'k',
  'ک': 'k',
  'گ': 'g',
  'ڭ': 'ng',
  'ل': 'l',
  'م': 'm',
  'ن': 'n',
  'ھ': 'h',
  'و': 'o',
  'ۇ': 'u',
  'ۆ': 'ö',
  'ۈ': 'ü',
  'ۋ': 'w',
  'ې': 'é',
  'ى': 'i',
  'ي': 'y',
  'ئ': '',
};

export const UEY_PUNCTUATION_TO_LATIN: Record<string, string> = {
  '،': ',',
  '؛': ';',
  '؟': '?',
  '۔': '.',
};

export const ULY_TO_UEY_DIGRAPHS: Record<string, string> = {
  'ch': 'چ',
  'sh': 'ش',
  'gh': 'غ',
  'ng': 'ڭ',
  'zh': 'ژ',
};

export const ULY_TO_UEY_LETTERS: Record<string, string> = {
  'a': 'ا',
  'e': 'ە',
  'b': 'ب',
  'p': 'پ',
  't': 'ت',
  'j': 'ج',
  'x': 'خ',
  'd': 'د',
  'r': 'ر',
  'z': 'ز',
  's': 'س',
  'f': 'ف',
  'q': 'ق',
  'k': 'ك',
  'g': 'گ',
  'l': 'ل',
  'm': 'م',
  'n': 'ن',
  'h': 'ھ',
  'o': 'و',
  'u': 'ۇ',
  'ö': 'ۆ',
  'ü': 'ۈ',
  'w': 'ۋ',
  'é': 'ې',
  'ë': 'ې',
  'i': 'ى',
  'y': 'ي',
};

export const ULY_VOWELS = new Set([
  'a',
  'e',
  'i',
  'o',
  'u',
  'ö',
  'ü',
  'é',
  'ë',
]);

export const ULY_APOSTROPHES = new Set(["'", '’', '‘', 'ʼ']);

export const LATIN_PUNCTUATION_TO_UEY: Record<string, string> = {
  ',': '،',
  ';': '؛',
  '?': '؟',
};

export const WORD_INITIAL_HAMZA = 'ئ';
