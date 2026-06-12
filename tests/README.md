# Tests

Vitest specs are grouped by product area:

- `app/`: full app workflows and URL-state behavior
- `converter/`: pure UEY/ULY conversion, tracing, quality, IPA, and alphabet data
- `dictionary/`: dictionary search helpers and dictionary UI
- `reader/`: Reader sentence and word analysis
- `storage/`: browser-local persistence helpers
- `study/`: Learn UEY, Alphabet, Quiz, and study helpers
- `tts/`: TTS settings, status, speakable text, and speak controls
- `ui/`: shared input and output components
- `fixtures/`: static test assets such as local UEY OCR images

Keep `setup.ts` at the tests root because Vitest loads it directly from
`vitest.config.ts`.
