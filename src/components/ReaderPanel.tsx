import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BookmarkPlus,
  Check,
  FileImage,
  GraduationCap,
  Languages,
  LoaderCircle,
  Repeat2,
  Search,
  ScanText,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import {
  getReaderOcrQuality,
  recognizeUeyImage,
  type ReaderOcrProgress,
} from '../lib/reader/ocr';
import type { ReaderTextAnalysis } from '../lib/reader';
import {
  useReaderAnalysis,
  type ReaderLookupMatch,
} from '../hooks/useReaderAnalysis';
import { getStudyWordProgressId } from '../lib/local-profile';

export type ReaderInputMode = 'text' | 'image';

interface ReaderPanelProps {
  value: string;
  mode: ReaderInputMode;
  onModeChange: (mode: ReaderInputMode) => void;
  onChange: (value: string) => void;
  onPasteClipboard: () => void;
  onClear: () => void;
  onOpenDictionary: (query: string) => void;
  onStudy: (uly: string) => void;
  onConvert: (uey: string) => void;
  onSaveWord: (uly: string) => void;
  savedStudyWordIds: readonly string[];
}

const TAB_CLASS =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition';

export function ReaderPanel({
  value,
  mode,
  onModeChange,
  onChange,
  onPasteClipboard,
  onClear,
  onOpenDictionary,
  onStudy,
  onConvert,
  onSaveWord,
  savedStudyWordIds,
}: ReaderPanelProps) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [ocrProgress, setOcrProgress] = useState<ReaderOcrProgress | null>(
    null,
  );
  const [ocrStatus, setOcrStatus] = useState('');
  const [ocrConfidence, setOcrConfidence] = useState<number | null>(null);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const {
    analysis,
    matches,
    isLoading,
    loadedShardCount,
    error,
  } = useReaderAnalysis(value);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  const chooseImage = (file: File | undefined) => {
    if (!file) return;
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
    setOcrProgress(null);
    setOcrConfidence(null);
    setOcrStatus(`${file.name} ready`);
  };

  const runOcr = async () => {
    if (!imageFile || isRecognizing) return;

    setIsRecognizing(true);
    setOcrStatus('Preparing OCR');
    setOcrProgress({ status: 'preparing', progress: 0 });
    setOcrConfidence(null);

    try {
      const result = await recognizeUeyImage(
        imageFile,
        (progress) => {
          setOcrProgress(progress);
          setOcrStatus(progress.status);
        },
      );
      if (result.text) {
        onChange(result.text);
        onModeChange('text');
        setOcrConfidence(result.confidence);
        setOcrStatus(getReaderOcrCompleteStatus(result));
      } else {
        setOcrStatus('No text recognized');
      }
    } catch {
      setOcrStatus('OCR failed');
    } finally {
      setIsRecognizing(false);
    }
  };

  return (
    <main className="grid gap-6">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-indigo-700">
              <ScanText className="h-3.5 w-3.5" aria-hidden="true" />
              Reader
            </div>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
              Text helper
            </h2>
          </div>

          <div
            className="grid grid-cols-2 rounded-lg border border-slate-200 bg-slate-50 p-1"
            aria-label="Reader input mode"
          >
            <button
              type="button"
              onClick={() => onModeChange('text')}
              className={`${TAB_CLASS} ${
                mode === 'text'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              aria-pressed={mode === 'text'}
            >
              <Languages className="h-4 w-4" aria-hidden="true" />
              Text
            </button>
            <button
              type="button"
              onClick={() => onModeChange('image')}
              className={`${TAB_CLASS} ${
                mode === 'image'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              aria-pressed={mode === 'image'}
            >
              <FileImage className="h-4 w-4" aria-hidden="true" />
              Image OCR
            </button>
          </div>
        </div>

        {mode === 'text' ? (
          <ReaderTextInput
            value={value}
            analysis={analysis}
            onChange={onChange}
            onPasteClipboard={onPasteClipboard}
            onClear={onClear}
          />
        ) : (
          <ReaderImageInput
            imageFile={imageFile}
            imagePreviewUrl={imagePreviewUrl}
            isRecognizing={isRecognizing}
            ocrProgress={ocrProgress}
            ocrStatus={ocrStatus}
            ocrConfidence={ocrConfidence}
            imageInputRef={imageInputRef}
            onChooseImage={chooseImage}
            onRunOcr={runOcr}
          />
        )}
      </section>

      {value.trim() ? (
        <>
          <ReaderSummary
            analysis={analysis}
            matchCount={Object.keys(matches).length}
            isLoading={isLoading}
            loadedShardCount={loadedShardCount}
            error={error}
          />
          <ReaderDualText analysis={analysis} />
          <ReaderWordAnalysis
            analysis={analysis}
            matches={matches}
            isLoading={isLoading}
            onOpenDictionary={onOpenDictionary}
            onStudy={onStudy}
            onConvert={onConvert}
            onSaveWord={onSaveWord}
            savedStudyWordIds={savedStudyWordIds}
          />
        </>
      ) : (
        <ReaderEmptyState onModeChange={onModeChange} />
      )}
    </main>
  );
}

function ReaderTextInput({
  value,
  analysis,
  onChange,
  onPasteClipboard,
  onClear,
}: {
  value: string;
  analysis: ReaderTextAnalysis;
  onChange: (value: string) => void;
  onPasteClipboard: () => void;
  onClear: () => void;
}) {
  const isRtl = analysis.sourceScript === 'uey';
  const hasClipboardRead =
    typeof navigator !== 'undefined' && Boolean(navigator.clipboard?.readText);

  return (
    <div className="mt-4 grid gap-2">
      <div className="flex min-h-8 flex-wrap items-center justify-between gap-2">
        <label htmlFor="reader-text" className="text-sm font-semibold text-slate-700">
          Reader text
        </label>
        <div className="flex items-center gap-2 text-xs">
          {analysis.characterCount > 0 ? (
            <span className="text-slate-400">
              {analysis.lineCount.toLocaleString()} line
              {analysis.lineCount === 1 ? '' : 's'} ·{' '}
              {analysis.characterCount.toLocaleString()} chars
            </span>
          ) : null}
          <button
            type="button"
            onClick={onPasteClipboard}
            disabled={!hasClipboardRead}
            className="min-h-8 rounded-md px-2 py-1 font-medium text-indigo-600 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
          >
            Paste
          </button>
          <button
            type="button"
            onClick={onClear}
            disabled={!value}
            className="min-h-8 rounded-md px-2 py-1 font-medium text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
          >
            Clear
          </button>
        </div>
      </div>
      <textarea
        id="reader-text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        dir={isRtl ? 'rtl' : 'ltr'}
        lang={isRtl ? 'ug' : 'en'}
        placeholder="ياخشىمۇسىز..."
        className="h-64 w-full resize-y rounded-lg border border-slate-200 bg-slate-50 p-4 text-xl leading-relaxed text-slate-950 shadow-xs transition focus:border-indigo-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-200 sm:h-80"
      />
    </div>
  );
}

function ReaderImageInput({
  imageFile,
  imagePreviewUrl,
  isRecognizing,
  ocrProgress,
  ocrStatus,
  ocrConfidence,
  imageInputRef,
  onChooseImage,
  onRunOcr,
}: {
  imageFile: File | null;
  imagePreviewUrl: string;
  isRecognizing: boolean;
  ocrProgress: ReaderOcrProgress | null;
  ocrStatus: string;
  ocrConfidence: number | null;
  imageInputRef: React.RefObject<HTMLInputElement>;
  onChooseImage: (file: File | undefined) => void;
  onRunOcr: () => void;
}) {
  const progressPercent = Math.round((ocrProgress?.progress ?? 0) * 100);
  const quality = getReaderOcrQuality(ocrConfidence);

  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="grid min-h-64 place-items-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
        <input
          ref={imageInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/bmp"
          className="hidden"
          onChange={(event) => {
            onChooseImage(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
        <div className="grid gap-3">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-md bg-white text-indigo-700 ring-1 ring-slate-200">
            <FileImage className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="text-sm font-semibold text-slate-700">
            {imageFile ? imageFile.name : 'Choose an image'}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
              Upload image
            </button>
            <button
              type="button"
              onClick={onRunOcr}
              disabled={!imageFile || isRecognizing}
              className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isRecognizing ? (
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <ScanText className="h-4 w-4" aria-hidden="true" />
              )}
              Recognize UEY
            </button>
          </div>
          {ocrStatus ? (
            <div className="mx-auto flex max-w-md flex-wrap justify-center gap-2 text-xs font-medium text-slate-500">
              <span>{ocrStatus}</span>
              {ocrConfidence !== null ? (
                <>
                  <span>{ocrConfidence}% confidence</span>
                  <span
                    className={`rounded-full px-2 py-0.5 font-semibold ${ocrQualityClass(
                      quality,
                    )}`}
                  >
                    {ocrQualityLabel(quality)}
                  </span>
                </>
              ) : null}
            </div>
          ) : null}
          {isRecognizing ? (
            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-indigo-600 transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          ) : null}
        </div>
      </div>

      <div className="min-h-64 overflow-hidden rounded-lg border border-slate-200 bg-white">
        {imagePreviewUrl ? (
          <img
            src={imagePreviewUrl}
            alt={imageFile?.name ?? 'Selected OCR input'}
            className="h-full max-h-96 w-full object-contain"
          />
        ) : (
          <div className="grid h-full min-h-64 place-items-center bg-slate-50 text-sm font-medium text-slate-400">
            Preview
          </div>
        )}
      </div>
    </div>
  );
}

function ReaderSummary({
  analysis,
  matchCount,
  isLoading,
  loadedShardCount,
  error,
}: {
  analysis: ReaderTextAnalysis;
  matchCount: number;
  isLoading: boolean;
  loadedShardCount: number;
  error: string | null;
}) {
  return (
    <section className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-xs md:grid-cols-4">
      <ReaderStat label="Script" value={scriptLabel(analysis.sourceScript)} />
      <ReaderStat
        label="Words"
        value={analysis.lookupCandidates.length.toLocaleString()}
      />
      <ReaderStat
        label="Sentences"
        value={analysis.sentenceCount.toLocaleString()}
      />
      <ReaderStat
        label="Matches"
        value={isLoading ? '...' : matchCount.toLocaleString()}
        detail={
          error
            ? 'Dictionary unavailable'
            : loadedShardCount
              ? `${loadedShardCount} shard${loadedShardCount === 1 ? '' : 's'}`
              : 'Local dictionary'
        }
      />
      {analysis.notes.length || error ? (
        <div className="md:col-span-4 flex flex-wrap gap-2">
          {error ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
              Large dictionary unavailable
            </span>
          ) : null}
          {analysis.notes.map((note) => (
            <span
              key={note}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              {note}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function ReaderStat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-md bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-lg font-bold text-slate-950">{value}</div>
      {detail ? (
        <div className="mt-0.5 text-xs font-medium text-slate-500">
          {detail}
        </div>
      ) : null}
    </div>
  );
}

function ReaderDualText({ analysis }: { analysis: ReaderTextAnalysis }) {
  return (
    <section className="grid gap-4 md:grid-cols-2">
      <ReaderTextPreview label="UEY" value={analysis.ueyText} dir="rtl" />
      <ReaderTextPreview label="ULY" value={analysis.ulyText} dir="ltr" />
    </section>
  );
}

function ReaderTextPreview({
  label,
  value,
  dir,
}: {
  label: string;
  value: string;
  dir: 'rtl' | 'ltr';
}) {
  return (
    <article className="min-h-40 rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
      <div className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </div>
      <p
        dir={dir}
        lang={dir === 'rtl' ? 'ug' : 'en'}
        className="whitespace-pre-wrap text-xl leading-relaxed text-slate-950"
      >
        {value}
      </p>
    </article>
  );
}

function ReaderWordAnalysis({
  analysis,
  matches,
  isLoading,
  onOpenDictionary,
  onStudy,
  onConvert,
  onSaveWord,
  savedStudyWordIds,
}: {
  analysis: ReaderTextAnalysis;
  matches: Record<string, ReaderLookupMatch>;
  isLoading: boolean;
  onOpenDictionary: (query: string) => void;
  onStudy: (uly: string) => void;
  onConvert: (uey: string) => void;
  onSaveWord: (uly: string) => void;
  savedStudyWordIds: readonly string[];
}) {
  if (!analysis.lookupCandidates.length) return null;

  return (
    <section className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-800">Word analysis</h2>
        {isLoading ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            Matching dictionary
          </span>
        ) : null}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {analysis.lookupCandidates.map((candidate) => {
          const match = matches[candidate.key];
          const primary = match?.results[0];
          const dictionaryQuery = match?.query ?? candidate.queries[0];
          const saveToken = primary?.entry.uly ?? candidate.uly;
          const isSaved = savedStudyWordIds.includes(
            getStudyWordProgressId(saveToken),
          );

          return (
            <article
              key={candidate.key}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div
                    dir="rtl"
                    lang="ug"
                    className="text-3xl leading-relaxed text-slate-950"
                  >
                    {primary?.entry.uey ?? candidate.uey}
                  </div>
                  <div className="mt-1 font-mono text-sm font-semibold text-indigo-700">
                    {primary?.entry.uly ?? candidate.uly}
                  </div>
                  {match?.isRootFallback ? (
                    <span className="mt-2 inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">
                      root: {match.query}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onSaveWord(saveToken)}
                    disabled={isSaved}
                    aria-label={
                      isSaved
                        ? `${saveToken} saved for review`
                        : `Save ${saveToken} for review`
                    }
                    className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-semibold transition ${
                      isSaved
                        ? 'cursor-default border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50'
                    }`}
                  >
                    {isSaved ? (
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <BookmarkPlus className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    {isSaved ? 'Saved' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenDictionary(dictionaryQuery)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <Search className="h-3.5 w-3.5" aria-hidden="true" />
                    Dictionary
                  </button>
                  {primary ? (
                    <>
                      <button
                        type="button"
                        onClick={() => onStudy(primary.entry.uly)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                      >
                        <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
                        Study
                      </button>
                      <button
                        type="button"
                        onClick={() => onConvert(primary.entry.uey)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <Repeat2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Convert
                      </button>
                    </>
                  ) : null}
                </div>
              </div>

              {primary ? (
                <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-700">
                  {primary.entry.definitions.slice(0, 4).map((definition) => (
                    <span
                      key={definition}
                      className="rounded-md bg-slate-50 px-2.5 py-1 ring-1 ring-slate-200"
                    >
                      {definition}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                  {isLoading ? (
                    <>
                      <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                      Searching
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4 text-slate-400" aria-hidden="true" />
                      No local match
                    </>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ReaderEmptyState({
  onModeChange,
}: {
  onModeChange: (mode: ReaderInputMode) => void;
}) {
  return (
    <section className="grid gap-3 rounded-lg border border-dashed border-slate-300 bg-white/70 p-6 text-sm leading-6 text-slate-500">
      <div className="flex gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-indigo-50 text-indigo-700">
          <ScanText className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <p className="font-semibold text-slate-700">
            Start with text or an image.
          </p>
          <p className="mt-1">
            Reader keeps UEY and ULY side by side, groups words, and connects
            local dictionary matches.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onModeChange('text')}
          className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
        >
          <Check className="h-4 w-4" aria-hidden="true" />
          Paste text
        </button>
        <button
          type="button"
          onClick={() => onModeChange('image')}
          className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <FileImage className="h-4 w-4" aria-hidden="true" />
          Image OCR
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

function scriptLabel(script: ReaderTextAnalysis['sourceScript']) {
  if (script === 'uey') return 'UEY';
  if (script === 'uly') return 'ULY';
  if (script === 'mixed') return 'Mixed';
  return 'Unknown';
}

function getReaderOcrCompleteStatus(
  result: Awaited<ReturnType<typeof recognizeUeyImage>>,
) {
  if (result.engine === 'paddle') return 'PP-OCR v5 complete';
  if (result.fallbackFrom === 'paddle') {
    return 'Tesseract fallback complete';
  }
  return 'OCR complete';
}

function ocrQualityLabel(quality: ReturnType<typeof getReaderOcrQuality>) {
  if (quality === 'high') return 'High quality';
  if (quality === 'medium') return 'Medium quality';
  if (quality === 'low') return 'Low quality';
  return 'Unknown quality';
}

function ocrQualityClass(quality: ReturnType<typeof getReaderOcrQuality>) {
  if (quality === 'high') return 'bg-emerald-50 text-emerald-700';
  if (quality === 'medium') return 'bg-amber-50 text-amber-700';
  if (quality === 'low') return 'bg-rose-50 text-rose-700';
  return 'bg-slate-100 text-slate-500';
}
