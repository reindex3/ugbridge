export type DictionarySearchMode = 'auto' | 'english' | 'uey' | 'uly';

export function normalizeDictionarySearchMode(
  mode: DictionarySearchMode | undefined,
): DictionarySearchMode {
  return mode ?? 'auto';
}
