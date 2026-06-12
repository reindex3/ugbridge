import { ueyToUly, ulyToUey } from '../converter';

export type ReaderScript = 'uey' | 'uly' | 'mixed' | 'unknown';
export type ReaderTokenScript = 'uey' | 'uly' | 'number' | 'unknown';

export interface ReaderToken {
  id: string;
  text: string;
  normalized: string;
  script: ReaderTokenScript;
  start: number;
  end: number;
  uey: string;
  uly: string;
  isLookupCandidate: boolean;
}

export interface ReaderLookupCandidate {
  key: string;
  tokenIds: string[];
  originalText: string;
  uey: string;
  uly: string;
  queries: string[];
}

export interface ReaderTextAnalysis {
  sourceText: string;
  sourceScript: ReaderScript;
  ueyText: string;
  ulyText: string;
  tokens: ReaderToken[];
  lookupCandidates: ReaderLookupCandidate[];
  lineCount: number;
  characterCount: number;
  sentenceCount: number;
  notes: string[];
}

const TOKEN_RE =
  /[\u0600-\u06ff\u0750-\u077f]+|[A-Za-zÉËÖÜéëöü'’‘ʼ-]+|\d+(?:[.,]\d+)?/gu;
const UEY_RE = /[\u0600-\u06ff\u0750-\u077f]/u;
const ULY_RE = /[A-Za-zÉËÖÜéëöü]/u;
const NUMBER_RE = /^\d+(?:[.,]\d+)?$/u;
const ULY_SUFFIXES = [
  'larning',
  'lerning',
  'ingiz',
  'imiz',
  'imizni',
  'ingizni',
  'larni',
  'lerni',
  'ning',
  'gha',
  'ghe',
  'qa',
  'ke',
  'ge',
  'da',
  'de',
  'din',
  'tin',
  'lar',
  'ler',
  'ni',
  'mu',
];

export function analyzeReaderText(text: string): ReaderTextAnalysis {
  const sourceText = text;
  const tokens = tokenizeReaderText(sourceText);
  const sourceScript = detectReaderScript(sourceText);
  const ueyText = buildReaderUeyText(sourceText, sourceScript);
  const ulyText = buildReaderUlyText(sourceText, sourceScript);
  const lookupCandidates = buildLookupCandidates(tokens);
  const lineCount = sourceText ? sourceText.split(/\r\n|\r|\n/u).length : 0;
  const characterCount = sourceText.length;
  const sentenceCount = countSentences(sourceText);

  return {
    sourceText,
    sourceScript,
    ueyText,
    ulyText,
    tokens,
    lookupCandidates,
    lineCount,
    characterCount,
    sentenceCount,
    notes: getReaderNotes(sourceText, sourceScript, tokens, lookupCandidates),
  };
}

export function tokenizeReaderText(text: string): ReaderToken[] {
  const tokens: ReaderToken[] = [];

  for (const match of text.matchAll(TOKEN_RE)) {
    const rawText = match[0];
    const start = match.index ?? 0;
    const normalized = normalizeReaderToken(rawText);
    if (!normalized) continue;

    const script = detectTokenScript(normalized);
    const uey = script === 'uly' ? ulyToUey(normalized) : normalized;
    const uly = script === 'uey' ? ueyToUly(normalized) : normalized;
    const isLookupCandidate =
      (script === 'uey' || script === 'uly') && normalized.length >= 2;

    tokens.push({
      id: `token-${tokens.length}-${start}`,
      text: rawText,
      normalized,
      script,
      start,
      end: start + rawText.length,
      uey,
      uly,
      isLookupCandidate,
    });
  }

  return tokens;
}

export function detectReaderScript(text: string): ReaderScript {
  const hasUey = UEY_RE.test(text);
  const hasUly = ULY_RE.test(text);

  if (hasUey && hasUly) return 'mixed';
  if (hasUey) return 'uey';
  if (hasUly) return 'uly';
  return 'unknown';
}

export function getUlyLookupQueries(uly: string): string[] {
  const normalized = normalizeUly(uly);
  if (!normalized) return [];

  const queries = [normalized];

  for (const suffix of ULY_SUFFIXES) {
    if (!normalized.endsWith(suffix)) continue;
    const root = normalized.slice(0, -suffix.length);
    if (root.length < 2) continue;
    queries.push(root);
  }

  return uniqueStrings(queries).slice(0, 4);
}

function buildLookupCandidates(tokens: ReaderToken[]): ReaderLookupCandidate[] {
  const candidates = new Map<string, ReaderLookupCandidate>();

  for (const token of tokens) {
    if (!token.isLookupCandidate) continue;

    const uly = normalizeUly(token.uly);
    const queries = getUlyLookupQueries(uly);
    if (!queries.length) continue;

    const key = `uly:${queries[0]}`;
    const existing = candidates.get(key);
    if (existing) {
      existing.tokenIds.push(token.id);
      continue;
    }

    candidates.set(key, {
      key,
      tokenIds: [token.id],
      originalText: token.normalized,
      uey: token.uey,
      uly,
      queries,
    });
  }

  return [...candidates.values()].slice(0, 24);
}

function detectTokenScript(text: string): ReaderTokenScript {
  if (NUMBER_RE.test(text)) return 'number';
  if (UEY_RE.test(text)) return 'uey';
  if (ULY_RE.test(text)) return 'uly';
  return 'unknown';
}

function buildReaderUeyText(text: string, script: ReaderScript) {
  if (script === 'uly') return ulyToUey(text);
  return text;
}

function buildReaderUlyText(text: string, script: ReaderScript) {
  if (script === 'uey' || script === 'mixed') return ueyToUly(text);
  return text;
}

function normalizeReaderToken(text: string) {
  return text
    .replace(/[’‘ʼ]/gu, "'")
    .replace(/^-+|-+$/gu, '')
    .trim();
}

function normalizeUly(text: string) {
  return normalizeReaderToken(text).toLocaleLowerCase();
}

function countSentences(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return Math.max(
    1,
    trimmed.split(/[.!?؟。]+/u).filter((part) => part.trim()).length,
  );
}

function getReaderNotes(
  sourceText: string,
  sourceScript: ReaderScript,
  tokens: ReaderToken[],
  lookupCandidates: ReaderLookupCandidate[],
) {
  if (!sourceText.trim()) {
    return ['Paste text or run image OCR to begin.'];
  }

  const notes: string[] = [];
  if (sourceScript === 'mixed') {
    notes.push('Mixed UEY and Latin text detected.');
  } else if (sourceScript === 'unknown') {
    notes.push('No Uyghur-script or Latin word tokens detected yet.');
  }

  if (tokens.length && !lookupCandidates.length) {
    notes.push('No dictionary lookup candidates found.');
  }

  if (lookupCandidates.length < tokens.filter((token) => token.isLookupCandidate).length) {
    notes.push('Repeated words are grouped in the word analysis.');
  }

  return notes;
}

function uniqueStrings(values: string[]) {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const value of values) {
    const normalized = value.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    unique.push(normalized);
  }

  return unique;
}
