import { useRef } from 'react';
import { UlyInputHelper } from './UlyInputHelper';

type ScriptMode = 'uey' | 'uly';

interface TextInputProps {
  mode: ScriptMode;
  value: string;
  onChange: (value: string) => void;
  lineCount?: number;
  characterCount?: number;
  onClear?: () => void;
  onPasteClipboard?: () => void;
}

const CONFIG: Record<
  ScriptMode,
  {
    dir: 'rtl' | 'ltr';
    lang: string;
    label: string;
    subtitle: string;
    placeholder: string;
  }
> = {
  uey: {
    dir: 'rtl',
    lang: 'ug',
    label: 'UEY',
    subtitle: 'Uyghur Arabic script',
    placeholder: 'ياخشىمۇسىز...',
  },
  uly: {
    dir: 'ltr',
    lang: 'en',
    label: 'ULY',
    subtitle: 'Uyghur Latin alphabet',
    placeholder: 'yaxshimusiz...',
  },
};

export function TextInput({
  mode,
  value,
  onChange,
  lineCount = 0,
  characterCount = 0,
  onClear,
  onPasteClipboard,
}: TextInputProps) {
  const config = CONFIG[mode];
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const hasClipboardRead =
    typeof navigator !== 'undefined' && Boolean(navigator.clipboard?.readText);

  const insertText = (text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(`${value}${text}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const next = `${value.slice(0, start)}${text}${value.slice(end)}`;
    onChange(next);
    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + text.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  return (
    <div className="min-w-0 flex flex-col gap-2">
      <div className="flex min-h-7 flex-wrap items-center justify-between gap-2">
        <label
          htmlFor="text-input"
          className="text-sm font-semibold text-slate-700"
        >
          {config.label}{' '}
          <span className="font-normal text-slate-400">
            · {config.subtitle}
          </span>
        </label>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {characterCount > 0 ? (
            <span className="text-slate-400">
              {lineCount.toLocaleString()} line{lineCount === 1 ? '' : 's'} ·{' '}
              {characterCount.toLocaleString()} chars
            </span>
          ) : null}
          {onPasteClipboard ? (
            <button
              type="button"
              onClick={onPasteClipboard}
              disabled={!hasClipboardRead}
              className="rounded-md px-2 py-1 font-medium text-indigo-600 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
            >
              Paste
            </button>
          ) : null}
          {onClear ? (
            <button
              type="button"
              onClick={onClear}
              disabled={!value}
              className="rounded-md px-2 py-1 font-medium text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>
      {mode === 'uly' ? <UlyInputHelper onInsert={insertText} /> : <div className="min-h-8" />}
      <textarea
        ref={textareaRef}
        id="text-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        dir={config.dir}
        lang={config.lang}
        placeholder={config.placeholder}
        className="h-72 w-full resize-y rounded-lg border border-slate-200 bg-white p-4 text-xl leading-relaxed text-slate-900 shadow-xs transition focus:border-indigo-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-200"
      />
    </div>
  );
}
