import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BookOpenText,
  BookmarkPlus,
  Copy,
  Database,
  Download,
  Files,
  GraduationCap,
  History,
  Home,
  Languages,
  ListChecks,
  MessageCircleQuestion,
  Monitor,
  Moon,
  Plus,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  Upload,
  Volume2,
  WifiOff,
  X,
} from 'lucide-react';
import {
  detectConversionDirection,
  getConversionQualityHints,
  traceConversion,
  ulyToIpa,
} from './lib/converter';
import { TextInput } from './components/TextInput';
import { ConversionOutput } from './components/ConversionOutput';
import { SpeakButton } from './components/SpeakButton';
import { DirectionControl } from './components/DirectionControl';
import { TtsSettingsPanel } from './components/TtsSettingsPanel';
import { LearnPanel } from './components/LearnPanel';
import { AlphabetPanel } from './components/AlphabetPanel';
import { DictionaryPanel } from './components/DictionaryPanel';
import { QuizPanel } from './components/QuizPanel';
import { useTtsStatus } from './hooks/useTtsStatus';
import { useThemeMode } from './hooks/useThemeMode';
import { createTtsProvider } from './lib/tts';
import { loadTtsSettings, type TtsSettings } from './lib/tts/settings';
import type { ThemeMode } from './lib/theme-settings';
import {
  addConversionHistoryEntry,
  clearConversionHistory,
  loadConversionHistory,
  saveConversionHistory,
  type ConversionHistoryEntry,
} from './lib/conversion-history';
import {
  addCustomTransliteration,
  applyCustomTransliterations,
  loadCustomTransliterations,
  removeCustomTransliteration,
  saveCustomTransliterations,
  type CustomTransliterationEntry,
} from './lib/custom-transliterations';
import {
  exportLocalProfileData,
  getQuizAccuracy,
  importLocalProfileData,
  loadDictionaryLookups,
  loadQuizProgress,
  type DictionaryLookupRecord,
  type QuizProgress,
} from './lib/local-profile';

type Direction = 'uey-to-uly' | 'uly-to-uey';
type View = 'home' | 'convert' | 'learn' | 'quiz' | 'alphabet' | 'dictionary';

interface InitialState {
  direction: Direction;
  input: string;
  lookupQuery: string;
  view: View;
}

const BUTTON_CLASS =
  'inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';
const FOOTER_LINK_CLASS =
  'inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-xs transition hover:border-slate-300 hover:bg-slate-50';

export default function App() {
  const initial = useMemo(readInitialState, []);
  const [themeMode, setThemeMode] = useThemeMode();
  const [activeView, setActiveView] = useState<View>(initial.view);
  const [direction, setDirection] = useState<Direction>(initial.direction);
  const [input, setInput] = useState(initial.input);
  const [lookupQuery, setLookupQuery] = useState(initial.lookupQuery);
  const [ttsSettings, setTtsSettings] =
    useState<TtsSettings>(loadTtsSettings);
  const [history, setHistory] = useState<ConversionHistoryEntry[]>(
    loadConversionHistory,
  );
  const [customEntries, setCustomEntries] = useState<
    CustomTransliterationEntry[]
  >(loadCustomTransliterations);
  const [customUey, setCustomUey] = useState('');
  const [customUly, setCustomUly] = useState('');
  const [notice, setNotice] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const tts = useMemo(
    () => createTtsProvider(ttsSettings),
    [ttsSettings],
  );
  const { isAvailable, hasUyghurVoice } = useTtsStatus(tts);

  const activeDirection =
    activeView === 'learn' ? 'uly-to-uey' : direction;
  const conversionInput = useMemo(
    () =>
      activeView === 'convert'
        ? applyCustomTransliterations(input, activeDirection, customEntries)
        : input,
    [activeDirection, activeView, customEntries, input],
  );
  const trace = useMemo(
    () => traceConversion(conversionInput, activeDirection),
    [conversionInput, activeDirection],
  );
  const detectedDirection = useMemo(
    () => detectConversionDirection(input),
    [input],
  );
  const output = trace.output;

  const ueyText = activeDirection === 'uey-to-uly' ? input : output;
  const ulyText = activeDirection === 'uey-to-uly' ? output : input;
  const ipaText = useMemo(() => ulyToIpa(ulyText).trim(), [ulyText]);
  const inputMode = activeDirection === 'uey-to-uly' ? 'uey' : 'uly';
  const outputMode = activeDirection === 'uey-to-uly' ? 'uly' : 'uey';
  const lineCount = input ? input.split(/\r\n|\r|\n/).length : 0;
  const characterCount = input.length;
  const lookupWords = useMemo(
    () => getLookupWords(output, outputMode),
    [output, outputMode],
  );
  const qualityHints = useMemo(
    () =>
      activeView === 'convert'
        ? getConversionQualityHints(input, activeDirection, detectedDirection)
        : [],
    [activeDirection, activeView, detectedDirection, input],
  );
  const showDetectedDirection =
    activeView === 'convert' &&
    detectedDirection.confidence === 'high' &&
    detectedDirection.direction;
  const hasTextWorkspaceActions =
    activeView === 'convert' || activeView === 'learn';

  useEffect(() => {
    if (activeView !== 'convert' || !input.trim() || !output.trim()) return;

    const timer = window.setTimeout(() => {
      setHistory((current) => {
        const next = addConversionHistoryEntry(current, {
          direction: activeDirection,
          input,
          output,
        });
        saveConversionHistory(next);
        return next;
      });
    }, 700);

    return () => window.clearTimeout(timer);
  }, [activeDirection, activeView, input, output]);

  const swap = () => {
    setInput(output);
    setDirection((d) => (d === 'uey-to-uly' ? 'uly-to-uey' : 'uey-to-uly'));
    showNotice('Direction swapped');
  };

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 1800);
  };

  const handleInputChange = (value: string) => {
    setInput(value);

    if (activeView !== 'convert') return;

    const detected = detectConversionDirection(value);
    if (
      detected.confidence === 'high' &&
      detected.direction &&
      detected.direction !== direction
    ) {
      setDirection(detected.direction);
      showNotice(
        detected.direction === 'uey-to-uly'
          ? 'Detected UEY input'
          : 'Detected ULY input',
      );
    }
  };

  const clearInput = () => {
    setInput('');
    setLookupQuery('');
    showNotice('Text cleared');
  };

  const pasteClipboardText = async () => {
    if (!navigator.clipboard?.readText) {
      showNotice('Clipboard paste unavailable');
      return;
    }

    try {
      const text = await navigator.clipboard.readText();
      handleInputChange(text);
      showNotice('Clipboard pasted');
    } catch {
      showNotice('Clipboard paste blocked');
    }
  };

  const lookupOutputWord = (word: string) => {
    setLookupQuery(word);
    showNotice(`Looking up ${word}`);
  };

  const copyText = async (text: string, label: string) => {
    if (!text) return;
    if (!navigator.clipboard?.writeText) {
      showNotice('Clipboard copy unavailable');
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      showNotice(`${label} copied`);
    } catch {
      showNotice('Clipboard copy blocked');
    }
  };

  const copyShareLink = async () => {
    if (!navigator.clipboard?.writeText) {
      showNotice('Clipboard copy unavailable');
      return;
    }

    const url = new URL(window.location.href);
    url.search = '';
    url.searchParams.set(
      'view',
      hasTextWorkspaceActions && input ? 'convert' : activeView,
    );
    url.searchParams.set('d', activeDirection);
    if (input) url.searchParams.set('text', input);
    if (lookupQuery) url.searchParams.set('lookup', lookupQuery);
    try {
      await navigator.clipboard.writeText(url.toString());
      showNotice('Share link copied');
    } catch {
      showNotice('Clipboard copy blocked');
    }
  };

  const downloadOutput = () => {
    if (!output) return;
    const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download =
      activeDirection === 'uey-to-uly'
        ? 'uybridge-output-uly.txt'
        : 'uybridge-output-uey.txt';
    link.click();
    URL.revokeObjectURL(url);
    showNotice('TXT downloaded');
  };

  const uploadTxt = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    handleInputChange(text);
    showNotice(`${file.name} loaded`);
  };

  const restoreHistoryEntry = (entry: ConversionHistoryEntry) => {
    setInput(entry.input);
    setDirection(entry.direction);
    setActiveView('convert');
    showNotice('History restored');
  };

  const clearHistory = () => {
    setHistory(clearConversionHistory());
    showNotice('History cleared');
  };

  const addCustomEntry = () => {
    const next = addCustomTransliteration(customEntries, {
      uey: customUey,
      uly: customUly,
    });

    setCustomEntries(saveCustomTransliterations(next));
    setCustomUey('');
    setCustomUly('');
    showNotice('Custom word saved');
  };

  const removeCustomEntry = (id: string) => {
    const next = removeCustomTransliteration(customEntries, id);
    setCustomEntries(saveCustomTransliterations(next));
    showNotice('Custom word removed');
  };

  const openLearnView = () => {
    if (direction === 'uey-to-uly' && input) {
      const uly = traceConversion(input, 'uey-to-uly').output;
      setInput(uly);
      setDirection('uly-to-uey');
    }
    setActiveView('learn');
  };

  const studyDictionaryEntry = (uly: string) => {
    setInput(uly);
    setDirection('uly-to-uey');
    setActiveView('learn');
  };

  const convertDictionaryEntry = (uey: string) => {
    setInput(uey);
    setDirection('uey-to-uly');
    setActiveView('convert');
  };

  const showVoiceWarning = isAvailable && hasUyghurVoice === false;
  const showUnsupportedWarning = !isAvailable;

  return (
    <div className="min-h-full bg-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveView('home')}
                className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-600 text-white shadow-xs transition hover:bg-indigo-700"
                aria-label="Open home"
              >
                <Languages className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setActiveView('home')}
                className="text-left text-3xl font-bold tracking-tight text-slate-950 transition hover:text-indigo-700"
              >
                UG Bridge
              </button>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Convert between UEY (Uyghur Arabic script) and ULY (Uyghur Latin
              alphabet), search a Uyghur-English dictionary, and study Uyghur
              script.
            </p>
          </div>

          <div className="flex flex-col gap-3 md:items-end">
            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              <ThemeToggle mode={themeMode} onChange={setThemeMode} />
              <GitHubLink />
            </div>
            <AppTabs
              activeView={activeView}
              onConvert={() => setActiveView('convert')}
              onLearn={openLearnView}
              onQuiz={() => setActiveView('quiz')}
              onAlphabet={() => setActiveView('alphabet')}
              onDictionary={() => setActiveView('dictionary')}
            />
          </div>
        </header>

        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          {activeView === 'home' ? (
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-xs ring-1 ring-slate-200">
              <Home className="h-4 w-4" aria-hidden="true" />
              Home
            </div>
          ) : activeView === 'convert' ? (
            <DirectionControl direction={direction} onSwap={swap} />
          ) : activeView === 'learn' ? (
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700">
              <GraduationCap className="h-4 w-4" aria-hidden="true" />
              ULY to UEY study mode
            </div>
          ) : activeView === 'quiz' ? (
            <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700">
              <ListChecks className="h-4 w-4" aria-hidden="true" />
              UEY quiz
            </div>
          ) : activeView === 'alphabet' ? (
            <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700">
              <BookOpenText className="h-4 w-4" aria-hidden="true" />
              Alphabet explorer
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
              <Search className="h-4 w-4" aria-hidden="true" />
              Local dictionary
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {hasTextWorkspaceActions && (
              <SpeakButton
                text={ueyText}
                isAvailable={isAvailable}
                tts={tts}
              />
            )}
            {(hasTextWorkspaceActions || activeView === 'dictionary') && (
              <button
                type="button"
                onClick={clearInput}
                disabled={!input}
                className={BUTTON_CLASS}
              >
                <X className="h-4 w-4" aria-hidden="true" />
                Clear
              </button>
            )}
            {hasTextWorkspaceActions && (
              <>
                <button
                  type="button"
                  onClick={() => copyText(ueyText, 'UEY')}
                  disabled={!ueyText}
                  className={BUTTON_CLASS}
                >
                  <Copy className="h-4 w-4" aria-hidden="true" />
                  Copy UEY
                </button>
                <button
                  type="button"
                  onClick={() => copyText(ulyText, 'ULY')}
                  disabled={!ulyText}
                  className={BUTTON_CLASS}
                >
                  <Copy className="h-4 w-4" aria-hidden="true" />
                  Copy ULY
                </button>
                <button
                  type="button"
                  onClick={() =>
                    copyText(`UEY:\n${ueyText}\n\nULY:\n${ulyText}`, 'Both')
                  }
                  disabled={!ueyText && !ulyText}
                  className={BUTTON_CLASS}
                >
                  <Files className="h-4 w-4" aria-hidden="true" />
                  Copy both
                </button>
              </>
            )}
            <button
              type="button"
              onClick={copyShareLink}
              className={BUTTON_CLASS}
            >
              <Share2 className="h-4 w-4" aria-hidden="true" />
              Share
            </button>
            {hasTextWorkspaceActions && (
              <>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={BUTTON_CLASS}
                >
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  Upload TXT
                </button>
                <button
                  type="button"
                  onClick={downloadOutput}
                  disabled={!output}
                  className={BUTTON_CLASS}
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Download TXT
                </button>
                <TtsSettingsPanel
                  settings={ttsSettings}
                  onChange={setTtsSettings}
                />
              </>
            )}
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,text/plain"
          className="hidden"
          onChange={(event) => {
            uploadTxt(event.target.files?.[0]);
            event.target.value = '';
          }}
        />

        {(notice ||
          lineCount > 1 ||
          showDetectedDirection ||
          qualityHints.length > 0) && (
          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
            {notice && (
              <span
                role="status"
                aria-live="polite"
                className="rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700"
              >
                {notice}
              </span>
            )}
            {lineCount > 1 && (
              <span className="rounded-full bg-slate-200 px-3 py-1 font-medium text-slate-600">
                {lineCount} lines
              </span>
            )}
            {showDetectedDirection && (
              <button
                type="button"
                onClick={() => setDirection(detectedDirection.direction!)}
                disabled={detectedDirection.direction === direction}
                className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 font-medium text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-default disabled:bg-indigo-50 disabled:text-indigo-700"
                title={detectedDirection.reason}
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                {detectedDirection.direction === 'uey-to-uly'
                  ? 'Detected UEY'
                  : 'Detected ULY'}
              </button>
            )}
            {qualityHints.map((hint) => (
              <span
                key={`${hint.level}-${hint.message}`}
                title={hint.detail}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 font-medium ${
                  hint.level === 'warning'
                    ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-200'
                    : 'bg-sky-50 text-sky-700 ring-1 ring-sky-100'
                }`}
              >
                {hint.level === 'warning' ? (
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {hint.message}
              </span>
            ))}
          </div>
        )}

        {activeView !== 'home' &&
          activeView !== 'dictionary' &&
          activeView !== 'alphabet' &&
          activeView !== 'quiz' &&
          (showVoiceWarning || showUnsupportedWarning) && (
          <div
            role="status"
            className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"
          >
            {showUnsupportedWarning
              ? 'Speech synthesis is not supported in this browser.'
              : 'No Uyghur voice detected on this device; use TTS API for reliable speech.'}
          </div>
        )}

        {activeView === 'home' ? (
          <HomePanel
            onConvert={() => setActiveView('convert')}
            onDictionary={() => setActiveView('dictionary')}
            onLearn={openLearnView}
            onQuiz={() => setActiveView('quiz')}
            onAlphabet={() => setActiveView('alphabet')}
            dictionaryQuery={input}
            onDictionaryQueryChange={setInput}
            onStudy={studyDictionaryEntry}
            onConvertDictionaryEntry={convertDictionaryEntry}
          />
        ) : activeView === 'convert' ? (
          <>
            <div className="grid gap-6 md:grid-cols-2">
              <TextInput
                mode={inputMode}
                value={input}
                onChange={handleInputChange}
                lineCount={lineCount}
                characterCount={characterCount}
                onClear={clearInput}
                onPasteClipboard={pasteClipboardText}
              />
              <ConversionOutput
                mode={outputMode}
                value={output}
                ipa={ipaText}
                trace={trace}
                lookupWords={lookupWords}
                onLookupWord={lookupOutputWord}
              />
            </div>
            {lookupQuery ? (
              <section
                aria-label="Inline dictionary lookup"
                className="mt-6 grid gap-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="inline-flex max-w-full flex-wrap items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-xs ring-1 ring-slate-200">
                    <Search
                      className="h-4 w-4 text-indigo-600"
                      aria-hidden="true"
                    />
                    Dictionary lookup:{' '}
                    <span className="break-all text-indigo-700">
                      {lookupQuery}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLookupQuery('')}
                    className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-slate-500 transition hover:bg-slate-200"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                    Hide lookup
                  </button>
                </div>
                <DictionaryPanel
                  query={lookupQuery}
                  onQueryChange={setLookupQuery}
                  onStudy={studyDictionaryEntry}
                  onConvert={convertDictionaryEntry}
                />
              </section>
            ) : null}
            <HighlightLegend />
            <CustomTransliterationPanel
              entries={customEntries}
              uey={customUey}
              uly={customUly}
              onUeyChange={setCustomUey}
              onUlyChange={setCustomUly}
              onAdd={addCustomEntry}
              onRemove={removeCustomEntry}
            />
            <ConversionHistoryPanel
              history={history}
              onRestore={restoreHistoryEntry}
              onClear={clearHistory}
            />
          </>
        ) : activeView === 'learn' ? (
          <LearnPanel trace={trace} value={input} onChange={setInput} />
        ) : activeView === 'quiz' ? (
          <QuizPanel />
        ) : activeView === 'alphabet' ? (
          <AlphabetPanel />
        ) : (
          <DictionaryPanel
            query={input}
            onQueryChange={setInput}
            onStudy={studyDictionaryEntry}
            onConvert={convertDictionaryEntry}
          />
        )}
      </div>
    </div>
  );
}

function AppTabs({
  activeView,
  onConvert,
  onLearn,
  onQuiz,
  onAlphabet,
  onDictionary,
}: {
  activeView: View;
  onConvert: () => void;
  onLearn: () => void;
  onQuiz: () => void;
  onAlphabet: () => void;
  onDictionary: () => void;
}) {
  const tabIndexByView: Partial<Record<View, number>> = {
    convert: 0,
    learn: 1,
    quiz: 2,
    alphabet: 3,
    dictionary: 4,
  };
  const activeIndex = tabIndexByView[activeView];
  const tabClass = (view: View) =>
    `relative z-10 inline-flex items-center justify-center gap-0.5 rounded-full px-0.5 py-2 text-[0.6rem] font-semibold transition-colors duration-200 sm:gap-1.5 sm:px-3 sm:text-sm ${
      activeView === view
        ? 'text-white'
        : 'text-slate-600 hover:bg-slate-50'
    }`;

  return (
    <nav
      aria-label="Workspace"
      className="relative grid w-full grid-cols-5 overflow-hidden rounded-full border border-slate-200 bg-white p-1 shadow-xs md:w-176"
    >
      {activeIndex !== undefined && (
        <span
          className="pointer-events-none absolute inset-y-1 left-1 rounded-full bg-indigo-600 shadow-xs transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
          style={{
            width: 'calc((100% - 0.5rem) / 5)',
            transform: `translateX(${activeIndex * 100}%)`,
          }}
          aria-hidden="true"
        />
      )}
      <button
        type="button"
        onClick={onConvert}
        aria-current={activeView === 'convert' ? 'page' : undefined}
        className={tabClass('convert')}
      >
        <Languages className="h-4 w-4 shrink-0" aria-hidden="true" />
        Convert
      </button>
      <button
        type="button"
        onClick={onLearn}
        aria-current={activeView === 'learn' ? 'page' : undefined}
        className={tabClass('learn')}
      >
        <GraduationCap className="h-4 w-4 shrink-0" aria-hidden="true" />
        Learn UEY
      </button>
      <button
        type="button"
        onClick={onQuiz}
        aria-current={activeView === 'quiz' ? 'page' : undefined}
        className={tabClass('quiz')}
      >
        <ListChecks className="h-4 w-4 shrink-0" aria-hidden="true" />
        Quiz
      </button>
      <button
        type="button"
        onClick={onAlphabet}
        aria-current={activeView === 'alphabet' ? 'page' : undefined}
        className={tabClass('alphabet')}
      >
        <BookOpenText className="h-4 w-4 shrink-0" aria-hidden="true" />
        Alphabet
      </button>
      <button
        type="button"
        onClick={onDictionary}
        aria-current={activeView === 'dictionary' ? 'page' : undefined}
        className={tabClass('dictionary')}
      >
        <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
        Dictionary
      </button>
    </nav>
  );
}

function HomePanel({
  onConvert,
  onDictionary,
  onLearn,
  onQuiz,
  onAlphabet,
  dictionaryQuery,
  onDictionaryQueryChange,
  onStudy,
  onConvertDictionaryEntry,
}: {
  onConvert: () => void;
  onDictionary: () => void;
  onLearn: () => void;
  onQuiz: () => void;
  onAlphabet: () => void;
  dictionaryQuery: string;
  onDictionaryQueryChange: (value: string) => void;
  onStudy: (uly: string) => void;
  onConvertDictionaryEntry: (uey: string) => void;
}) {
  return (
    <main className="grid gap-6">
      <LocalProfilePanel
        onOpenLookup={(query) => {
          onDictionaryQueryChange(query);
          onDictionary();
        }}
      />

      <section className="grid gap-5 py-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)] lg:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">
            Uyghur script workspace
          </p>
          <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Convert, search, and study Uyghur across UEY and ULY.
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
            UEY is the Uyghur Arabic-script writing system. ULY is Uyghur
            written with the Latin alphabet. UG Bridge keeps both forms visible
            for conversion, dictionary lookup, alphabet study, IPA hints, and
            speech playback.
          </p>
          <HomeCapabilityStrip className="mt-5" />
          <ScriptGlossary />
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onConvert}
              className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              Start converting
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onDictionary}
              className={BUTTON_CLASS}
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              Search dictionary
            </button>
          </div>
        </div>

        <HomePreview />
      </section>

      <section className="grid gap-3" aria-label="Home dictionary search">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">
              Dictionary
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Search UEY, ULY, or English from the home screen.
            </p>
          </div>
          <button
            type="button"
            onClick={onDictionary}
            className={BUTTON_CLASS}
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            Open full dictionary
          </button>
        </div>
        <DictionaryPanel
          query={dictionaryQuery}
          onQueryChange={onDictionaryQueryChange}
          onStudy={onStudy}
          onConvert={onConvertDictionaryEntry}
        />
      </section>

      <section className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
        <HomeFeature
          icon={<Languages className="h-5 w-5" aria-hidden="true" />}
          title="Convert"
          description="Switch UEY and ULY text with visible letter-by-letter mapping."
          onClick={onConvert}
        />
        <HomeFeature
          icon={<Search className="h-5 w-5" aria-hidden="true" />}
          title="Dictionary"
          description="Look up Uyghur headwords from UEY, ULY, or English input."
          onClick={onDictionary}
        />
        <HomeFeature
          icon={<GraduationCap className="h-5 w-5" aria-hidden="true" />}
          title="Learn UEY"
          description="Break ULY words into UEY letters, shapes, and IPA hints."
          onClick={onLearn}
        />
        <HomeFeature
          icon={<ListChecks className="h-5 w-5" aria-hidden="true" />}
          title="Quiz"
          description="Practice all 32 UEY sounds across four presentation forms."
          onClick={onQuiz}
        />
        <HomeFeature
          icon={<BookOpenText className="h-5 w-5" aria-hidden="true" />}
          title="Alphabet"
          description="Study all 32 letters, examples, joining forms, and vowels."
          onClick={onAlphabet}
        />
      </section>

      <HomeFooter />
    </main>
  );
}

function HomeFooter() {
  return (
    <footer className="mt-2 grid gap-4 border-t border-slate-200 py-5 text-sm text-slate-500 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
      <div className="grid gap-2">
        <p className="font-semibold text-slate-700">UG Bridge © 2026</p>
        <p className="inline-flex items-center gap-2 font-semibold text-slate-700">
          <AlertTriangle className="size-4 text-amber-600" aria-hidden="true" />
          Disclaimer
        </p>
        <p className="max-w-3xl leading-6">
          UG Bridge is a best-effort tool for transliteration, dictionary
          lookup, script study, and speech experiments. Verify important
          academic, legal, medical, or official use with qualified sources.
        </p>
        <p className="max-w-3xl leading-6">
          App source is licensed under GPLv3, so redistributed modified
          versions must remain GPLv3 and include source code. Dictionary data is
          derived from an Apache-2.0 Uyghur-English dataset.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 md:justify-end">
        <a
          href="https://github.com/reindex3/ugbridge/issues/new"
          target="_blank"
          rel="noreferrer"
          className={FOOTER_LINK_CLASS}
        >
          <MessageCircleQuestion className="size-4" aria-hidden="true" />
          Contact
        </a>
        <a
          href="https://www.gnu.org/licenses/gpl-3.0.html"
          target="_blank"
          rel="noreferrer"
          className={FOOTER_LINK_CLASS}
        >
          <ShieldCheck className="size-4" aria-hidden="true" />
          GPLv3 license
        </a>
        <a
          href="https://huggingface.co/datasets/anke01/uyghur-dictionary-dataset"
          target="_blank"
          rel="noreferrer"
          className={FOOTER_LINK_CLASS}
        >
          <Database className="size-4" aria-hidden="true" />
          Dictionary source
        </a>
      </div>
    </footer>
  );
}

function LocalProfilePanel({
  onOpenLookup,
}: {
  onOpenLookup: (query: string) => void;
}) {
  const [lookups, setLookups] = useState<DictionaryLookupRecord[]>(
    loadDictionaryLookups,
  );
  const [quizProgress, setQuizProgress] =
    useState<QuizProgress>(loadQuizProgress);
  const [status, setStatus] = useState('');
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const accuracy = getQuizAccuracy(quizProgress);
  const topLookups = lookups.slice(0, 6);

  const showStatus = (message: string) => {
    setStatus(message);
    window.setTimeout(() => setStatus(''), 1800);
  };

  const exportProfile = () => {
    const data = exportLocalProfileData();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ugbridge-local-profile.json';
    link.click();
    URL.revokeObjectURL(url);
    showStatus('Local profile exported');
  };

  const importProfile = async (file: File | undefined) => {
    if (!file) return;

    try {
      const imported = importLocalProfileData(JSON.parse(await file.text()));
      setLookups(imported.dictionaryLookups);
      setQuizProgress(imported.quizProgress);
      showStatus('Local profile imported');
    } catch {
      showStatus('Import failed');
    }
  };

  return (
    <section className="rounded-lg border-2 border-emerald-200 bg-white p-5 shadow-sm ring-4 ring-emerald-50">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-emerald-600 text-white shadow-xs">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
              Privacy-first local profile
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
              Local study profile
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              To avoid retaining study data on a backend, UG Bridge stores
              dictionary lookups and quiz progress only in this browser. Export
              JSON when you want a portable backup.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportProfile}
            className={BUTTON_CLASS}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Export JSON
          </button>
          <button
            type="button"
            onClick={() => importInputRef.current?.click()}
            className={BUTTON_CLASS}
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            Import JSON
          </button>
        </div>
      </div>

      <input
        ref={importInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => {
          importProfile(event.target.files?.[0]);
          event.target.value = '';
        }}
      />

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <LocalProfileStat
          label="Saved lookups"
          value={String(lookups.length)}
          detail={lookups.length ? `${lookups[0].uly} most recent` : 'No words yet'}
        />
        <LocalProfileStat
          label="Quiz answered"
          value={String(quizProgress.answered)}
          detail={
            quizProgress.answered
              ? `${accuracy}% correct · best streak ${quizProgress.bestStreak}`
              : 'No answers yet'
          }
        />
        <LocalProfileStat
          label="Needs review"
          value={String(quizProgress.missedItems.length)}
          detail={
            quizProgress.missedItems[0]
              ? `${quizProgress.missedItems[0].token} · ${quizProgress.missedItems[0].form}`
              : 'No misses saved'
          }
        />
      </div>

      {topLookups.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {topLookups.map((lookup) => (
            <button
              key={lookup.id}
              type="button"
              onClick={() => onOpenLookup(lookup.query || lookup.uly)}
              className="max-w-full rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-left text-xs font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
              title={`${lookup.uly} · ${lookup.definition}`}
            >
              <span dir="rtl" lang="ug">
                {lookup.uey}
              </span>{' '}
              · {lookup.uly}
              {lookup.count > 1 ? ` · ${lookup.count}x` : ''}
            </button>
          ))}
        </div>
      ) : null}

      {status ? (
        <div
          role="status"
          aria-live="polite"
          className="mt-3 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
        >
          {status}
        </div>
      ) : null}
    </section>
  );
}

function LocalProfileStat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="border-l-2 border-emerald-200 bg-emerald-50/70 px-3 py-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold text-slate-950">{value}</div>
      <div className="mt-1 min-h-5 truncate text-xs font-medium text-slate-500">
        {detail}
      </div>
    </div>
  );
}

function HomePreview() {
  return (
    <div className="rounded-lg bg-white p-4 shadow-xs ring-1 ring-slate-200">
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          Live bridge
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
          Offline core
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>UEY</span>
            <Languages className="h-4 w-4 text-indigo-600" aria-hidden="true" />
          </div>
          <div dir="rtl" lang="ug" className="text-4xl leading-relaxed text-slate-950">
            ئۇيغۇرچە يېزىق
          </div>
        </div>

        <div className="grid items-center gap-2 sm:grid-cols-[1fr_auto_1fr]">
          <div className="rounded-md bg-white p-3 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              ULY
            </div>
            <div className="mt-1 font-mono text-lg font-semibold text-indigo-700">
              uyghurche yéziq
            </div>
          </div>
          <div className="grid place-items-center text-indigo-600">
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="rounded-md bg-white p-3 ring-1 ring-slate-200">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              IPA
            </div>
            <div className="mt-1 font-mono text-sm font-semibold text-emerald-700">
              /jɑχʃimusiz/
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {['ئا', 'ب', 'چ', 'غ', 'ق', 'ڭ', 'ئې', 'ي'].map((letter) => (
            <span
              key={letter}
              dir="rtl"
              lang="ug"
              className="grid h-12 place-items-center rounded-md bg-white text-2xl text-slate-900 ring-1 ring-slate-200"
            >
              {letter}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function HomeCapabilityStrip({ className = '' }: { className?: string }) {
  return (
    <section
      aria-label="UG Bridge capabilities"
      className={`grid gap-2 sm:grid-cols-3 ${className}`}
    >
      <CapabilityPill
        icon={<Database className="h-4 w-4" aria-hidden="true" />}
        title="350k headwords"
        detail="Lazy dictionary shards"
      />
      <CapabilityPill
        icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}
        title="Local first"
        detail="History and custom words stay here"
      />
      <CapabilityPill
        icon={<Volume2 className="h-4 w-4" aria-hidden="true" />}
        title="Speech ready"
        detail="Browser or custom TTS endpoint"
      />
    </section>
  );
}

function CapabilityPill({
  icon,
  title,
  detail,
}: {
  icon: ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-3 shadow-xs">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-indigo-50 text-indigo-700">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold leading-tight text-slate-950">
          {title}
        </span>
        <span className="mt-0.5 block text-xs leading-snug text-slate-500">
          {detail}
        </span>
      </span>
    </div>
  );
}

function ScriptGlossary() {
  return (
    <dl className="mt-5 grid gap-2 text-sm sm:grid-cols-2">
      <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
        <dt className="font-semibold text-slate-950">UEY</dt>
        <dd className="mt-1 leading-6 text-slate-600">
          Uyghur Ereb Yéziqi, the Arabic-based script commonly used for Uyghur.
        </dd>
      </div>
      <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
        <dt className="font-semibold text-slate-950">ULY</dt>
        <dd className="mt-1 leading-6 text-slate-600">
          Uyghur Latin Yéziqi, a Latin-alphabet writing system for Uyghur.
        </dd>
      </div>
    </dl>
  );
}

function HomeFeature({
  icon,
  title,
  description,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-40 rounded-lg border border-slate-200 bg-white p-4 text-left shadow-xs transition hover:border-indigo-200 hover:bg-indigo-50"
    >
      <span className="grid h-10 w-10 place-items-center rounded-md bg-slate-100 text-slate-700">
        {icon}
      </span>
      <span className="mt-4 block text-base font-semibold text-slate-950">
        {title}
      </span>
      <span className="mt-2 block text-sm leading-6 text-slate-500">
        {description}
      </span>
    </button>
  );
}

function ThemeToggle({
  mode,
  onChange,
}: {
  mode: ThemeMode;
  onChange: (mode: ThemeMode) => void;
}) {
  const modes = [
    { value: 'system', label: 'System', Icon: Monitor },
    { value: 'light', label: 'Day', Icon: Sun },
    { value: 'dark', label: 'Night', Icon: Moon },
  ] as const;
  const activeIndex = Math.max(
    modes.findIndex((entry) => entry.value === mode),
    0,
  );
  const activeMode = modes[activeIndex];
  const nextMode = modes[(activeIndex + 1) % modes.length];
  const toggleLabel = `Theme mode: ${activeMode.label}. Switch to ${nextMode.label}.`;

  return (
    <button
      type="button"
      onClick={() => onChange(nextMode.value)}
      aria-label={toggleLabel}
      title={toggleLabel}
      className="relative grid h-10 w-32 grid-cols-3 items-center overflow-hidden rounded-full border border-slate-200 bg-white p-1 text-slate-500 shadow-xs transition hover:border-slate-300 hover:bg-slate-50"
    >
      <span
        className="absolute inset-y-1 left-1 rounded-full bg-indigo-600 shadow-xs transition-transform duration-200 ease-out"
        style={{
          width: 'calc((100% - 0.5rem) / 3)',
          transform: `translateX(${activeIndex * 100}%)`,
        }}
        aria-hidden="true"
      />
      {modes.map(({ value, Icon }) => {
        const isActive = mode === value;
        return (
          <span
            key={value}
            className={`relative z-10 inline-flex items-center justify-center transition ${
              isActive ? 'text-white' : 'text-slate-500'
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        );
      })}
    </button>
  );
}

function GitHubLink() {
  return (
    <a
      href="https://github.com/reindex3/ugbridge"
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-xs transition hover:border-slate-300 hover:bg-slate-50 md:self-end"
    >
      <GitHubIcon className="h-4 w-4" />
      GitHub
    </a>
  );
}

function GitHubIcon({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.48 2 2 6.58 2 12.23c0 4.52 2.87 8.35 6.84 9.71.5.1.68-.22.68-.49 0-.24-.01-.89-.01-1.75-2.78.62-3.37-1.37-3.37-1.37-.45-1.19-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.4 9.4 0 0 1 12 6.93c.85 0 1.71.12 2.51.35 1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.79-4.57 5.05.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.59.69.49A10.05 10.05 0 0 0 22 12.23C22 6.58 17.52 2 12 2Z"
      />
    </svg>
  );
}

function HighlightLegend() {
  return (
    <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
      <LegendItem className="bg-sky-100 text-sky-950" label="letter" />
      <LegendItem className="bg-violet-100 text-violet-950" label="digraph" />
      <LegendItem className="bg-emerald-100 text-emerald-950" label="vowel" />
      <LegendItem
        className="bg-amber-100 text-amber-950"
        label="initial vowel"
      />
      <LegendItem
        className="bg-rose-100 text-rose-950"
        label="punctuation"
      />
    </div>
  );
}

function CustomTransliterationPanel({
  entries,
  uey,
  uly,
  onUeyChange,
  onUlyChange,
  onAdd,
  onRemove,
}: {
  entries: CustomTransliterationEntry[];
  uey: string;
  uly: string;
  onUeyChange: (value: string) => void;
  onUlyChange: (value: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  const canAdd = Boolean(uey.trim() && uly.trim());

  return (
    <section
      aria-label="Custom transliterations"
      className="mt-6 rounded-lg border border-slate-200 bg-white p-3 shadow-xs"
    >
      <div className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
        <BookmarkPlus className="h-4 w-4 text-slate-400" aria-hidden="true" />
        Custom words
      </div>

      <form
        className="grid gap-2 md:grid-cols-[1fr_1fr_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          if (canAdd) onAdd();
        }}
      >
        <input
          type="text"
          value={uey}
          onChange={(event) => onUeyChange(event.target.value)}
          dir="rtl"
          lang="ug"
          placeholder="قەشقەر"
          className="min-w-0 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-hidden transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          aria-label="Custom UEY word"
        />
        <input
          type="text"
          value={uly}
          onChange={(event) => onUlyChange(event.target.value)}
          placeholder="Kashgar"
          className="min-w-0 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-hidden transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          aria-label="Custom ULY word"
        />
        <button
          type="submit"
          disabled={!canAdd}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add
        </button>
      </form>

      {entries.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {entries.map((entry) => (
            <span
              key={entry.id}
              className="inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700"
            >
              <span className="truncate">
                <span dir="rtl" lang="ug">
                  {entry.uey}
                </span>{' '}
                → {entry.uly}
              </span>
              <button
                type="button"
                onClick={() => onRemove(entry.id)}
                className="rounded-full p-0.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
                aria-label={`Remove custom word ${entry.uly}`}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function ConversionHistoryPanel({
  history,
  onRestore,
  onClear,
}: {
  history: ConversionHistoryEntry[];
  onRestore: (entry: ConversionHistoryEntry) => void;
  onClear: () => void;
}) {
  if (!history.length) return null;

  return (
    <section
      aria-label="Recent conversions"
      className="mt-6 rounded-lg border border-slate-200 bg-white p-3 shadow-xs"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
          <History className="h-4 w-4 text-slate-400" aria-hidden="true" />
          Recent
        </div>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          Clear
        </button>
      </div>
      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
        {history.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => onRestore(entry)}
            className="min-w-0 rounded-md border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-indigo-200 hover:bg-indigo-50"
          >
            <span className="mb-2 inline-flex rounded-full bg-white px-2 py-0.5 text-[0.7rem] font-semibold text-slate-500 shadow-xs">
              {entry.direction === 'uey-to-uly' ? 'UEY → ULY' : 'ULY → UEY'}
            </span>
            <span className="block truncate text-sm font-medium text-slate-900">
              {entry.input}
            </span>
            <span className="mt-1 block truncate text-xs text-slate-500">
              {entry.output}
            </span>
          </button>
        ))}
      </div>
    </section>
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
    <span className={`rounded-sm px-2 py-1 font-medium ${className}`}>
      {label}
    </span>
  );
}

function getLookupWords(text: string, mode: 'uey' | 'uly') {
  const pattern =
    mode === 'uey'
      ? /[\u0600-\u06ff\u0750-\u077f]+/g
      : /[A-Za-zéëöüÉËÖÜ]+/g;
  const seen = new Set<string>();
  const words: string[] = [];

  for (const match of text.matchAll(pattern)) {
    const word = match[0].trim();
    const key = mode === 'uly' ? word.toLocaleLowerCase() : word;
    if (word.length < 2 || seen.has(key)) continue;
    seen.add(key);
    words.push(word);
    if (words.length >= 18) break;
  }

  return words;
}

function readInitialState(): InitialState {
  if (typeof window === 'undefined') {
    return { direction: 'uey-to-uly', input: '', lookupQuery: '', view: 'home' };
  }

  const params = new URLSearchParams(window.location.search);
  const direction =
    params.get('d') === 'uly-to-uey' ? 'uly-to-uey' : 'uey-to-uly';
  const viewParam = params.get('view');
  const view =
    viewParam === 'convert' ||
    viewParam === 'learn' ||
    viewParam === 'home' ||
    viewParam === 'quiz' ||
    viewParam === 'alphabet' ||
    viewParam === 'dictionary'
      ? viewParam
      : 'home';
  return {
    direction,
    view,
    input: params.get('text') ?? params.get('q') ?? '',
    lookupQuery: params.get('lookup') ?? '',
  };
}
