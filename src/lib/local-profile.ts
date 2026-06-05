import type { UeyJoiningForm } from './converter';
import type { DictionaryEntry } from './dictionary';

export interface DictionaryLookupRecord {
  id: string;
  query: string;
  uey: string;
  uly: string;
  definition: string;
  count: number;
  updatedAt: number;
}

export interface QuizMissRecord {
  id: string;
  token: string;
  form: UeyJoiningForm;
  missed: number;
  updatedAt: number;
}

export interface QuizProgress {
  answered: number;
  correct: number;
  currentStreak: number;
  bestStreak: number;
  updatedAt: number;
  missedItems: QuizMissRecord[];
}

export interface StudyWordProgressRecord {
  id: string;
  token: string;
  mastered: boolean;
  reviewCount: number;
  updatedAt: number;
}

export interface LocalProfileData {
  version: 1;
  exportedAt: number;
  dictionaryLookups: DictionaryLookupRecord[];
  quizProgress: QuizProgress;
  studyProgress: StudyWordProgressRecord[];
}

interface RecordDictionaryLookupInput {
  query: string;
  entry: DictionaryEntry;
  now?: number;
}

interface RecordQuizAnswerInput {
  token: string;
  form: UeyJoiningForm;
  correct: boolean;
  now?: number;
}

interface RecordStudyWordProgressInput {
  token: string;
  mastered: boolean;
  now?: number;
}

const DICTIONARY_LOOKUPS_KEY = 'ugbridge.dictionary.lookups.v1';
const QUIZ_PROGRESS_KEY = 'ugbridge.quiz.progress.v1';
const STUDY_PROGRESS_KEY = 'ugbridge.study.progress.v1';
const MAX_DICTIONARY_LOOKUPS = 24;
const MAX_MISSED_ITEMS = 16;
const MAX_STUDY_PROGRESS = 96;
const VALID_FORMS: readonly UeyJoiningForm[] = [
  'isolated',
  'initial',
  'medial',
  'final',
];

export const EMPTY_QUIZ_PROGRESS: QuizProgress = {
  answered: 0,
  correct: 0,
  currentStreak: 0,
  bestStreak: 0,
  updatedAt: 0,
  missedItems: [],
};

export function loadDictionaryLookups(): DictionaryLookupRecord[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(DICTIONARY_LOOKUPS_KEY);
    return raw ? normalizeDictionaryLookups(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

export function saveDictionaryLookups(
  lookups: DictionaryLookupRecord[],
): DictionaryLookupRecord[] {
  const normalized = normalizeDictionaryLookups(lookups);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(
      DICTIONARY_LOOKUPS_KEY,
      JSON.stringify(normalized),
    );
  }
  return normalized;
}

export function clearDictionaryLookups(): DictionaryLookupRecord[] {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(DICTIONARY_LOOKUPS_KEY);
  }
  return [];
}

export function recordDictionaryLookup(
  lookups: DictionaryLookupRecord[],
  input: RecordDictionaryLookupInput,
): DictionaryLookupRecord[] {
  const query = input.query.trim();
  const uey = input.entry.uey.trim();
  const uly = input.entry.uly.trim();
  if (!query || !uey || !uly) return normalizeDictionaryLookups(lookups);

  const normalized = normalizeDictionaryLookups(lookups);
  const id = input.entry.id || `${uey}:${uly.toLocaleLowerCase()}`;
  const previous = normalized.find((item) => item.id === id);
  const nextRecord: DictionaryLookupRecord = {
    id,
    query,
    uey,
    uly,
    definition: input.entry.definitions[0]?.trim() ?? '',
    count: (previous?.count ?? 0) + 1,
    updatedAt: input.now ?? Date.now(),
  };

  return normalizeDictionaryLookups([
    nextRecord,
    ...normalized.filter((item) => item.id !== id),
  ]);
}

export function loadQuizProgress(): QuizProgress {
  if (typeof window === 'undefined') return EMPTY_QUIZ_PROGRESS;

  try {
    const raw = window.localStorage.getItem(QUIZ_PROGRESS_KEY);
    return raw ? normalizeQuizProgress(JSON.parse(raw)) : EMPTY_QUIZ_PROGRESS;
  } catch {
    return EMPTY_QUIZ_PROGRESS;
  }
}

export function saveQuizProgress(progress: QuizProgress): QuizProgress {
  const normalized = normalizeQuizProgress(progress);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(QUIZ_PROGRESS_KEY, JSON.stringify(normalized));
  }
  return normalized;
}

export function clearQuizProgress(): QuizProgress {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(QUIZ_PROGRESS_KEY);
  }
  return EMPTY_QUIZ_PROGRESS;
}

export function recordQuizAnswer(
  progress: QuizProgress,
  input: RecordQuizAnswerInput,
): QuizProgress {
  const current = normalizeQuizProgress(progress);
  const token = input.token.trim();
  if (!token || !VALID_FORMS.includes(input.form)) return current;

  const updatedAt = input.now ?? Date.now();
  const answered = current.answered + 1;
  const correct = current.correct + (input.correct ? 1 : 0);
  const currentStreak = input.correct ? current.currentStreak + 1 : 0;
  const missedItems = input.correct
    ? current.missedItems
    : upsertMissedItem(current.missedItems, {
        id: `${token}:${input.form}`,
        token,
        form: input.form,
        missed: 1,
        updatedAt,
      });

  return normalizeQuizProgress({
    answered,
    correct,
    currentStreak,
    bestStreak: Math.max(current.bestStreak, currentStreak),
    updatedAt,
    missedItems,
  });
}

export function getQuizAccuracy(progress: QuizProgress) {
  const normalized = normalizeQuizProgress(progress);
  if (!normalized.answered) return 0;
  return Math.round((normalized.correct / normalized.answered) * 100);
}

export function loadStudyProgress(): StudyWordProgressRecord[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(STUDY_PROGRESS_KEY);
    return raw ? normalizeStudyProgress(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

export function saveStudyProgress(
  progress: StudyWordProgressRecord[],
): StudyWordProgressRecord[] {
  const normalized = normalizeStudyProgress(progress);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STUDY_PROGRESS_KEY, JSON.stringify(normalized));
  }
  return normalized;
}

export function clearStudyProgress(): StudyWordProgressRecord[] {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(STUDY_PROGRESS_KEY);
  }
  return [];
}

export function recordStudyWordProgress(
  progress: StudyWordProgressRecord[],
  input: RecordStudyWordProgressInput,
): StudyWordProgressRecord[] {
  const token = input.token.trim();
  if (!token) return normalizeStudyProgress(progress);

  const current = normalizeStudyProgress(progress);
  const id = getStudyWordProgressId(token);
  const previous = current.find((item) => item.id === id);
  const nextRecord: StudyWordProgressRecord = {
    id,
    token,
    mastered: input.mastered,
    reviewCount: input.mastered
      ? previous?.reviewCount ?? 0
      : (previous?.reviewCount ?? 0) + 1,
    updatedAt: input.now ?? Date.now(),
  };

  return normalizeStudyProgress([
    nextRecord,
    ...current.filter((item) => item.id !== id),
  ]);
}

export function getStudyWordProgressId(token: string) {
  return token.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
}

export function exportLocalProfileData(now = Date.now()): LocalProfileData {
  return {
    version: 1,
    exportedAt: now,
    dictionaryLookups: loadDictionaryLookups(),
    quizProgress: loadQuizProgress(),
    studyProgress: loadStudyProgress(),
  };
}

export function importLocalProfileData(value: unknown): LocalProfileData {
  const record = value && typeof value === 'object' ? value : {};
  const data = record as Partial<LocalProfileData>;
  if (
    data.version !== 1 &&
    !Array.isArray(data.dictionaryLookups) &&
    !data.quizProgress
  ) {
    throw new Error('Invalid local profile data');
  }

  const dictionaryLookups = saveDictionaryLookups(
    normalizeDictionaryLookups(data.dictionaryLookups),
  );
  const quizProgress = saveQuizProgress(
    normalizeQuizProgress(data.quizProgress),
  );
  const studyProgress = saveStudyProgress(
    normalizeStudyProgress(data.studyProgress),
  );

  return {
    version: 1,
    exportedAt:
      typeof data.exportedAt === 'number' && Number.isFinite(data.exportedAt)
        ? data.exportedAt
        : Date.now(),
    dictionaryLookups,
    quizProgress,
    studyProgress,
  };
}

export function normalizeDictionaryLookups(
  value: unknown,
): DictionaryLookupRecord[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const lookups: DictionaryLookupRecord[] = [];

  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Partial<DictionaryLookupRecord>;
    const uey = typeof record.uey === 'string' ? record.uey.trim() : '';
    const uly = typeof record.uly === 'string' ? record.uly.trim() : '';
    const id =
      typeof record.id === 'string' && record.id.trim()
        ? record.id.trim()
        : `${uey}:${uly.toLocaleLowerCase()}`;
    const query = typeof record.query === 'string' ? record.query.trim() : uly;
    const definition =
      typeof record.definition === 'string' ? record.definition.trim() : '';
    const count =
      typeof record.count === 'number' && Number.isFinite(record.count)
        ? Math.max(1, Math.floor(record.count))
        : 1;
    const updatedAt =
      typeof record.updatedAt === 'number' && Number.isFinite(record.updatedAt)
        ? record.updatedAt
        : 0;

    if (!id || !uey || !uly || seen.has(id)) continue;

    seen.add(id);
    lookups.push({ id, query, uey, uly, definition, count, updatedAt });
  }

  return lookups
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_DICTIONARY_LOOKUPS);
}

export function normalizeQuizProgress(value: unknown): QuizProgress {
  if (!value || typeof value !== 'object') return EMPTY_QUIZ_PROGRESS;
  const record = value as Partial<QuizProgress>;
  const answered = normalizeCount(record.answered);
  const correct = Math.min(normalizeCount(record.correct), answered);
  const currentStreak = normalizeCount(record.currentStreak);
  const bestStreak = Math.max(normalizeCount(record.bestStreak), currentStreak);
  const updatedAt =
    typeof record.updatedAt === 'number' && Number.isFinite(record.updatedAt)
      ? record.updatedAt
      : 0;

  return {
    answered,
    correct,
    currentStreak,
    bestStreak,
    updatedAt,
    missedItems: normalizeMissedItems(record.missedItems),
  };
}

export function normalizeStudyProgress(
  value: unknown,
): StudyWordProgressRecord[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const progress: StudyWordProgressRecord[] = [];

  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Partial<StudyWordProgressRecord>;
    const token = typeof record.token === 'string' ? record.token.trim() : '';
    const id = getStudyWordProgressId(token);
    if (!token || !id || seen.has(id)) continue;

    seen.add(id);
    progress.push({
      id,
      token,
      mastered: record.mastered === true,
      reviewCount: normalizeCount(record.reviewCount),
      updatedAt:
        typeof record.updatedAt === 'number' && Number.isFinite(record.updatedAt)
          ? record.updatedAt
          : 0,
    });
  }

  return progress
    .sort((a, b) => b.updatedAt - a.updatedAt || a.token.localeCompare(b.token))
    .slice(0, MAX_STUDY_PROGRESS);
}

function upsertMissedItem(
  missedItems: readonly QuizMissRecord[],
  nextItem: QuizMissRecord,
) {
  const previous = missedItems.find((item) => item.id === nextItem.id);
  return normalizeMissedItems([
    {
      ...nextItem,
      missed: (previous?.missed ?? 0) + 1,
    },
    ...missedItems.filter((item) => item.id !== nextItem.id),
  ]);
}

function normalizeMissedItems(value: unknown): QuizMissRecord[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const missedItems: QuizMissRecord[] = [];

  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Partial<QuizMissRecord>;
    const token = typeof record.token === 'string' ? record.token.trim() : '';
    const form = record.form;
    if (!token || !form || !VALID_FORMS.includes(form)) continue;

    const id = `${token}:${form}`;
    const missed = normalizeCount(record.missed) || 1;
    const updatedAt =
      typeof record.updatedAt === 'number' && Number.isFinite(record.updatedAt)
        ? record.updatedAt
        : 0;

    if (seen.has(id)) continue;
    seen.add(id);
    missedItems.push({ id, token, form, missed, updatedAt });
  }

  return missedItems
    .sort((a, b) => b.missed - a.missed || b.updatedAt - a.updatedAt)
    .slice(0, MAX_MISSED_ITEMS);
}

function normalizeCount(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : 0;
}
