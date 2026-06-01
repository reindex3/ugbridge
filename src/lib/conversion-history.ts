export type ConversionHistoryDirection = 'uey-to-uly' | 'uly-to-uey';

export interface ConversionHistoryEntry {
  id: string;
  direction: ConversionHistoryDirection;
  input: string;
  output: string;
  updatedAt: number;
}

interface AddConversionHistoryInput {
  direction: ConversionHistoryDirection;
  input: string;
  output: string;
  now?: number;
}

const STORAGE_KEY = 'ulybridge.conversion.history.v1';
const MAX_HISTORY_ITEMS = 6;

export function loadConversionHistory(): ConversionHistoryEntry[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return normalizeConversionHistory(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function saveConversionHistory(
  history: ConversionHistoryEntry[],
): ConversionHistoryEntry[] {
  const normalized = normalizeConversionHistory(history);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  }
  return normalized;
}

export function clearConversionHistory(): ConversionHistoryEntry[] {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  return [];
}

export function addConversionHistoryEntry(
  history: ConversionHistoryEntry[],
  entry: AddConversionHistoryInput,
): ConversionHistoryEntry[] {
  const input = entry.input.trim();
  const output = entry.output.trim();

  if (!input || !output) {
    return normalizeConversionHistory(history);
  }

  const updatedAt = entry.now ?? Date.now();
  const id = `${entry.direction}:${input}`;
  const nextEntry: ConversionHistoryEntry = {
    id,
    direction: entry.direction,
    input,
    output,
    updatedAt,
  };

  return normalizeConversionHistory([
    nextEntry,
    ...history.filter(
      (item) =>
        item.direction !== nextEntry.direction || item.input !== nextEntry.input,
    ),
  ]);
}

export function normalizeConversionHistory(
  value: unknown,
): ConversionHistoryEntry[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const entries: ConversionHistoryEntry[] = [];

  for (const item of value) {
    if (!item || typeof item !== 'object') continue;

    const record = item as Partial<ConversionHistoryEntry>;
    if (
      record.direction !== 'uey-to-uly' &&
      record.direction !== 'uly-to-uey'
    ) {
      continue;
    }

    const direction = record.direction;
    const input = typeof record.input === 'string' ? record.input.trim() : '';
    const output =
      typeof record.output === 'string' ? record.output.trim() : '';
    const updatedAt =
      typeof record.updatedAt === 'number' && Number.isFinite(record.updatedAt)
        ? record.updatedAt
        : 0;
    const id = `${direction}:${input}`;

    if (!input || !output || seen.has(id)) continue;

    seen.add(id);
    entries.push({
      id,
      direction,
      input,
      output,
      updatedAt,
    });
  }

  return entries
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_HISTORY_ITEMS);
}
