import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import Tesseract from 'tesseract.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.resolve(__dirname, '..', 'tests', 'fixtures', 'ocr', 'uey');
const cachePath =
  process.env.TESSERACT_CACHE_PATH ?? path.join(os.tmpdir(), 'ugbridge-tesseract-cache');

const cases = [
  {
    file: 'welcome-to-wikipedia-ug.png',
    minConfidence: 70,
    minUeyChars: 20,
    includes: ['ۋىكىپېدىيەگە', 'كېلىپسىز'],
  },
  {
    file: 'uyghurche.png',
    minConfidence: 40,
    minUeyChars: 5,
  },
  {
    file: 'isolated-seen.png',
    minConfidence: 70,
    minUeyChars: 1,
    includes: ['س'],
  },
  {
    file: 'concise-uyghur-customs-cover.jpg',
    minConfidence: 30,
    minUeyChars: 50,
  },
];

const ueyCharacter = /[\u0600-\u06ff]/u;

const normalizeText = (text) => text.replace(/\s+/g, ' ').trim();

const countUeyCharacters = (text) =>
  [...text].filter((character) => ueyCharacter.test(character)).length;

const summarizeText = (text) => {
  if (text.length <= 120) {
    return text;
  }

  return `${text.slice(0, 117)}...`;
};

const assertFileExists = async (file) => {
  const filePath = path.join(fixtureDir, file);
  await fs.access(filePath);
  return filePath;
};

const fail = (messages) => {
  console.error('\nOCR fixture smoke failed:');
  for (const message of messages) {
    console.error(`- ${message}`);
  }
  process.exitCode = 1;
};

const worker = await Tesseract.createWorker('uig', Tesseract.OEM.LSTM_ONLY, {
  cachePath,
});

try {
  await worker.setParameters({
    preserve_interword_spaces: '1',
    user_defined_dpi: '300',
  });

  const failures = [];

  for (const testCase of cases) {
    const filePath = await assertFileExists(testCase.file);
    const { data } = await worker.recognize(filePath);
    const text = normalizeText(data.text);
    const ueyChars = countUeyCharacters(text);
    const confidence = Math.round(data.confidence);

    console.log(
      `ok ${testCase.file} confidence=${confidence} ueyChars=${ueyChars} text="${summarizeText(text)}"`,
    );

    if (data.confidence < testCase.minConfidence) {
      failures.push(
        `${testCase.file} confidence ${confidence} below ${testCase.minConfidence}`,
      );
    }

    if (ueyChars < testCase.minUeyChars) {
      failures.push(
        `${testCase.file} UEY character count ${ueyChars} below ${testCase.minUeyChars}`,
      );
    }

    for (const fragment of testCase.includes ?? []) {
      if (!text.includes(fragment)) {
        failures.push(`${testCase.file} missing expected fragment "${fragment}"`);
      }
    }
  }

  if (failures.length > 0) {
    fail(failures);
  }
} finally {
  await worker.terminate();
}
