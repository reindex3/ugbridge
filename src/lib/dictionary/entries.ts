export interface DictionaryExample {
  uey: string;
  uly: string;
  english: string;
}

export interface DictionaryEntry {
  id: string;
  uey: string;
  uly: string;
  ipa: string;
  partOfSpeech: string;
  definitions: string[];
  examples?: DictionaryExample[];
}

export const DICTIONARY_ENTRIES: DictionaryEntry[] = [
  {
    id: 'salam',
    uey: 'سالام',
    uly: 'salam',
    ipa: 'sɑlɑm',
    partOfSpeech: 'interjection',
    definitions: ['hello', 'greeting'],
  },
  {
    id: 'yaxshi',
    uey: 'ياخشى',
    uly: 'yaxshi',
    ipa: 'jɑχʃi',
    partOfSpeech: 'adjective',
    definitions: ['good', 'well', 'fine'],
  },
  {
    id: 'yaxshimusiz',
    uey: 'ياخشىمۇسىز',
    uly: 'yaxshimusiz',
    ipa: 'jɑχʃimusiz',
    partOfSpeech: 'phrase',
    definitions: ['how are you?'],
  },
  {
    id: 'men',
    uey: 'مەن',
    uly: 'men',
    ipa: 'mæn',
    partOfSpeech: 'pronoun',
    definitions: ['I', 'me'],
  },
  {
    id: 'siz',
    uey: 'سىز',
    uly: 'siz',
    ipa: 'siz',
    partOfSpeech: 'pronoun',
    definitions: ['you'],
  },
  {
    id: 'uyghur',
    uey: 'ئۇيغۇر',
    uly: 'uyghur',
    ipa: 'ujʁur',
    partOfSpeech: 'noun',
    definitions: ['Uyghur'],
  },
  {
    id: 'uyghurche',
    uey: 'ئۇيغۇرچە',
    uly: 'uyghurche',
    ipa: 'ujʁurtʃæ',
    partOfSpeech: 'noun',
    definitions: ['Uyghur language', 'in Uyghur'],
  },
  {
    id: 'kitab',
    uey: 'كىتاب',
    uly: 'kitab',
    ipa: 'kitɑb',
    partOfSpeech: 'noun',
    definitions: ['book'],
  },
  {
    id: 'alma',
    uey: 'ئالما',
    uly: 'alma',
    ipa: 'ɑlmɑ',
    partOfSpeech: 'noun',
    definitions: ['apple'],
  },
  {
    id: 'chay',
    uey: 'چاي',
    uly: 'chay',
    ipa: 'tʃɑj',
    partOfSpeech: 'noun',
    definitions: ['tea'],
  },
  {
    id: 'mektep',
    uey: 'مەكتەپ',
    uly: 'mektep',
    ipa: 'mæktæp',
    partOfSpeech: 'noun',
    definitions: ['school'],
  },
  {
    id: 'bala',
    uey: 'بالا',
    uly: 'bala',
    ipa: 'bɑlɑ',
    partOfSpeech: 'noun',
    definitions: ['child'],
  },
  {
    id: 'rahmet',
    uey: 'رەھمەت',
    uly: 'rehmet',
    ipa: 'ræhmæt',
    partOfSpeech: 'interjection',
    definitions: ['thank you', 'thanks'],
  },
  {
    id: 'he',
    uey: 'ھە',
    uly: 'he',
    ipa: 'hæ',
    partOfSpeech: 'particle',
    definitions: ['yes'],
  },
  {
    id: 'körimen',
    uey: 'كۆرىمەن',
    uly: 'körimen',
    ipa: 'kørimæn',
    partOfSpeech: 'verb',
    definitions: ['I see', 'I look at'],
    examples: [
      {
        uey: 'مەن سىزنى ياخشى كۆرىمەن',
        uly: 'men sizni yaxshi körimen',
        english: 'I love you',
      },
    ],
  },
];
