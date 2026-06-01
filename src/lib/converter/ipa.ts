const ULY_DIGRAPH_TO_IPA: Record<string, string> = {
  ch: 'tʃ',
  gh: 'ʁ',
  ng: 'ŋ',
  sh: 'ʃ',
  zh: 'ʒ',
};

const ULY_LETTER_TO_IPA: Record<string, string> = {
  a: 'ɑ',
  b: 'b',
  d: 'd',
  e: 'æ',
  f: 'f',
  g: 'g',
  h: 'h',
  i: 'i',
  j: 'dʒ',
  k: 'k',
  l: 'l',
  m: 'm',
  n: 'n',
  o: 'o',
  p: 'p',
  q: 'q',
  r: 'r',
  s: 's',
  t: 't',
  u: 'u',
  w: 'w',
  x: 'χ',
  y: 'j',
  z: 'z',
  é: 'e',
  ë: 'e',
  ö: 'ø',
  ü: 'y',
};

export function ulyTokenToIpa(input: string): string {
  const normalized = input.toLocaleLowerCase();
  return ULY_DIGRAPH_TO_IPA[normalized] ?? ULY_LETTER_TO_IPA[normalized] ?? '';
}

export function ulyToIpa(input: string): string {
  let output = '';
  let i = 0;

  while (i < input.length) {
    const twoChar = input.slice(i, i + 2);
    const twoCharIpa = ulyTokenToIpa(twoChar);
    if (twoCharIpa) {
      output += twoCharIpa;
      i += 2;
      continue;
    }

    const source = input[i];
    output += ulyTokenToIpa(source) || source;
    i += 1;
  }

  return output;
}
