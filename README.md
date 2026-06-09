<p align="center">
  <img src="public/icon.svg" alt="UG Bridge icon" width="144" height="144">
</p>

<h1 align="center">UG Bridge</h1>

<p align="center">
  A static browser tool for Uyghur Arabic script (<strong>UEY</strong>) and
  Uyghur Latin Yéziqi (<strong>ULY</strong>).
</p>

<p align="center">
  <a href="https://ugbr1dge.web.app">Live app</a>
  ·
  <a href="#features">Features</a>
  ·
  <a href="#quick-start">Quick start</a>
</p>

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=111827">
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-4-38BDF8?logo=tailwindcss&logoColor=ffffff">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=ffffff">
  <img alt="Firebase Hosting" src="https://img.shields.io/badge/Firebase-Hosting-FFCA28?logo=firebase&logoColor=111827">
  <img alt="License GPLv3" src="https://img.shields.io/badge/license-GPLv3-10B981">
</p>

<p align="center">
  <img src="public/readme-preview.svg" alt="UG Bridge app preview" width="900">
</p>

```text
ياخشىمۇسىز  ⇄  yaxshimusiz
```

## Terminology

- **UEY** means **Uyghur Ereb Yéziqi**: the Arabic-based script commonly used
  for Uyghur.
- **ULY** means **Uyghur Latin Yéziqi**: a Latin-alphabet writing system for
  Uyghur.

## Features

- **Convert UEY ⇄ ULY** with smart direction detection, colored segment
  highlighting, IPA hints, long-text counters, conversion quality hints,
  copy/share actions, live shareable URLs, keyboard shortcuts, and `.txt`
  upload/download.
- **Look up converted words inline** by tapping output word chips that open
  dictionary results without leaving the conversion workspace.
- **Inspect the letter bridge** from ULY to UEY, including per-segment mapping,
  word-initial hamza behavior, and Uyghur letter forms.
- **Search offline dictionary data** from the home page or dictionary view by
  UEY, ULY, or English with suggestions, matched-text highlighting,
  cross-script fallbacks, typo suggestions, recent searches, saved lookup
  controls, dictionary favorites, clearer empty/no-result states, `?dict=`
  share links, saved lookup records, copy actions, and lazy-loaded static
  shards.
- **Study and practice UEY** through vowel-highlighted letter breakdowns,
  alphabet pages, browser-shaped highlighted examples, connected joining-form
  samples, local word mastery/review state, letter progress, randomizable quiz
  sets, saved missed-form review, and UEY/ULY mini quizzes that can focus on
  learned letters or fall back to all 32 sounds.
- **Customize local workflows** with browser-local custom words, recent
  conversions, ULY input helpers, a privacy-first local study profile with JSON
  export/import and no retained backend profile data, system/day/night theme
  settings, and installable PWA shell caching.
- **Render UEY consistently** with a bundled UKIJ Ekran webfont for Uyghur
  Arabic script text.
- **Surface basic project information** with a homepage disclaimer, contact
  link, copyright year, GPLv3 source license note, and dictionary data
  attribution.
- **Speak UEY text** through browser speech, local MMS, Hugging Face
  Space-style proxy, or a custom TTS endpoint.

## Quick Start

Requirements:

- Node 24 or newer
- npm

```bash
npm install
npm run dev
```

The dev server runs at <http://localhost:5173>.

Useful commands:

```bash
npm test                 # run unit tests once
npm run test:watch       # watch tests
npm run typecheck        # TypeScript check
npm run build            # production build in dist/
npm run smoke:lightpanda # Lightpanda smoke check for core browser flows
npm run preview          # preview production build
npm run deploy           # build + deploy to Firebase Hosting
npm run dictionary:build # rebuild generated dictionary shards
```

## Stack

- Vite + React 18 + TypeScript
- Tailwind CSS v4 with the `@tailwindcss/vite` plugin
- Lucide React icons
- Vitest + Testing Library
- Firebase Hosting
- Firebase Web SDK initialized for future Auth / Firestore use
- Static app architecture; no backend is required for core features

The project targets Node 24+ so the Tailwind v4 toolchain can run on an
active LTS baseline.

## Project Structure

```text
src/
├── components/              # React UI components
├── hooks/                   # React hooks that bridge UI and pure libraries
├── lib/
│   ├── converter/           # pure UEY/ULY conversion logic
│   ├── dictionary/          # pure dictionary search helpers
│   ├── tts/                 # TTS provider interface and implementations
│   ├── conversion-history.ts
│   ├── custom-transliterations.ts
│   ├── local-profile.ts
│   └── firebase.ts
├── App.tsx                  # view, direction, and app composition state
├── main.tsx
└── index.css

tests/                       # Vitest specs
public/
├── dictionary/              # generated static dictionary shards
├── fonts/                   # bundled webfont assets and attribution
├── manifest.webmanifest
├── icon.svg
└── sw.js

scripts/
└── build_dictionary_dataset.mjs

firebase.json
.firebaserc
AGENTS.md                    # project notes for agent workflows
SECURITY.md                  # vulnerability reporting and secret handling
```

`src/lib/` must stay pure and free of React imports. Stateful UI coordination
belongs in hooks or `App.tsx`; components should mostly receive props and emit
events.

## Conversion

### UEY → ULY

- Character mapping lives in
  [src/lib/converter/mapping-table.ts](src/lib/converter/mapping-table.ts).
- Word-initial hamza `ئ` is dropped as a vowel carrier.
- In-word hamza `ئ` converts to ULY apostrophe: `سائەت` → `sa'et`.
- Arabic punctuation (`،` `؟` `؛`) converts to Latin punctuation.
- Unknown characters pass through.
- Forward conversion outputs canonical `é` for `ې`.

### ULY → UEY

- Longest-match scan handles digraphs such as `sh`, `ch`, `gh`, `ng`, and `zh`.
- Word-initial vowels receive hamza: `alma` → `ئالما`.
- ULY apostrophe restores in-word hamza: `sa'et` → `سائەت`.
- Adjacent vowels receive an internal hamza carrier when needed:
  `saet` → `سائەت` remains accepted for compatibility.
- Case-insensitive input is accepted.
- `ë` is accepted as a compatibility alias, but `é` is the canonical ULY form.
- Latin punctuation (`,` `;` `?`) converts to Arabic punctuation.

Standard Uyghur text round-trips cleanly for common inputs:

```ts
ulyToUey(ueyToUly(uey)) === uey
```

Known caveat: Persian kaf `ک` maps forward to `k`, and reverse conversion
normalizes it to Arabic kaf `ك`.

## Dictionary

The dictionary imports the Apache-2.0 Hugging Face dataset
[`anke01/uyghur-dictionary-dataset`](https://huggingface.co/datasets/anke01/uyghur-dictionary-dataset).

The build script imports the English ⇄ Uyghur files:

- `ug-en.jsonl`
- `en-ug.jsonl`

and generates static JSON shards under `public/dictionary/`.

```bash
npm run dictionary:build
```

Generated data is committed so Firebase Hosting can serve it directly. The app
does not download the whole dictionary on page load; it lazy-loads only the
relevant shard for the active query and search mode. Manifest and shard fetches
are cached after successful loads, while transient failures are left retryable
so a temporary network error does not poison the session.

Current generated size:

- about 350k Uyghur headwords
- about 725k English definitions

## Fonts

UEY text uses a bundled `UKIJ Ekran` webfont subset from the
[UKIJ Uyghur Unicode fonts page](https://ukij.org/fonts/) so Uyghur Arabic
script renders consistently across operating systems. The UKIJ page states that
its fonts are distributed under LGPL and SIL Open Font License terms.
Attribution details live in [public/fonts/README.md](public/fonts/README.md).

## Text To Speech

Speech always receives the **UEY Arabic-script text**, even when the visible
input is ULY. The converter sends the original UEY input for UEY → ULY mode and
the converted UEY output for ULY → UEY mode.

The default provider is the browser's Web Speech API. Most desktop browsers do
not ship a Uyghur voice, so the UI warns when no `ug-*` voice is available.
If browser voice detection fails, the app treats that as no Uyghur voice rather
than leaving speech status stuck in an unknown state. In practice, browser voice
availability is the main speech-quality bottleneck; custom API and MMS routes
can improve quality only as much as their backing model and voice support.

The app also supports a user-provided TTS API from the **TTS API** control. The
endpoint should accept:

```http
POST /api/tts
Authorization: Bearer <optional key>
Content-Type: application/json

{ "text": "ياخشىمۇسىز", "voice": "ug-CN-YilianNeural" }
```

and return audio such as `audio/wav` or `audio/mpeg`.

Switching TTS back to browser speech clears saved API endpoint, key, and custom
voice settings so stale API configuration does not linger in browser mode.

For local neural TTS, run the Uyghur MMS-TTS model:

```bash
npm run tts:mms
```

Then point the frontend at it in `.env.local`:

```bash
VITE_TTS_ENDPOINT=http://127.0.0.1:7861/api/tts
```

The MMS model is
[`facebook/mms-tts-uig-script_arabic`](https://hf.co/facebook/mms-tts-uig-script_arabic).
It is useful for local or separate-server experiments, but its license is
CC-BY-NC-4.0, so treat it as non-commercial unless replaced with a
commercial-friendly model.

## Configuration

Environment variables go in `.env.local` and are ignored by git. See
[.env.example](.env.example) for the supported Firebase and TTS settings.
See [SECURITY.md](SECURITY.md) for vulnerability reporting and secret-handling
guidance.

Firebase Web `apiKey` values are public project identifiers, not secrets.
Real access must be protected with Firebase Security Rules and Authentication.

## Privacy and Data

Core conversion, dictionary lookup, study tools, custom words, and recent
history run in the browser. Custom words, history, study progress, theme mode,
and TTS settings are stored locally in the user's browser storage. Stored
values are normalized on load, and invalid entries are ignored instead of being
restored into the UI.

The app sends text to a network service only when a user configures or selects
a TTS provider that requires an endpoint.

## Deployment

Firebase Hosting serves the static `dist/` build.

One-time login:

```bash
npx firebase-tools login
```

Deploy:

```bash
npm run deploy
```

The command runs `tsc -b && vite build` and deploys the result using the project
configured in [.firebaserc](.firebaserc).

## Testing

The test suite covers converter behavior, round-trip expectations, IPA hints,
alphabet data and connected form samples, dictionary search, cross-script
fallbacks, typo suggestions, retryable shard loading, dictionary panel
interactions, app conversion workflows, shareable URL state, keyboard
shortcuts, text input/output controls, custom transliterations, history,
learning progress, speech controls, and TTS settings.
Lightpanda smoke checks cover the homepage, shared conversion URLs, and
dictionary `?dict=` result rendering in a lightweight browser runtime. Real-browser
smoke checks are still useful for responsive navigation, especially clipboard,
dictionary shard fetches, recent/favorite dictionary controls, quiz interactions,
and mobile tab fit.

```bash
npm test
npm run typecheck
npm run build
npm run smoke:lightpanda
```

## License

Application source is licensed under the
[GNU General Public License v3.0 only](LICENSE) (`GPL-3.0-only`).
Redistributed modified versions must remain under GPLv3 and include source
code. GPLv3 does not prohibit commercial use by itself.

The generated dictionary shards in `public/dictionary/` are derived from the
Apache-2.0 [`anke01/uyghur-dictionary-dataset`](https://huggingface.co/datasets/anke01/uyghur-dictionary-dataset).
Keep that attribution when redistributing the generated data.
