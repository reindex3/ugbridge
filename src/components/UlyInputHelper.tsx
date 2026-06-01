interface UlyInputHelperProps {
  onInsert: (text: string) => void;
  className?: string;
}

const ULY_INSERTS = ['é', 'ö', 'ü', 'sh', 'ch', 'gh', 'ng', 'zh'];

export function UlyInputHelper({ onInsert, className = '' }: UlyInputHelperProps) {
  return (
    <div className={`flex min-h-8 flex-wrap items-center gap-1.5 text-xs ${className}`}>
      <span className="mr-1 font-medium text-slate-500">Insert</span>
      {ULY_INSERTS.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onInsert(item)}
          className="min-w-8 rounded-md border border-slate-200 bg-white px-2 py-1 font-semibold text-slate-700 shadow-xs transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
        >
          {item}
        </button>
      ))}
      <span className="ml-1 text-slate-400">standard: é</span>
    </div>
  );
}
