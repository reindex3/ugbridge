import { useState } from 'react';
import type { ReactNode } from 'react';
import { Copy, Search } from 'lucide-react';
import type {
  ConversionTrace,
  ConversionSegment,
  ConversionSegmentKind,
} from '../lib/converter';

type ScriptMode = 'uey' | 'uly';

interface ConversionOutputProps {
  mode: ScriptMode;
  value: string;
  ipa?: string;
  trace?: ConversionTrace;
  actions?: ReactNode;
  lookupWords?: string[];
  onLookupWord?: (word: string) => void;
}

const CONFIG: Record<
  ScriptMode,
  { dir: 'rtl' | 'ltr'; lang: string; label: string; subtitle: string }
> = {
  uey: {
    dir: 'rtl',
    lang: 'ug',
    label: 'UEY',
    subtitle: 'Uyghur Arabic script',
  },
  uly: {
    dir: 'ltr',
    lang: 'en',
    label: 'ULY',
    subtitle: 'Uyghur Latin alphabet',
  },
};

const HIGHLIGHT_CLASSES: Record<ConversionSegmentKind, string> = {
  letter: 'bg-sky-100 text-sky-950',
  digraph: 'bg-violet-100 text-violet-950',
  vowel: 'bg-emerald-100 text-emerald-950',
  'hamza-vowel': 'bg-amber-100 text-amber-950',
  hamza: 'bg-slate-200 text-slate-500',
  punctuation: 'bg-rose-100 text-rose-950',
  space: '',
  passthrough: 'bg-slate-100 text-slate-700',
};

export function ConversionOutput({
  mode,
  value,
  ipa,
  trace,
  actions,
  lookupWords = [],
  onLookupWord,
}: ConversionOutputProps) {
  const [copied, setCopied] = useState(false);
  const config = CONFIG[mode];

  const handleCopy = async () => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="min-w-0 flex flex-col gap-2">
      <div className="flex min-h-7 flex-wrap items-center justify-between gap-2">
        <label
          htmlFor="text-output"
          className="text-sm font-semibold text-slate-700"
        >
          {config.label}{' '}
          <span className="font-normal text-slate-400">
            · {config.subtitle}
          </span>
        </label>
        <div className="flex items-center gap-1">
          {actions}
          <button
            type="button"
            onClick={handleCopy}
            disabled={!value}
            className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            {copied ? 'Copied!' : 'Copy result'}
          </button>
        </div>
      </div>
      <div className="flex min-h-8 items-center">
        {ipa ? (
          <p
            aria-label="International Phonetic Alphabet"
            className="w-full truncate rounded-md border border-slate-200 bg-white px-3 py-1.5 font-mono text-sm text-slate-600 shadow-xs"
          >
            IPA /{ipa}/
          </p>
        ) : null}
      </div>
      <div
        id="text-output"
        dir={config.dir}
        lang={config.lang}
        className="h-72 w-full overflow-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50/60 p-4 text-xl leading-relaxed text-slate-900 shadow-xs"
      >
        {mode === 'uey' && value ? (
          <div className="grid gap-4">
            <div>{value}</div>
            {trace?.segments.length ? (
              <div className="border-t border-slate-200 pt-3">
                {renderHighlightedSegments(trace, true)}
              </div>
            ) : null}
          </div>
        ) : trace?.segments.length ? (
          renderHighlightedSegments(trace, mode === 'uey')
        ) : value ? (
          value
        ) : (
          <span className="text-slate-400">
            Converted text will appear here…
          </span>
        )}
      </div>
      {value && lookupWords.length > 0 && onLookupWord ? (
        <div
          aria-label="Dictionary lookup words"
          className="flex flex-wrap items-center gap-1.5 text-xs"
        >
          <span className="inline-flex items-center gap-1 font-medium text-slate-400">
            <Search className="h-3.5 w-3.5" aria-hidden="true" />
            Tap word
          </span>
          {lookupWords.map((word) => (
            <button
              key={word}
              type="button"
              onClick={() => onLookupWord(word)}
              className="rounded-full bg-white px-2.5 py-1 font-semibold text-slate-600 shadow-xs ring-1 ring-slate-200 transition hover:bg-indigo-50 hover:text-indigo-700 hover:ring-indigo-200"
              aria-label={`Look up ${word} in dictionary`}
            >
              {word}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function renderHighlightedSegments(trace: ConversionTrace, showSourceBridge = false) {
  if (showSourceBridge) {
    return (
      <div dir="rtl" className="flex flex-row flex-wrap justify-start gap-1.5">
        {trace.segments.map((segment) =>
          segment.output.trim() ? (
            <SegmentBridgeTile key={segment.id} segment={segment} />
          ) : null,
        )}
      </div>
    );
  }

  return trace.segments.map((segment) =>
    segment.output ? (
      <span
        key={segment.id}
        title={segment.note ?? `${segment.source || ' '} → ${segment.output}`}
        className={
          HIGHLIGHT_CLASSES[segment.kind]
            ? `${HIGHLIGHT_CLASSES[segment.kind]} rounded-sm px-0.5 transition hover:ring-1 hover:ring-indigo-300`
            : undefined
        }
      >
        {segment.output}
      </span>
    ) : null,
  );
}

function SegmentBridgeTile({ segment }: { segment: ConversionSegment }) {
  const source = segment.canonicalSource ?? segment.source;

  return (
    <span
      title={segment.note ?? `${segment.source || ' '} -> ${segment.output}`}
      className={`inline-grid min-w-8 justify-items-center gap-0.5 rounded-md px-1.5 py-1 ring-1 ring-slate-200 ${
        HIGHLIGHT_CLASSES[segment.kind] || 'bg-slate-50 text-slate-700'
      }`}
    >
      <span dir="rtl" lang="ug" className="text-lg font-semibold leading-6">
        {segment.output}
      </span>
      <span className="text-[10px] leading-none text-slate-400" aria-hidden="true">
        ↓
      </span>
      <span dir="ltr" className="font-mono text-xs font-bold text-indigo-700">
        {source}
      </span>
    </span>
  );
}
