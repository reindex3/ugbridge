import { ueyToUly, ulyToUey } from '../converter';
import type { DictionaryEntry } from './entries';
import {
  normalizeDictionarySearchMode,
  type DictionarySearchMode,
} from './mode';

type CompactDictionaryEntry = [uey: string, uly: string, definitions: string[]];

interface DictionaryShardRef {
  file: string;
  count: number;
}

interface DictionaryManifest {
  entryCount: number;
  definitionCount: number;
  source: {
    repo: string;
    license: string;
    url: string;
  };
  shards: Record<'english' | 'uly' | 'uey', Record<string, DictionaryShardRef>>;
}

export interface StaticDictionaryLoadResult {
  entries: DictionaryEntry[];
  manifest: DictionaryManifest | null;
  loadedShardCount: number;
}

const MANIFEST_URL = '/dictionary/manifest.json';
const UEY_RE = /[\u0600-\u06ff]/;
const ULY_HINT_RE = /(?:gh|ng|sh|ch|zh|[éëöü'’‘ʼ])/i;
const shardCache = new Map<string, Promise<DictionaryEntry[]>>();
let manifestPromise: Promise<DictionaryManifest | null> | null = null;

export async function loadStaticDictionaryEntries(
  query: string,
  mode?: DictionarySearchMode,
): Promise<StaticDictionaryLoadResult> {
  const normalized = normalizeQuery(query);
  if (!normalized) {
    return { entries: [], manifest: await loadManifest(), loadedShardCount: 0 };
  }

  const manifest = await loadManifest();
  if (!manifest) return { entries: [], manifest: null, loadedShardCount: 0 };

  const shardFiles = getShardFiles(manifest, query, mode);
  const shardEntries = await Promise.all(shardFiles.map(loadShard));
  const entries = filterEntriesForQuery(
    dedupeEntries(shardEntries.flat()),
    query,
    mode,
  );

  return {
    entries,
    manifest,
    loadedShardCount: shardFiles.length,
  };
}

export async function loadStaticDictionaryManifest() {
  return loadManifest();
}

async function loadManifest() {
  manifestPromise ??= fetch(MANIFEST_URL)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Dictionary manifest ${response.status}`);
      }
      return response.json() as Promise<DictionaryManifest>;
    })
    .catch(() => {
      manifestPromise = null;
      return null;
    });

  return manifestPromise;
}

function getShardFiles(
  manifest: DictionaryManifest,
  query: string,
  mode?: DictionarySearchMode,
) {
  const searchMode = normalizeDictionarySearchMode(mode);
  const buckets = new Set<string>();
  const normalized = normalizeQuery(query);
  const queryAsUly = normalizeQuery(ueyToUly(query));
  const queryAsUey = ulyToUey(query);
  const hasUey = UEY_RE.test(query);
  const hasUlyHint = ULY_HINT_RE.test(query);

  const addShard = (
    family: 'english' | 'uly' | 'uey',
    bucket: string,
  ) => {
    const shard = manifest.shards[family][bucket];
    if (shard) buckets.add(shard.file);
  };

  if (searchMode === 'english' || (searchMode === 'auto' && !hasUey)) {
    addShard('english', bucketForLatin(normalized));
  }

  if (searchMode === 'uly' || searchMode === 'auto') {
    if (!hasUey || queryAsUly) addShard('uly', bucketForLatin(queryAsUly));
  }

  if (
    searchMode === 'uey' ||
    (searchMode === 'auto' && (hasUey || hasUlyHint))
  ) {
    const ueyQuery = hasUey ? query : queryAsUey;
    if (ueyQuery) addShard('uey', bucketForUey(ueyQuery));
  }

  return [...buckets];
}

function loadShard(file: string) {
  const url = `/dictionary/${file}`;
  const cached = shardCache.get(url);
  if (cached) return cached;

  const promise = fetch(url)
    .then((response) => {
      if (!response.ok) throw new Error(`Dictionary shard ${response.status}`);
      return response.json() as Promise<CompactDictionaryEntry[]>;
    })
    .then((entries) => entries.map(toDictionaryEntry))
    .catch((error: unknown) => {
      shardCache.delete(url);
      throw error;
    });

  shardCache.set(url, promise);
  return promise;
}

function toDictionaryEntry([
  uey,
  uly,
  definitions,
]: CompactDictionaryEntry): DictionaryEntry {
  const identity = `${uey}\u0000${uly}\u0000${definitions.join('\u0000')}`;

  return {
    id: `static-${hashEntry(identity)}`,
    uey,
    uly,
    ipa: '',
    partOfSpeech: 'translation',
    definitions,
  };
}

function dedupeEntries(entries: DictionaryEntry[]) {
  const seen = new Set<string>();
  const unique: DictionaryEntry[] = [];

  for (const entry of entries) {
    const key = `${entry.uey}\u0000${entry.definitions.join('\u0000')}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(entry);
  }

  return unique;
}

function filterEntriesForQuery(
  entries: DictionaryEntry[],
  query: string,
  mode?: DictionarySearchMode,
) {
  const searchMode = normalizeDictionarySearchMode(mode);
  const normalized = normalizeQuery(query);
  const queryAsUly = normalizeQuery(ueyToUly(query));
  const queryAsUey = normalizeQuery(ulyToUey(query));

  return entries.filter((entry) => {
    const uly = normalizeQuery(entry.uly);
    const uey = normalizeQuery(entry.uey);

    if (
      searchMode !== 'english' &&
      searchMode !== 'uey' &&
      includesQuery(uly, normalized, queryAsUly)
    ) {
      return true;
    }

    if (
      searchMode !== 'english' &&
      searchMode !== 'uly' &&
      includesQuery(uey, normalized, queryAsUey)
    ) {
      return true;
    }

    if (searchMode === 'uey' || searchMode === 'uly') return false;

    return entry.definitions.some((definition) => {
      const normalizedDefinition = normalizeQuery(definition);
      return normalized.length < 3
        ? normalizedDefinition.startsWith(normalized)
        : normalizedDefinition.includes(normalized);
    });
  });
}

function includesQuery(value: string, normalized: string, fallback: string) {
  return (
    value.includes(normalized) ||
    Boolean(fallback && value.includes(fallback))
  );
}

function bucketForLatin(value: string) {
  const first = normalizeLatin(value)[0];
  if (!first) return 'other';
  if (first >= 'a' && first <= 'z') return first;
  if (first >= '0' && first <= '9') return '0-9';
  return 'other';
}

function bucketForUey(value: string) {
  const first = value.trim()[0];
  return first ? first.codePointAt(0)?.toString(16) ?? 'other' : 'other';
}

function normalizeQuery(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
}

function normalizeLatin(value: string): string {
  return normalizeQuery(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');
}

function hashEntry(value: string) {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }
  return (hash >>> 0).toString(36);
}
