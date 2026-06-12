type TesseractModule = typeof import('tesseract.js');
type TesseractWorker = Awaited<ReturnType<TesseractModule['createWorker']>>;

export interface ReaderOcrProgress {
  status: string;
  progress: number;
}

export interface ReaderOcrResult {
  text: string;
  confidence: number;
}

let workerPromise: Promise<TesseractWorker> | null = null;
let activeProgressHandler: ((progress: ReaderOcrProgress) => void) | null =
  null;

export async function recognizeUeyImage(
  image: File | Blob,
  onProgress?: (progress: ReaderOcrProgress) => void,
): Promise<ReaderOcrResult> {
  activeProgressHandler = onProgress ?? null;

  try {
    const worker = await getReaderOcrWorker();
    const result = await worker.recognize(image);

    return {
      text: normalizeOcrText(result.data.text),
      confidence: Math.round(result.data.confidence),
    };
  } finally {
    activeProgressHandler = null;
  }
}

export async function terminateReaderOcrWorker() {
  if (!workerPromise) return;
  const worker = await workerPromise;
  await worker.terminate();
  workerPromise = null;
}

async function getReaderOcrWorker() {
  workerPromise ??= createReaderOcrWorker();
  return workerPromise;
}

async function createReaderOcrWorker() {
  const tesseract = await import('tesseract.js');
  const worker = await tesseract.createWorker('uig', tesseract.OEM.LSTM_ONLY, {
    logger: (message) => {
      activeProgressHandler?.({
        status: message.status,
        progress: message.progress,
      });
    },
  });

  await worker.setParameters({
    preserve_interword_spaces: '1',
    user_defined_dpi: '300',
  });

  return worker;
}

function normalizeOcrText(text: string) {
  return text
    .replace(/\r\n?/gu, '\n')
    .replace(/[ \t]+\n/gu, '\n')
    .replace(/\n{3,}/gu, '\n\n')
    .trim();
}
