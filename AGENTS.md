# UG Bridge - Agent Project Notes

UG Bridge is a browser tool that converts between Uyghur Arabic script (UEY) and Uyghur Latin Yeziqi (ULY), searches a Uyghur-English dictionary, supports Uyghur script study, and optionally speaks Uyghur text.

## Standing Rules

**Keep README.md current.** Any change that touches code, structure, dependencies, scripts, or workflow must update README before the task is considered done.

**Keep this file current.** When project conventions, constraints, or strategy shift, update AGENTS.md.

Check git status before edits and preserve unrelated user changes.

## Stack

- Vite + React 18 + TypeScript
- Tailwind CSS v4 via `@tailwindcss/vite`
- Node 24+ baseline
- Lucide React for UI icons
- Vitest + Testing Library for tests
- Static site only; no backend yet

## Architecture

```text
src/
+-- lib/
|   +-- converter/      pure functions, no React deps
|   |   +-- mapping-table.ts   forward + reverse tables, vowels, punctuation
|   |   +-- alphabet-study.ts  ULY/UEY/IPA alphabet examples
|   |   +-- uey-to-uly.ts      forward: char-by-char
|   |   +-- uly-to-uey.ts      reverse: longest-match + word-initial hamza
|   +-- dictionary/     pure local dictionary data + lookup helpers
|   +-- tts/            TtsProvider interface; swap implementations
+-- components/         dumb React components, props in / events out
+-- hooks/              React hooks that bridge lib/ to components
+-- App.tsx             direction state + swap + composition
+-- main.tsx            entry
tests/                  Vitest specs mirror src/ layout
```

`src/lib/` must stay pure and free of React imports. React state and effects around lib code belong in `src/hooks/`. Components consume `lib/` either through a hook, preferred for async/stateful behavior, or direct calls in `App.tsx`.

## Conversion Rules

### UEY -> ULY

- Char-by-char map via [src/lib/converter/mapping-table.ts](src/lib/converter/mapping-table.ts) `UEY_TO_ULY`
- Hamza `ئ` is dropped
- Arabic punctuation (`،` `؟` `؛`) -> Latin equivalents via `UEY_PUNCTUATION_TO_LATIN`
- Unknown chars pass through, preserving numbers, ASCII, and whitespace

### ULY -> UEY

- Longest-match left-to-right: try 2-char digraphs (`ch sh gh ng zh`) first, then 1-char
- Word-initial vowel gets a `ئ` hamza prepended. Word boundary = any non-letter
- Case-insensitive input; lowercase before lookup
- Latin punctuation (`,` `;` `?`) -> Arabic via `LATIN_PUNCTUATION_TO_UEY`
- Latin period `.` is not converted

When adding mappings, extend `mapping-table.ts` and add tests in `tests/converter.test.ts` for forward conversion or `tests/uly-to-uey.test.ts` for reverse conversion. Round-trip cases live in the reverse tests.

Learn alphabet data is generated in `alphabet-study.ts` from converter mappings, curated common example words, and UEY joining forms. Do not hand-code fake joining forms in components; update pure converter data/functions and tests.

### Known Asymmetries

- `ك` (Arabic kaf) and `ک` (Persian kaf) both map forward to `k`; reverse always produces `ك`, so round-trip normalizes Persian kaf away.
- Reverse direction lowercases input before lookup; output Arabic has no case.
- `é` is the app's canonical ULY output for `ې`. `ë` is accepted as a backwards-compatible reverse input alias; both produce `ې`.

## UI Direction Model

`App.tsx` holds:

- `direction: 'uey-to-uly' | 'uly-to-uey'`
- `input: string`, always the source
- `view: 'home' | 'convert' | 'learn' | 'alphabet' | 'dictionary'`
- `output = useMemo(...)`, computed from input + direction

The swap button copies `output` into `input`, then flips `direction`, so the text the user is looking at becomes the new source. `SpeakButton` always receives the UEY form: `direction === 'uey-to-uly' ? input : output`.

Home is the default entry view. Clicking the UG Bridge icon or name returns home; feature cards switch into the existing tool views.

Dictionary view uses the same `input` state as its search query. Search logic lives in `src/lib/dictionary/search.ts`. A small seed list remains in `src/lib/dictionary/entries.ts`, and the larger English <-> Uyghur dataset is generated into `public/dictionary/` by `npm run dictionary:build` from the Apache-2.0 Hugging Face dataset `anke01/uyghur-dictionary-dataset` at pinned commit `14355b6ea141ca46620da6ef483a03fb6baa0dd6`. Keep this Spark-friendly: static shards only, lazy-load relevant shards in `src/lib/dictionary/static-dataset.ts`, and do not put the full dictionary in the main JS bundle.

## TTS Strategy

- Current default: Web Speech API. Most desktops lack a `ug-*` voice; UI shows a warning when missing.
- Edge TTS attempt: code is in place (`src/lib/tts/edge-tts.ts`, `vite-plugins/tts.ts`, `EdgeTtsProvider`) but disabled because Microsoft is blocking server-side clients. Re-enable via `VITE_TTS_ENDPOINT=/api/tts` if upstream changes.
- Best neural option going forward: MMS-TTS (`facebook/mms-tts-uig-script_arabic`), a 36.3M-param VITS model that takes Arabic input. License is CC-BY-NC-4.0, so non-commercial OK. Run via a Cloud Run or Cloud Function backend.
- Lightweight fallback: espeak-ng WASM, roughly 3MB, robotic but real Uyghur phonemes.

When adding a provider, implement `TtsProvider` in [src/lib/tts/types.ts](src/lib/tts/types.ts) and update `getTtsProvider()` in [src/lib/tts/index.ts](src/lib/tts/index.ts). Do not bypass the interface. Always feed TTS providers UEY Arabic text, never ULY.

## Licensing

Application source is under GNU GPL v3.0 only (`GPL-3.0-only`). Keep homepage/README license text clear that redistributed modified versions must remain GPLv3 and include source code; do not describe GPLv3 as a commercial-use ban. Dictionary shards retain Apache-2.0 dataset attribution.

## Deployment

- Firebase Hosting via `npm run deploy`, project `ugbr1dge`, configured in [.firebaserc](.firebaserc).
- Firebase Web SDK is initialized at app start in [src/lib/firebase.ts](src/lib/firebase.ts), but no Firebase services are wired in yet.
- Firebase Web `apiKey` is public by design; Security Rules and Auth gate real access.
- For server-side TTS, the natural future home is Cloud Functions (Node) or Cloud Run (Python + PyTorch) on the same Firebase project.

## Commands

Prefer `rtk` when available:

```bash
rtk npm run dev
rtk npm run test
rtk npm run typecheck
rtk npm run build
```

Raw npm equivalents:

```bash
npm run dev
npm test
npm run test:watch
npm run dictionary:build
npm run typecheck
npm run build
npm run preview
```

## Do Not

- Do not lower the Node baseline below 24 without checking the Tailwind and Vite toolchain requirements.
- Do not add a backend unless TTS quality is the proven bottleneck.
- Do not put stateful bridge logic into components; keep components mostly dumb and push logic into `src/lib/` or hooks.
- Do not expand the converter into a dictionary lookup feature without the user's go-ahead; language-aware features are deferred.
- Do not pass ULY text to the TTS layer. TTS engines should receive UEY Arabic text.
