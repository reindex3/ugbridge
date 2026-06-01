import { ArrowLeftRight } from 'lucide-react';

type Direction = 'uey-to-uly' | 'uly-to-uey';

interface DirectionControlProps {
  direction: Direction;
  onSwap: () => void;
}

export function DirectionControl({ direction, onSwap }: DirectionControlProps) {
  const leftLabel = direction === 'uey-to-uly' ? 'UEY' : 'ULY';
  const rightLabel = direction === 'uey-to-uly' ? 'ULY' : 'UEY';

  return (
    <button
      type="button"
      onClick={onSwap}
      className="group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm shadow-xs transition hover:border-indigo-400 hover:shadow-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-200"
      aria-label={`Swap conversion direction. Currently ${leftLabel} to ${rightLabel}.`}
      title="Click to swap direction"
    >
      <span className="font-semibold tracking-wide text-slate-900">
        {leftLabel}
      </span>
      <ArrowLeftRight
        className="h-4 w-4 text-slate-400 transition group-hover:text-indigo-500"
        aria-hidden="true"
      />
      <span className="font-semibold tracking-wide text-slate-900">
        {rightLabel}
      </span>
    </button>
  );
}
