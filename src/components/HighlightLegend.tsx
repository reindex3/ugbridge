export type HighlightLegendItem =
  | 'letter'
  | 'digraph'
  | 'vowel'
  | 'initial-vowel'
  | 'learn-initial-vowel'
  | 'punctuation'
  | 'hamza-carrier'
  | 'word-initial-form'
  | 'initial-form'
  | 'medial-form'
  | 'final-form'
  | 'isolated-form';

const LEGEND_CONFIG: Record<
  HighlightLegendItem,
  { label: string; className: string }
> = {
  letter: {
    label: 'letter',
    className: 'bg-sky-100 text-sky-950 ring-1 ring-sky-300',
  },
  digraph: {
    label: 'digraph',
    className: 'bg-violet-100 text-violet-950 ring-1 ring-violet-300',
  },
  vowel: {
    label: 'vowel',
    className: 'bg-emerald-100 text-emerald-950 ring-1 ring-emerald-300',
  },
  'initial-vowel': {
    label: 'initial vowel',
    className: 'bg-amber-100 text-amber-950 ring-1 ring-amber-300',
  },
  'learn-initial-vowel': {
    label: 'initial vowel',
    className: 'bg-emerald-100 text-emerald-950 ring-1 ring-emerald-300',
  },
  punctuation: {
    label: 'punctuation',
    className: 'bg-rose-100 text-rose-950 ring-1 ring-rose-300',
  },
  'hamza-carrier': {
    label: 'hamza carrier',
    className: 'bg-slate-200 text-slate-700 ring-1 ring-slate-300',
  },
  'word-initial-form': {
    label: 'word-initial',
    className: 'bg-amber-100 text-amber-900 ring-1 ring-amber-300',
  },
  'initial-form': {
    label: 'initial',
    className: 'bg-sky-100 text-sky-900 ring-1 ring-sky-300',
  },
  'medial-form': {
    label: 'medial',
    className: 'bg-violet-100 text-violet-900 ring-1 ring-violet-300',
  },
  'final-form': {
    label: 'final',
    className: 'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-300',
  },
  'isolated-form': {
    label: 'isolated',
    className: 'bg-slate-200 text-slate-700 ring-1 ring-slate-300',
  },
};

const DEFAULT_ITEMS: HighlightLegendItem[] = [
  'letter',
  'digraph',
  'vowel',
  'initial-vowel',
  'punctuation',
];

export function HighlightLegend({
  items = DEFAULT_ITEMS,
  className = '',
  ariaLabel = 'Highlight legend',
}: {
  items?: HighlightLegendItem[];
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div
      aria-label={ariaLabel}
      className={`flex flex-wrap items-center gap-2 text-sm text-slate-600 ${className}`}
    >
      {items.map((item) => {
        const config = LEGEND_CONFIG[item];

        return (
          <LegendItem
            key={item}
            className={config.className}
            label={config.label}
          />
        );
      })}
    </div>
  );
}

function LegendItem({
  className,
  label,
}: {
  className: string;
  label: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-3 py-1.5 font-semibold shadow-xs ${className}`}
    >
      {label}
    </span>
  );
}
