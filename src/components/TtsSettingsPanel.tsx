import { useEffect, useRef, useState } from 'react';
import { Settings } from 'lucide-react';
import {
  DEFAULT_TTS_VOICE,
  clearTtsSettings,
  saveTtsSettings,
  type TtsSettings,
} from '../lib/tts/settings';

interface TtsSettingsPanelProps {
  settings: TtsSettings;
  onChange: (settings: TtsSettings) => void;
}

const API_PRESETS = [
  {
    id: 'custom',
    label: 'Custom',
    endpoint: '',
    voice: DEFAULT_TTS_VOICE,
  },
  {
    id: 'local-mms',
    label: 'Local MMS',
    endpoint: 'http://127.0.0.1:7861/api/tts',
    voice: DEFAULT_TTS_VOICE,
  },
  {
    id: 'vite-edge',
    label: 'Vite Edge dev',
    endpoint: '/api/tts',
    voice: DEFAULT_TTS_VOICE,
  },
  {
    id: 'hf-space',
    label: 'HF Space proxy',
    endpoint: 'https://your-space.hf.space/api/tts',
    voice: DEFAULT_TTS_VOICE,
  },
] as const;

export function TtsSettingsPanel({
  settings,
  onChange,
}: TtsSettingsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState(settings);
  const [saved, setSaved] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const updateDraft = (patch: Partial<TtsSettings>) => {
    setSaved(false);
    setDraft((current) => ({ ...current, ...patch }));
  };

  const handleSave = () => {
    const next = saveTtsSettings(draft);
    onChange(next);
    setDraft(next);
    setSaved(true);
  };

  const handleClear = () => {
    const next = clearTtsSettings();
    onChange(next);
    setDraft(next);
    setSaved(true);
  };

  const apiEnabled = draft.mode === 'api';
  const presetId =
    API_PRESETS.find(
      (preset) => preset.endpoint && preset.endpoint === draft.endpoint,
    )?.id ?? 'custom';

  return (
    <div ref={panelRef} className="relative w-full md:w-auto">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-xs transition hover:bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-indigo-200"
        aria-expanded={isOpen}
      >
        <Settings className="h-4 w-4" aria-hidden="true" />
        TTS API
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-[calc(100vw-2rem)] max-w-md rounded-lg border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/10 ring-1 ring-slate-950/5 md:w-md">
          <div className="mb-3 grid grid-cols-2 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => updateDraft({ mode: 'browser' })}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                draft.mode === 'browser'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Browser
            </button>
            <button
              type="button"
              onClick={() => updateDraft({ mode: 'api' })}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                draft.mode === 'api'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Custom API
            </button>
          </div>

          <div className="grid gap-3">
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Preset
              <select
                value={presetId}
                onChange={(event) => {
                  const preset = API_PRESETS.find(
                    (item) => item.id === event.target.value,
                  );
                  if (!preset) return;
                  updateDraft({
                    mode: 'api',
                    endpoint: preset.endpoint || draft.endpoint,
                    voice: preset.voice,
                  });
                }}
                disabled={!apiEnabled}
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 shadow-xs outline-hidden transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100 disabled:text-slate-400"
              >
                {API_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Endpoint
              <input
                value={draft.endpoint}
                onChange={(e) =>
                  updateDraft({ endpoint: e.target.value, mode: 'api' })
                }
                disabled={!apiEnabled}
                placeholder="https://example.com/api/tts"
                inputMode="url"
                className="rounded-md border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900 shadow-xs outline-hidden transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100 disabled:text-slate-400"
              />
            </label>

            <label className="grid gap-1 text-sm font-medium text-slate-700">
              API key
              <input
                value={draft.apiKey}
                onChange={(e) => updateDraft({ apiKey: e.target.value })}
                disabled={!apiEnabled}
                placeholder="Optional bearer token"
                type="password"
                autoComplete="off"
                className="rounded-md border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900 shadow-xs outline-hidden transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100 disabled:text-slate-400"
              />
            </label>

            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Voice
              <input
                value={draft.voice}
                onChange={(e) => updateDraft({ voice: e.target.value })}
                disabled={!apiEnabled}
                placeholder="ug-CN-YilianNeural"
                className="rounded-md border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900 shadow-xs outline-hidden transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100 disabled:text-slate-400"
              />
            </label>
          </div>

          <p className="mt-3 text-xs leading-5 text-slate-500">
            Keys are saved only in this browser. Use restricted personal keys;
            public vendor APIs may still need a CORS-enabled proxy.
          </p>

          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleClear}
              className="rounded-md px-2 py-1 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            >
              Reset
            </button>
            <div className="flex items-center gap-3">
              {saved && (
                <span className="text-xs font-medium text-emerald-600">
                  Saved
                </span>
              )}
              <button
                type="button"
                onClick={handleSave}
                className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-xs transition hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-200"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
