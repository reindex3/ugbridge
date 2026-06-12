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

export type ReaderOcrQuality = 'unknown' | 'low' | 'medium' | 'high';

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
    const preparedImage = await prepareOcrImage(image);
    const result = await worker.recognize(preparedImage);

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

export function getReaderOcrQuality(
  confidence: number | null | undefined,
): ReaderOcrQuality {
  if (typeof confidence !== 'number' || !Number.isFinite(confidence)) {
    return 'unknown';
  }
  if (confidence >= 75) return 'high';
  if (confidence >= 45) return 'medium';
  return 'low';
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

async function prepareOcrImage(image: File | Blob): Promise<File | Blob> {
  if (typeof document === 'undefined') {
    return image;
  }

  try {
    const source = await loadImageForCanvas(image);
    try {
      const canvas = document.createElement('canvas');
      const scale = getOcrPreprocessingScale(source.width, source.height);
      canvas.width = Math.max(1, Math.round(source.width * scale));
      canvas.height = Math.max(1, Math.round(source.height * scale));

      const context = canvas.getContext('2d', {
        willReadFrequently: true,
      });
      if (!context) return image;

      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(source.element, 0, 0, canvas.width, canvas.height);

      const data = context.getImageData(0, 0, canvas.width, canvas.height);
      applyOcrImageProcessing(data.data);
      context.putImageData(data, 0, 0);

      return (await canvasToPngBlob(canvas)) ?? image;
    } finally {
      source.cleanup();
    }
  } catch {
    return image;
  }
}

interface CanvasImageSourceResult {
  element: CanvasImageSource;
  width: number;
  height: number;
  cleanup: () => void;
}

async function loadImageForCanvas(
  image: File | Blob,
): Promise<CanvasImageSourceResult> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(image);
    return {
      element: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      cleanup: () => bitmap.close(),
    };
  }

  return loadHtmlImageForCanvas(image);
}

function loadHtmlImageForCanvas(
  image: File | Blob,
): Promise<CanvasImageSourceResult> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(image);
    const element = new Image();

    element.onload = () => {
      resolve({
        element,
        width: element.naturalWidth || element.width,
        height: element.naturalHeight || element.height,
        cleanup: () => URL.revokeObjectURL(url),
      });
    };
    element.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('OCR image failed to load'));
    };
    element.src = url;
  });
}

function getOcrPreprocessingScale(
  width: number,
  height: number,
) {
  const longestSide = Math.max(width, height, 1);
  const targetLongestSide = 2200;
  const maxScale = 2.5;
  return Math.max(1, Math.min(maxScale, targetLongestSide / longestSide));
}

function applyOcrImageProcessing(data: Uint8ClampedArray) {
  const contrast = 1.7;

  for (let index = 0; index < data.length; index += 4) {
    const gray =
      0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2];
    const contrasted = clampByte((gray - 128) * contrast + 128);
    const value = threshold(contrasted);

    data[index] = value;
    data[index + 1] = value;
    data[index + 2] = value;
    data[index + 3] = 255;
  }
}

function canvasToPngBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/png');
  });
}

function clampByte(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function threshold(value: number) {
  return value > 170 ? 255 : 0;
}
