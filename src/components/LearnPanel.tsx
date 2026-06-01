import {
  buildUlyToUeyStudy,
  UEY_JOINING_FORM_LABELS,
  ULY_TO_UEY_DIGRAPHS,
  ULY_TO_UEY_LETTERS,
  ulyTokenToIpa,
  type ConversionTrace,
  type UeyStudyLetter,
  type UeyStudyWord,
} from '../lib/converter';
import { TextInput } from './TextInput';

interface LearnPanelProps {
  trace: ConversionTrace;
  value: string;
  onChange: (value: string) => void;
}

const LETTER_ORDER = [
  'a',
  'e',
  'é',
  'b',
  'p',
  't',
  'j',
  'x',
  'd',
  'r',
  'z',
  's',
  'f',
  'q',
  'k',
  'g',
  'l',
  'm',
  'n',
  'h',
  'o',
  'u',
  'ö',
  'ü',
  'w',
  'i',
  'y',
];

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

export function LearnPanel({ trace, value, onChange }: LearnPanelProps) {
  const study = buildUlyToUeyStudy(trace);

  return (
    <div className="grid gap-6">
      <section className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <TextInput mode="uly" value={value} onChange={onChange} />

        <div className="grid gap-4">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-700">
                Coherent UEY
              </h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                {study.letters.length} letters
              </span>
            </div>
            <div
              dir="rtl"
              lang="ug"
              className="min-h-24 whitespace-pre-wrap rounded-md bg-slate-50 px-4 py-3 text-4xl leading-relaxed text-slate-950"
            >
              {study.output || (
                <span className="text-xl text-slate-400">
                  Type ULY text to study its UEY form.
                </span>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-700">
                UEY letters to ULY and IPA
              </h2>
              <span className="text-xs text-slate-400">
                right to left
              </span>
            </div>
            <LetterBridge words={study.words} />
          </section>
        </div>
      </section>

      <section className="grid gap-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">
            Word shape study
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Each word is split by its rendered UEY letters, with the in-word
            shape, standalone shape, position, matching ULY letters, and IPA.
          </p>
        </div>

        {study.words.length ? (
          <div className="grid gap-4">
            {study.words.map((word) => (
              <WordShapePanel key={word.id} word={word} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white/70 p-6 text-sm text-slate-500">
            No UEY word forms yet.
          </div>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
        <h2 className="mb-4 text-sm font-semibold text-slate-700">
          ULY to UEY + IPA reference
        </h2>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {DIGRAPH_ORDER.map((key) => (
            <ReferenceTile
              key={key}
              source={key}
              output={ULY_TO_UEY_DIGRAPHS[key]}
              strong
            />
          ))}
          {LETTER_ORDER.map((key) => (
            <ReferenceTile
              key={key}
              source={key}
              output={ULY_TO_UEY_LETTERS[key]}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function LetterBridge({ words }: { words: readonly UeyStudyWord[] }) {
  if (!words.length) {
    return (
      <div className="rounded-md bg-slate-50 p-4 text-sm text-slate-500">
        Separated UEY letters will appear here.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {words.map((word) => (
        <div key={word.id} className="grid gap-2">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-xs font-semibold text-slate-500">
              {word.uly}
            </span>
            <span dir="rtl" lang="ug" className="text-xl text-slate-800">
              {word.text}
            </span>
          </div>
          <div
            dir="rtl"
            className="flex flex-row flex-wrap justify-start gap-1.5"
          >
            {word.letters.map((letter) => (
              <LetterArrowTile key={letter.id} letter={letter} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function LetterArrowTile({ letter }: { letter: UeyStudyLetter }) {
  const ipa = getLetterIpa(letter);
  const roleLabel = letterRoleLabel(letter.role);

  return (
    <div
      className={`grid min-w-15 justify-items-center gap-1 rounded-md px-1.5 py-2 ring-1 ${letterRoleTileClass(
        letter.role,
      )}`}
    >
      <span dir="rtl" lang="ug" className="text-lg font-semibold">
        {letter.uey}
      </span>
      <span className="text-xs text-slate-300" aria-hidden="true">
        ↓
      </span>
      <span dir="ltr" className="font-mono text-sm font-semibold text-indigo-700">
        {letter.uly}
      </span>
      <span className="font-mono text-[11px] font-semibold text-emerald-700">
        {ipa ? `/${ipa}/` : 'silent'}
      </span>
      {roleLabel ? (
        <span
          className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${letterRoleBadgeClass(
            letter.role,
          )}`}
        >
          {roleLabel}
        </span>
      ) : null}
    </div>
  );
}

function WordShapePanel({ word }: { word: UeyStudyWord }) {
  return (
    <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs">
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div dir="rtl" lang="ug" className="text-4xl leading-relaxed text-slate-950">
          {word.text}
        </div>
        <div className="font-mono text-sm font-semibold text-slate-500">
          {word.uly}
        </div>
      </div>

      <div className="overflow-x-auto">
        <div
          dir="rtl"
          className="grid min-w-max divide-x divide-x-reverse divide-slate-200"
          style={{
            gridTemplateColumns: `repeat(${word.letters.length}, minmax(6.25rem, 1fr))`,
          }}
        >
          {word.letters.map((letter) => (
            <WordShapeCell key={letter.id} letter={letter} />
          ))}
        </div>
      </div>
    </article>
  );
}

function WordShapeCell({ letter }: { letter: UeyStudyLetter }) {
  const ipa = getLetterIpa(letter);

  return (
    <div
      className={`grid gap-3 px-3 py-4 text-center ${letterRoleCellClass(
        letter.role,
      )}`}
    >
      <div dir="rtl" lang="ug" className="text-4xl leading-none text-slate-950">
        {letter.formGlyph}
      </div>

      <dl dir="ltr" className="grid gap-2 text-xs">
        <div>
          <dt className="text-slate-400">ULY</dt>
          <dd className="font-mono text-sm font-bold text-indigo-700">
            {letter.uly}
          </dd>
        </div>
        <div>
          <dt className="text-slate-400">IPA</dt>
          <dd className="font-mono text-sm font-bold text-emerald-700">
            {ipa ? `/${ipa}/` : 'silent'}
          </dd>
        </div>
        <div>
          <dt className="text-slate-400">Position</dt>
          <dd
            className={`mx-auto mt-1 w-fit rounded-full px-2 py-0.5 font-semibold ${formClass(
              letter.form,
            )}`}
          >
            {UEY_JOINING_FORM_LABELS[letter.form]}
          </dd>
        </div>
        <div>
          <dt className="text-slate-400">Standalone</dt>
          <dd dir="rtl" lang="ug" className="text-2xl text-slate-800">
            {letter.isolatedGlyph}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function ReferenceTile({
  source,
  output,
  strong = false,
}: {
  source: string;
  output: string;
  strong?: boolean;
}) {
  const ipa = ulyTokenToIpa(source);
  const isVowel = isVowelToken(source);

  return (
    <div
      className={`rounded-md px-2 py-2 text-center ring-1 ${
        strong
          ? 'bg-indigo-50 text-indigo-950 ring-indigo-100'
          : isVowel
            ? 'bg-emerald-50 text-emerald-950 ring-emerald-200'
          : 'bg-slate-50 text-slate-950 ring-slate-200'
      }`}
    >
      <div className="font-mono text-sm font-semibold">{source}</div>
      <div className="mt-0.5 font-mono text-xs font-semibold text-emerald-700">
        /{ipa}/
      </div>
      <div dir="rtl" lang="ug" className="mt-1 text-xl">
        {output}
      </div>
    </div>
  );
}

function isVowelToken(token: string) {
  return VOWEL_TOKENS.includes(token);
}

function formClass(form: UeyStudyLetter['form']) {
  if (form === 'initial') return 'bg-sky-100 text-sky-800';
  if (form === 'medial') return 'bg-violet-100 text-violet-800';
  if (form === 'final') return 'bg-emerald-100 text-emerald-800';
  return 'bg-slate-100 text-slate-600';
}

function letterRoleTileClass(role: UeyStudyLetter['role']) {
  if (role === 'vowel') return 'bg-emerald-50 text-emerald-950 ring-emerald-200';
  if (role === 'hamza-vowel') return 'bg-amber-50 text-amber-950 ring-amber-200';
  if (role === 'carrier') return 'bg-amber-50 text-amber-950 ring-amber-200';
  return 'bg-slate-50 text-slate-950 ring-slate-200';
}

function letterRoleCellClass(role: UeyStudyLetter['role']) {
  if (role === 'vowel') return 'bg-emerald-50';
  if (role === 'hamza-vowel' || role === 'carrier') return 'bg-amber-50';
  return '';
}

function letterRoleBadgeClass(role: UeyStudyLetter['role']) {
  if (role === 'vowel') return 'bg-emerald-100 text-emerald-800';
  return 'bg-amber-100 text-amber-800';
}

function letterRoleLabel(role: UeyStudyLetter['role']) {
  if (role === 'vowel') return 'vowel';
  if (role === 'hamza-vowel') return 'initial vowel';
  if (role === 'carrier') return 'carrier';
  return '';
}

function getLetterIpa(letter: UeyStudyLetter) {
  if (letter.role === 'carrier') return '';
  return ulyTokenToIpa(letter.uly);
}
