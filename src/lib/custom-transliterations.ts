import type { ConversionDirection } from './converter';

export interface CustomTransliterationEntry {
  id: string;
  uey: string;
  uly: string;
  updatedAt: number;
}

interface AddCustomTransliterationInput {
  uey: string;
  uly: string;
  now?: number;
}

const STORAGE_KEY = 'ulybridge.custom.transliterations.v1';
const MAX_CUSTOM_TRANSLITERATIONS = 50;

export function loadCustomTransliterations(): CustomTransliterationEntry[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return normalizeCustomTransliterations(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function saveCustomTransliterations(
  entries: CustomTransliterationEntry[],
): CustomTransliterationEntry[] {
  const normalized = normalizeCustomTransliterations(entries);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  }
  return normalized;
}

export function addCustomTransliteration(
  entries: CustomTransliterationEntry[],
  entry: AddCustomTransliterationInput,
): CustomTransliterationEntry[] {
  const uey = entry.uey.trim();
  const uly = entry.uly.trim();

  if (!uey || !uly) {
    return normalizeCustomTransliterations(entries);
  }

  const nextEntry: CustomTransliterationEntry = {
    id: `${uey}:${uly.toLocaleLowerCase()}`,
    uey,
    uly,
    updatedAt: entry.now ?? Date.now(),
  };

  return normalizeCustomTransliterations([
    nextEntry,
    ...entries.filter((item) => item.id !== nextEntry.id),
  ]);
}

export function removeCustomTransliteration(
  entries: CustomTransliterationEntry[],
  id: string,
): CustomTransliterationEntry[] {
  return normalizeCustomTransliterations(
    entries.filter((entry) => entry.id !== id),
  );
}

export function normalizeCustomTransliterations(
  value: unknown,
): CustomTransliterationEntry[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const entries: CustomTransliterationEntry[] = [];

  for (const item of value) {
    if (!item || typeof item !== 'object') continue;

    const record = item as Partial<CustomTransliterationEntry>;
    const uey = typeof record.uey === 'string' ? record.uey.trim() : '';
    const uly = typeof record.uly === 'string' ? record.uly.trim() : '';
    const updatedAt =
      typeof record.updatedAt === 'number' && Number.isFinite(record.updatedAt)
        ? record.updatedAt
        : 0;
    const id = `${uey}:${uly.toLocaleLowerCase()}`;

    if (!uey || !uly || seen.has(id)) continue;

    seen.add(id);
    entries.push({ id, uey, uly, updatedAt });
  }

  return entries
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_CUSTOM_TRANSLITERATIONS);
}

export function applyCustomTransliterations(
  input: string,
  direction: ConversionDirection,
  entries: CustomTransliterationEntry[],
): string {
  const sorted = entries
    .filter((entry) => entry.uey && entry.uly)
    .sort((a, b) => getSource(b, direction).length - getSource(a, direction).length);

  return sorted.reduce((text, entry) => {
    const source = getSource(entry, direction);
    const target = direction === 'uey-to-uly' ? entry.uly : entry.uey;

    if (!source) return text;

    const flags = direction === 'uly-to-uey' ? 'gi' : 'g';
    return text.replace(new RegExp(escapeRegExp(source), flags), target);
  }, input);
}

function getSource(
  entry: CustomTransliterationEntry,
  direction: ConversionDirection,
) {
  return direction === 'uey-to-uly' ? entry.uey : entry.uly;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
