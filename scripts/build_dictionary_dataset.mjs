import {
  createReadStream,
  createWriteStream,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { createInterface } from 'node:readline';
import https from 'node:https';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const cacheDir = join(rootDir, '.cache', 'dictionary');
const outputDir = join(rootDir, 'public', 'dictionary');
const shardDir = join(outputDir, 'shards');

const SOURCE_REPO = 'anke01/uyghur-dictionary-dataset';
const SOURCE_COMMIT = '14355b6ea141ca46620da6ef483a03fb6baa0dd6';
const SOURCE_BASE = `https://huggingface.co/datasets/${SOURCE_REPO}/resolve/${SOURCE_COMMIT}`;
const SOURCE_FILES = ['ug-en.jsonl', 'en-ug.jsonl'];
const MAX_DEFINITIONS_PER_ENTRY = 12;
const MAX_TEXT_LENGTH = 120;

const UYGHUR_ARABIC_RE = /[\u0600-\u06ff]/;
const LATIN_RE = /[a-z]/i;
const CHINESE_RE = /[\u3400-\u9fff]/;
const TAG_RE = /<[^>]+>/g;
const HTML_ENTITY_RE = /&(?:[a-z]+|#\d+);/i;

await main();

async function main() {
  mkdirSync(cacheDir, { recursive: true });
  mkdirSync(shardDir, { recursive: true });

  for (const file of SOURCE_FILES) {
    await ensureDownloaded(file);
  }

  const definitionsByUey = new Map();

  for (const file of SOURCE_FILES) {
    await ingestJsonl(join(cacheDir, file), definitionsByUey);
  }

  const entries = [...definitionsByUey.entries()]
    .map(([uey, definitions]) => ({
      uey,
      uly: ueyToSimpleUly(uey),
      definitions: [...definitions].slice(0, MAX_DEFINITIONS_PER_ENTRY),
    }))
    .filter((entry) => entry.uly && entry.definitions.length)
    .sort((a, b) => a.uly.localeCompare(b.uly) || a.uey.localeCompare(b.uey));

  rmSync(shardDir, { recursive: true, force: true });
  mkdirSync(shardDir, { recursive: true });

  const shards = {
    english: writeShards('english', entries, getEnglishBuckets),
    uly: writeShards('uly', entries, (entry) => [bucketForLatin(entry.uly)]),
    uey: writeShards('uey', entries, (entry) => [bucketForUey(entry.uey)]),
  };

  const manifest = {
    version: 1,
    source: {
      repo: SOURCE_REPO,
      commit: SOURCE_COMMIT,
      files: SOURCE_FILES,
      license: 'apache-2.0',
      url: `https://huggingface.co/datasets/${SOURCE_REPO}`,
    },
    generatedAt: new Date().toISOString(),
    entryCount: entries.length,
    definitionCount: entries.reduce(
      (total, entry) => total + entry.definitions.length,
      0,
    ),
    maxDefinitionsPerEntry: MAX_DEFINITIONS_PER_ENTRY,
    shards,
  };

  writeFileSync(join(outputDir, 'manifest.json'), `${JSON.stringify(manifest)}\n`);

  const stats = getOutputStats();
  console.log(
    JSON.stringify(
      {
        entryCount: manifest.entryCount,
        definitionCount: manifest.definitionCount,
        files: stats.files,
        bytes: stats.bytes,
        mib: Number((stats.bytes / 1024 / 1024).toFixed(2)),
      },
      null,
      2,
    ),
  );
}

async function ensureDownloaded(file) {
  const target = join(cacheDir, file);
  if (existsWithContent(target)) return;

  const url = `${SOURCE_BASE}/${file}`;
  console.log(`Downloading ${url}`);
  await pipeline(await get(url), createWriteStream(target));
}

function existsWithContent(path) {
  try {
    return statSync(path).size > 0;
  } catch {
    return false;
  }
}

function get(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        const location = response.headers.location;
        if (
          response.statusCode &&
          response.statusCode >= 300 &&
          response.statusCode < 400 &&
          location
        ) {
          response.resume();
          if (redirectCount > 5) {
            reject(new Error(`Too many redirects for ${url}`));
            return;
          }
          resolve(get(new URL(location, url).toString(), redirectCount + 1));
          return;
        }

        if (response.statusCode !== 200) {
          response.resume();
          reject(new Error(`GET ${url} failed with ${response.statusCode}`));
          return;
        }

        resolve(response);
      })
      .on('error', reject);
  });
}

async function ingestJsonl(path, definitionsByUey) {
  const lines = createInterface({
    input: createReadStream(path, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  for await (const line of lines) {
    if (!line.trim()) continue;

    let row;
    try {
      row = JSON.parse(line);
    } catch {
      continue;
    }

    const input = cleanText(row.input);
    const output = cleanText(row.output);

    if (looksUyghurArabic(input) && looksEnglish(output)) {
      addPair(definitionsByUey, input, output);
    } else if (looksEnglish(input) && looksUyghurArabic(output)) {
      for (const ueyPart of splitTranslations(output).filter(looksUyghurArabic)) {
        addPair(definitionsByUey, ueyPart, input);
      }
    }
  }
}

function writeShards(mode, entries, getBuckets) {
  const buckets = new Map();

  for (const entry of entries) {
    for (const bucket of getBuckets(entry)) {
      if (!buckets.has(bucket)) buckets.set(bucket, []);
      buckets.get(bucket).push([entry.uey, entry.uly, entry.definitions]);
    }
  }

  const manifest = {};
  for (const [bucket, shardEntries] of [...buckets.entries()].sort()) {
    const file = `${mode}-${bucket}.json`;
    writeFileSync(
      join(shardDir, file),
      `${JSON.stringify(shardEntries)}\n`,
    );
    manifest[bucket] = { file: `shards/${file}`, count: shardEntries.length };
  }

  return manifest;
}

function getEnglishBuckets(entry) {
  return [
    ...new Set(
      entry.definitions
        .map((definition) => bucketForLatin(definition))
        .filter(Boolean),
    ),
  ];
}

function bucketForLatin(value) {
  const first = normalizeLatin(value)[0];
  if (!first) return 'other';
  if (first >= 'a' && first <= 'z') return first;
  if (first >= '0' && first <= '9') return '0-9';
  return 'other';
}

function bucketForUey(value) {
  const first = value.trim()[0];
  return first ? first.codePointAt(0).toString(16) : 'other';
}

function getOutputStats() {
  let files = 0;
  let bytes = 0;
  for (const file of [join(outputDir, 'manifest.json'), ...readdirSync(shardDir).map((name) => join(shardDir, name))]) {
    files += 1;
    bytes += statSync(file).size;
  }
  return { files, bytes };
}

function cleanText(value) {
  return String(value)
    .replace(/\\\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(TAG_RE, '\n')
    .replace(HTML_ENTITY_RE, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitTranslations(value) {
  return cleanText(value)
    .split(/\s*(?:;|؛|،|,|\n|\/)\s*/)
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => part.length <= MAX_TEXT_LENGTH)
    .filter((part) => !CHINESE_RE.test(part));
}

function normalizeLatin(value) {
  return value
    .trim()
    .toLocaleLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function looksUyghurArabic(value) {
  return UYGHUR_ARABIC_RE.test(value);
}

function startsWithUyghurArabic(value) {
  return /^[\u0600-\u06ff]/u.test(value.trim());
}

function looksEnglish(value) {
  return LATIN_RE.test(value) && !UYGHUR_ARABIC_RE.test(value) && !CHINESE_RE.test(value);
}

function addPair(definitionsByUey, uey, english) {
  const cleanedUey = cleanHeadword(uey);
  if (
    !looksUyghurArabic(cleanedUey) ||
    !startsWithUyghurArabic(cleanedUey) ||
    cleanedUey.length > MAX_TEXT_LENGTH
  ) {
    return;
  }

  const englishParts = splitTranslations(english).filter(looksEnglish);
  if (!englishParts.length) return;

  const definitions = definitionsByUey.get(cleanedUey) ?? new Set();
  for (const definition of englishParts) {
    definitions.add(definition);
  }
  definitionsByUey.set(cleanedUey, definitions);
}

function cleanHeadword(value) {
  return cleanText(value)
    .replace(/^[^\u0600-\u06ff]+/u, '')
    .replace(/[^\u0600-\u06ff\s،؛؟-]+$/u, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function ueyToSimpleUly(value) {
  const map = {
    ئا: 'a',
    ئە: 'e',
    ئو: 'o',
    ئۇ: 'u',
    ئۆ: 'ö',
    ئۈ: 'ü',
    ئې: 'é',
    ئى: 'i',
    ا: 'a',
    ە: 'e',
    ب: 'b',
    پ: 'p',
    ت: 't',
    ج: 'j',
    چ: 'ch',
    خ: 'x',
    د: 'd',
    ر: 'r',
    ز: 'z',
    ژ: 'zh',
    س: 's',
    ش: 'sh',
    غ: 'gh',
    ف: 'f',
    ق: 'q',
    ك: 'k',
    ک: 'k',
    گ: 'g',
    ڭ: 'ng',
    ل: 'l',
    م: 'm',
    ن: 'n',
    ھ: 'h',
    و: 'o',
    ۇ: 'u',
    ۆ: 'ö',
    ۈ: 'ü',
    ې: 'é',
    ى: 'i',
    ي: 'y',
    ۋ: 'w',
    ئ: '',
    '،': ',',
    '؟': '?',
    '؛': ';',
  };

  let output = '';
  for (let index = 0; index < value.length; index += 1) {
    const pair = value.slice(index, index + 2);
    if (map[pair] !== undefined) {
      output += map[pair];
      index += 1;
      continue;
    }
    const char = value[index];
    output += map[char] ?? char;
  }
  return output.replace(/\s+/g, ' ').trim();
}
