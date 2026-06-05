import { ALPHABET_STUDY_ENTRIES } from '../lib/converter';

const DIGRAPH_ORDER = ['ch', 'sh', 'gh', 'ng', 'zh'];
const VOWEL_TOKENS: readonly string[] = [
  'a',
  'e',
  'é',
  'i',
  'o',
  'u',
  'ö',
  'ü',
];
const LEARN_PROGRESS_KEY = 'ugbridge.learnedLetters.v1';
const LEARNABLE_TOKENS = new Set(
  ALPHABET_STUDY_ENTRIES.map((entry) => entry.token),
);

const LESSON_GROUPS = [
  {
    id: 'vowels',
    title: 'Vowels and hamza',
    description:
      'Start with vowels, their word-initial hamza carrier, and the core sounds that make UEY feel different from Latin text.',
    tokens: VOWEL_TOKENS,
  },
  {
    id: 'core',
    title: 'Core consonants',
    description:
      'Build recognition for the most common single-letter consonants before worrying about every shape.',
    tokens: [
      'b',
      'p',
      't',
      'j',
      'x',
      'd',
      'r',
      'z',
      's',
      'q',
      'k',
      'g',
      'l',
      'm',
      'n',
      'h',
      'w',
      'y',
    ],
  },
  {
    id: 'digraphs',
    title: 'ULY digraphs',
    description: 'Learn the Latin letter pairs that map to one UEY letter.',
    tokens: DIGRAPH_ORDER,
  },
] as const;

export function LetterProgressPanel({
  learnedTokens,
  onToggleToken,
}: {
  learnedTokens: ReadonlySet<string>;
  onToggleToken: (token: string) => void;
}) {
  const learnedCount = learnedTokens.size;

  return (
    <section className="grid gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-950">
            Letter progress
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
            Track letters before practice. Progress stays in this browser; no
            account, sync, or Firebase database is used.
          </p>
        </div>
        <span className="w-fit rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
          {learnedCount}/{ALPHABET_STUDY_ENTRIES.length} marked learned
        </span>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {LESSON_GROUPS.map((group) => (
          <LessonGroup
            key={group.id}
            title={group.title}
            description={group.description}
            tokens={group.tokens}
            learnedTokens={learnedTokens}
            onToggle={onToggleToken}
          />
        ))}
      </div>
    </section>
  );
}

function LessonGroup({
  title,
  description,
  tokens,
  learnedTokens,
  onToggle,
}: {
  title: string;
  description: string;
  tokens: readonly string[];
  learnedTokens: ReadonlySet<string>;
  onToggle: (token: string) => void;
}) {
  const learnedInGroup = tokens.filter((token) =>
    learnedTokens.has(token),
  ).length;

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        </div>
        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
          {learnedInGroup}/{tokens.length}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {tokens.map((token) => {
          const entry = ALPHABET_STUDY_ENTRIES.find(
            (item) => item.token === token,
          );
          if (!entry) return null;
          const learned = learnedTokens.has(token);
          return (
            <button
              key={token}
              type="button"
              onClick={() => onToggle(token)}
              aria-pressed={learned}
              className={`grid min-h-16 min-w-14 justify-items-center rounded-md px-2 py-1.5 text-center ring-1 transition ${
                learned
                  ? 'bg-emerald-50 text-emerald-900 ring-emerald-200'
                  : 'bg-slate-50 text-slate-900 ring-slate-200 hover:bg-indigo-50 hover:ring-indigo-100'
              }`}
            >
              <span className="font-mono text-xs font-bold">{token}</span>
              <span dir="rtl" lang="ug" className="text-xl leading-none">
                {entry.displayUey}
              </span>
            </button>
          );
        })}
      </div>
    </article>
  );
}

export function loadLearnedTokens() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LEARN_PROGRESS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return normalizeLearnedTokens(parsed);
  } catch {
    return [];
  }
}

export function saveLearnedTokens(tokens: readonly string[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    LEARN_PROGRESS_KEY,
    JSON.stringify(normalizeLearnedTokens(tokens)),
  );
}

function normalizeLearnedTokens(value: unknown) {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const tokens: string[] = [];

  for (const token of value) {
    if (
      typeof token !== 'string' ||
      !LEARNABLE_TOKENS.has(token) ||
      seen.has(token)
    ) {
      continue;
    }

    seen.add(token);
    tokens.push(token);
  }

  return tokens;
}
