import { useEffect, useMemo, useState } from 'react';
import { RotateCcw, Shuffle, Trash2 } from 'lucide-react';
import {
  ALPHABET_STUDY_ENTRIES,
  getUeyPresentationGlyph,
  UEY_JOINING_FORM_LABELS,
  ulyTokenToIpa,
  type AlphabetStudyEntry,
  type UeyJoiningForm,
} from '../lib/converter';
import {
  clearQuizProgress,
  getQuizAccuracy,
  loadQuizProgress,
  recordQuizAnswer,
  saveQuizProgress,
  type QuizProgress,
} from '../lib/local-profile';
import {
  LetterProgressPanel,
  loadLearnedTokens,
  saveLearnedTokens,
} from './LetterProgressPanel';

type QuizMode = 'sound' | 'shape' | 'script';
type QuizPhase = 'practice' | 'review' | 'summary';
type ReviewSource = 'set' | 'saved';

interface QuizItem {
  entry: AlphabetStudyEntry;
  form: UeyJoiningForm;
  glyph: string;
}

interface QuizResult {
  item: QuizItem;
  correct: boolean;
}

const QUIZ_FORMS: UeyJoiningForm[] = [
  'isolated',
  'initial',
  'medial',
  'final',
];

const QUIZ_MODES: Array<{ mode: QuizMode; label: string }> = [
  { mode: 'sound', label: 'Sound' },
  { mode: 'shape', label: 'Shape' },
  { mode: 'script', label: 'UEY/ULY' },
];
const GROUP_SIZE = 10;

export function QuizPanel() {
  const [mode, setMode] = useState<QuizMode>('sound');
  const [phase, setPhase] = useState<QuizPhase>('practice');
  const [groupStartIndex, setGroupStartIndex] = useState(0);
  const [groupQuestionIndex, setGroupQuestionIndex] = useState(0);
  const [groupResults, setGroupResults] = useState<QuizResult[]>([]);
  const [reviewItems, setReviewItems] = useState<QuizItem[]>([]);
  const [reviewResults, setReviewResults] = useState<QuizResult[]>([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [reviewSource, setReviewSource] = useState<ReviewSource>('set');
  const [reviewNoticeOpen, setReviewNoticeOpen] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [quizSeed, setQuizSeed] = useState(0);
  const [savedProgress, setSavedProgress] =
    useState<QuizProgress>(loadQuizProgress);
  const [learnedTokens, setLearnedTokens] = useState<Set<string>>(
    () => new Set(loadLearnedTokens()),
  );
  const quizItems = useMemo(
    () => shuffleItems(buildQuizItems(learnedTokens)),
    [learnedTokens, quizSeed],
  );
  const item =
    phase === 'review'
      ? reviewItems[reviewIndex]
      : quizItems[(groupStartIndex + groupQuestionIndex) % quizItems.length];
  const soundOptions = useMemo(
    () => buildSoundOptions(quizItems, item),
    [item, quizItems],
  );
  const shapeOptions = useMemo(
    () => shuffleItems(QUIZ_FORMS),
    [item, mode],
  );
  const scriptOptions = useMemo(
    () => buildScriptOptions(quizItems, item),
    [item, quizItems],
  );
  const activeOptions =
    mode === 'shape'
      ? shapeOptions
      : mode === 'script'
        ? scriptOptions
        : soundOptions;

  useEffect(() => {
    setSelectedAnswer(null);
    setPhase('practice');
    setGroupStartIndex(0);
    setGroupQuestionIndex(0);
    setGroupResults([]);
    setReviewItems([]);
    setReviewResults([]);
    setReviewIndex(0);
    setReviewSource('set');
    setReviewNoticeOpen(false);
    setScore(0);
  }, [mode, quizItems]);

  useEffect(() => {
    saveLearnedTokens([...learnedTokens]);
  }, [learnedTokens]);

  const toggleLearnedToken = (token: string) => {
    setLearnedTokens((current) => {
      const next = new Set(current);
      if (next.has(token)) next.delete(token);
      else next.add(token);
      return next;
    });
  };

  const correctAnswer = getCorrectAnswer(mode, item);
  const answered = Boolean(selectedAnswer);
  const groupNumber = Math.floor(groupStartIndex / GROUP_SIZE) + 1;
  const groupProgress = buildGroupProgress(
    groupResults,
    phase === 'practice' && answered
      ? { item, correct: selectedAnswer === correctAnswer }
      : null,
  );
  const reviewProgress = buildGroupProgress(
    reviewResults,
    phase === 'review' && answered
      ? { item, correct: selectedAnswer === correctAnswer }
      : null,
  );

  const chooseAnswer = (answer: string) => {
    if (answered) return;
    const isCorrect = answer === correctAnswer;
    setSelectedAnswer(answer);
    if (isCorrect) setScore((current) => current + 1);
    setSavedProgress((current) =>
      saveQuizProgress(
        recordQuizAnswer(current, {
          token: item.entry.token,
          form: item.form,
          correct: isCorrect,
        }),
      ),
    );
  };

  const nextPracticeQuestion = () => {
    if (!selectedAnswer) return;
    const nextResults = [
      ...groupResults,
      { item, correct: selectedAnswer === correctAnswer },
    ];
    setSelectedAnswer(null);

    if (groupQuestionIndex < GROUP_SIZE - 1) {
      setGroupResults(nextResults);
      setGroupQuestionIndex((current) => current + 1);
      return;
    }

    const missedItems = nextResults
      .filter((result) => !result.correct)
      .map((result) => result.item);
    setGroupResults(nextResults);
    setReviewItems(missedItems);
    setReviewResults([]);
    setReviewIndex(0);
    setReviewSource('set');
    setPhase(missedItems.length ? 'review' : 'summary');
    setReviewNoticeOpen(Boolean(missedItems.length));
  };

  const nextReviewQuestion = () => {
    if (!selectedAnswer) return;
    const nextResults = [
      ...reviewResults,
      { item, correct: selectedAnswer === correctAnswer },
    ];
    setSelectedAnswer(null);

    if (reviewIndex < reviewItems.length - 1) {
      setReviewResults(nextResults);
      setReviewIndex((current) => current + 1);
      return;
    }

    setReviewResults(nextResults);
    setPhase('summary');
  };

  const startNextGroup = () => {
    setSelectedAnswer(null);
    setPhase('practice');
    setGroupStartIndex((current) => (current + GROUP_SIZE) % quizItems.length);
    setGroupQuestionIndex(0);
    setGroupResults([]);
    setReviewItems([]);
    setReviewResults([]);
    setReviewIndex(0);
    setReviewSource('set');
    setReviewNoticeOpen(false);
  };

  const shufflePractice = () => {
    setSelectedAnswer(null);
    setQuizSeed((current) => current + 1);
  };

  const startSavedMissReview = () => {
    const missedItems = buildSavedMissReviewItems(savedProgress);
    if (!missedItems.length) return;

    setSelectedAnswer(null);
    setGroupResults([]);
    setReviewItems(shuffleItems(missedItems));
    setReviewResults([]);
    setReviewIndex(0);
    setReviewSource('saved');
    setReviewNoticeOpen(false);
    setPhase('review');
  };

  if (phase === 'summary') {
    const summaryResults =
      reviewSource === 'saved' && groupResults.length === 0
        ? reviewResults
        : groupResults;
    const summaryTotal = summaryResults.length || GROUP_SIZE;
    const correctCount = summaryResults.filter(
      (result) => result.correct,
    ).length;
    const missedCount = summaryTotal - correctCount;

    return (
      <div className="grid gap-6">
        <LetterProgressPanel
          learnedTokens={learnedTokens}
          onToggleToken={toggleLearnedToken}
        />
        <QuizLocalProgressPanel
          progress={savedProgress}
          onReset={() => setSavedProgress(clearQuizProgress())}
          onReviewMisses={startSavedMissReview}
        />
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
          <div className="grid gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">
                  Quick practice
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {reviewSource === 'saved' && groupResults.length === 0
                    ? 'Saved misses reviewed. Start a fresh random set when ready.'
                    : `Set ${groupNumber} complete. Review the result before starting the next 10.`}
                </p>
              </div>
              <span className="w-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                {quizItems.length} forms · Score {score}
              </span>
            </div>

            <QuizProgress results={summaryResults} total={summaryTotal} />

            <div className="rounded-lg bg-slate-50 p-5 ring-1 ring-slate-200">
              <div className="text-sm font-semibold text-slate-800">
                {correctCount}/{summaryTotal} correct
              </div>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                {reviewSource === 'saved' && groupResults.length === 0
                  ? `${summaryTotal} saved miss${
                      summaryTotal === 1 ? '' : 'es'
                    } reviewed.`
                  : missedCount
                    ? `${missedCount} missed form${
                        missedCount === 1 ? '' : 's'
                      } reviewed.`
                  : 'Clean set. No missed forms to review.'}
              </p>
              <button
                type="button"
                onClick={startNextGroup}
                className="mt-4 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                Continue next 10
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <LetterProgressPanel
        learnedTokens={learnedTokens}
        onToggleToken={toggleLearnedToken}
      />
      <QuizLocalProgressPanel
        progress={savedProgress}
        onReset={() => setSavedProgress(clearQuizProgress())}
        onReviewMisses={startSavedMissReview}
      />
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">
              Quick practice
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Practice marked learned letters in isolated, initial, medial, and
              final presentation forms. Mark none to practice every UEY letter.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-full bg-slate-100 p-1">
              {QUIZ_MODES.map((quizMode) => (
                <button
                  key={quizMode.mode}
                  type="button"
                  onClick={() => setMode(quizMode.mode)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    mode === quizMode.mode
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-500 hover:bg-white'
                  }`}
                >
                  {quizMode.label}
                </button>
              ))}
            </div>
            <span className="w-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
              {quizItems.length} forms · Score {score}
            </span>
            <button
              type="button"
              onClick={shufflePractice}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
              aria-label="Shuffle practice set"
            >
              <Shuffle className="h-3.5 w-3.5" aria-hidden="true" />
              Shuffle
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[12rem_minmax(0,1fr)] lg:items-center">
          <div className="grid justify-items-center rounded-lg bg-slate-50 px-4 py-5 ring-1 ring-slate-200">
            {mode === 'script' ? (
              <span
                dir="ltr"
                className="font-mono text-5xl font-bold leading-none text-slate-950"
              >
                {item.entry.token}
              </span>
            ) : (
              <span
                dir="rtl"
                lang="ug"
                className="text-6xl leading-none text-slate-950"
              >
                {item.glyph}
              </span>
            )}
            <span
              className={`mt-3 rounded-full px-2.5 py-1 text-xs font-semibold ${formClass(
                item.form,
              )}`}
            >
              {promptBadge(mode, item, answered)}
            </span>
            {mode === 'script' && answered ? (
              <span
                dir="rtl"
                lang="ug"
                className="mt-2 text-4xl leading-none text-slate-900"
              >
                {item.glyph}
              </span>
            ) : null}
            <span className="mt-2 min-h-5 font-mono text-sm font-semibold text-emerald-700">
              {answered ? `/${ulyTokenToIpa(item.entry.token)}/` : null}
            </span>
          </div>

          <div className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span>
                {phase === 'review'
                  ? `Review ${reviewIndex + 1} / ${reviewItems.length}`
                  : `Set ${groupNumber} · ${groupQuestionIndex + 1} / ${GROUP_SIZE}`}
              </span>
              <span>
                {phase === 'review'
                  ? reviewSource === 'saved'
                    ? 'Review saved missed forms.'
                    : 'Review the missed forms from this set.'
                  : questionHint(mode, item)}
              </span>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {activeOptions.map((option) => (
                <QuizAnswerButton
                  key={optionKey(option)}
                  label={optionLabel(mode, option)}
                  detail={optionDetail(mode, option)}
                  textDirection={mode === 'script' ? 'rtl' : 'ltr'}
                  selected={selectedAnswer === answerValue(mode, option)}
                  correct={answerValue(mode, option) === correctAnswer}
                  answered={answered}
                  onClick={() => chooseAnswer(answerValue(mode, option))}
                />
              ))}
              {answered && (
                <button
                  type="button"
                  onClick={
                    phase === 'review'
                      ? nextReviewQuestion
                      : nextPracticeQuestion
                  }
                  className="rounded-md bg-indigo-600 px-3 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 sm:col-span-2"
                >
                  {nextButtonLabel(
                    phase,
                    groupQuestionIndex,
                    reviewIndex,
                    reviewItems,
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {phase === 'review' ? (
          <QuizProgress results={reviewProgress} total={reviewItems.length} />
        ) : (
          <QuizProgress results={groupProgress} total={GROUP_SIZE} />
        )}

        {reviewNoticeOpen && (
          <ReviewNotice
            count={reviewItems.length}
            onStart={() => setReviewNoticeOpen(false)}
          />
        )}
      </section>
    </div>
  );
}

function QuizLocalProgressPanel({
  progress,
  onReset,
  onReviewMisses,
}: {
  progress: QuizProgress;
  onReset: () => void;
  onReviewMisses: () => void;
}) {
  const accuracy = getQuizAccuracy(progress);
  const topMisses = progress.missedItems.slice(0, 4);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">
            Saved quiz progress
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            {progress.answered
              ? `${progress.answered} answered · ${accuracy}% correct · best streak ${progress.bestStreak}`
              : 'No quiz answers saved yet.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onReviewMisses}
            disabled={!progress.missedItems.length}
            className="inline-flex w-fit items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Review missed
          </button>
          <button
            type="button"
            onClick={onReset}
            disabled={!progress.answered}
            className="inline-flex w-fit items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Reset
          </button>
        </div>
      </div>

      {topMisses.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {topMisses.map((item) => (
            <span
              key={item.id}
              className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 ring-1 ring-rose-100"
            >
              {item.token} · {item.form} · {item.missed} missed
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function ReviewNotice({
  count,
  onStart,
}: {
  count: number;
  onStart: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Start review"
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 px-4"
    >
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-5 shadow-2xl">
        <h3 className="text-base font-semibold text-slate-900">
          Review missed forms
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {count} missed form{count === 1 ? '' : 's'} from this set will repeat
          now.
        </p>
        <button
          type="button"
          onClick={onStart}
          className="mt-4 w-full rounded-md bg-indigo-600 px-3 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
        >
          Start review
        </button>
      </div>
    </div>
  );
}

function nextButtonLabel(
  phase: QuizPhase,
  groupQuestionIndex: number,
  reviewIndex: number,
  reviewItems: readonly QuizItem[],
) {
  if (phase === 'review') {
    return reviewIndex === reviewItems.length - 1
      ? 'Finish review'
      : 'Next review';
  }

  return groupQuestionIndex === GROUP_SIZE - 1 ? 'Finish set' : 'Next question';
}

function QuizProgress({
  results,
  total,
}: {
  results: readonly QuizResult[];
  total: number;
}) {
  return (
    <div
      className="mt-4 grid gap-1"
      style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}
      aria-label="Current set progress"
    >
      {Array.from({ length: total }, (_, index) => {
        const result = results[index];
        return (
          <span
            key={index}
            className={`h-2 rounded-full ${
              !result
                ? 'bg-slate-200'
                : result.correct
                  ? 'bg-emerald-500'
                  : 'bg-rose-500'
            }`}
            title={
              !result
                ? `Question ${index + 1}: unanswered`
                : `Question ${index + 1}: ${
                    result.correct ? 'correct' : 'missed'
                  }`
            }
          />
        );
      })}
    </div>
  );
}

function QuizAnswerButton({
  label,
  detail,
  textDirection,
  selected,
  correct,
  answered,
  onClick,
}: {
  label: string;
  detail: string;
  textDirection: 'ltr' | 'rtl';
  selected: boolean;
  correct: boolean;
  answered: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={answered}
      className={`min-h-16 rounded-md px-4 py-4 text-left ring-1 transition ${
        selected && correct
          ? 'bg-emerald-50 text-emerald-900 ring-emerald-200'
          : selected
            ? 'bg-rose-50 text-rose-900 ring-rose-200'
            : answered && correct
              ? 'bg-emerald-50 text-emerald-900 ring-emerald-200'
              : 'bg-white text-slate-900 ring-slate-200 hover:bg-indigo-50 hover:ring-indigo-100'
      }`}
    >
      <span
        dir={textDirection}
        lang={textDirection === 'rtl' ? 'ug' : undefined}
        className="font-mono text-lg font-bold"
      >
        {label}
      </span>
      {detail ? (
        <span className="ml-2 text-sm font-semibold text-slate-400">
          {detail}
        </span>
      ) : null}
    </button>
  );
}

function buildQuizItems(learnedTokens: ReadonlySet<string>): QuizItem[] {
  const entries = learnedTokens.size
    ? ALPHABET_STUDY_ENTRIES.filter((entry) =>
        learnedTokens.has(entry.token),
      )
    : ALPHABET_STUDY_ENTRIES;

  return entries.flatMap((entry) =>
    QUIZ_FORMS.map((form) => ({
      entry,
      form,
      glyph: getUeyPresentationGlyph(entry.uey, form),
    })),
  );
}

function buildSoundOptions(items: readonly QuizItem[], item: QuizItem) {
  const distractors = shuffleItems(
    items.filter(
      (candidate) =>
        candidate.form === item.form &&
        candidate.entry.token !== item.entry.token,
    ),
  );
  return shuffleItems([item, ...distractors.slice(0, 3)]);
}

function buildScriptOptions(items: readonly QuizItem[], item: QuizItem) {
  return buildSoundOptions(items, item);
}

function buildSavedMissReviewItems(progress: QuizProgress) {
  const allItems = buildQuizItems(new Set<string>());
  return progress.missedItems
    .map((miss) =>
      allItems.find(
        (item) => item.entry.token === miss.token && item.form === miss.form,
      ),
    )
    .filter((item): item is QuizItem => Boolean(item));
}

function buildGroupProgress(
  results: readonly QuizResult[],
  pendingResult: QuizResult | null,
) {
  return pendingResult ? [...results, pendingResult] : results;
}

function getCorrectAnswer(mode: QuizMode, item: QuizItem) {
  if (mode === 'shape') return item.form;
  if (mode === 'script') return quizItemId(item);
  return item.entry.token;
}

function answerValue(mode: QuizMode, option: QuizItem | UeyJoiningForm) {
  if (typeof option === 'string') return option;
  return mode === 'script' ? quizItemId(option) : option.entry.token;
}

function optionKey(option: QuizItem | UeyJoiningForm) {
  return typeof option === 'string' ? option : quizItemId(option);
}

function optionLabel(mode: QuizMode, option: QuizItem | UeyJoiningForm) {
  if (typeof option === 'string') return option;
  return mode === 'script' ? option.glyph : option.entry.token;
}

function optionDetail(mode: QuizMode, option: QuizItem | UeyJoiningForm) {
  if (typeof option === 'string' || mode === 'script') return '';
  return `/${ulyTokenToIpa(option.entry.token)}/ · ${option.entry.kind}`;
}

function promptBadge(
  mode: QuizMode,
  item: QuizItem,
  answered: boolean,
) {
  if (mode === 'shape' && !answered) return 'which shape?';
  if (mode === 'script' && !answered) {
    return `pick ${UEY_JOINING_FORM_LABELS[item.form]}`;
  }
  return UEY_JOINING_FORM_LABELS[item.form];
}

function questionHint(mode: QuizMode, item: QuizItem) {
  if (mode === 'shape') return `Pick the shape used by ${item.entry.token}.`;
  if (mode === 'script') return 'Pick the matching UEY form.';
  return 'Pick the matching ULY letter or digraph.';
}

function quizItemId(item: QuizItem) {
  return `${item.entry.token}:${item.form}`;
}

function formClass(form: UeyJoiningForm) {
  if (form === 'initial') return 'bg-sky-100 text-sky-800';
  if (form === 'medial') return 'bg-violet-100 text-violet-800';
  if (form === 'final') return 'bg-emerald-100 text-emerald-800';
  return 'bg-slate-100 text-slate-600';
}

function shuffleItems<T>(items: readonly T[]) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }
  return shuffled;
}
