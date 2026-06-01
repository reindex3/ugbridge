import type { IncomingMessage, ServerResponse } from 'node:http';
import { webcrypto } from 'node:crypto';
import type { Plugin } from 'vite';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

// msedge-tts expects globalThis.crypto; provide it when the runtime omits it.
if (typeof globalThis.crypto === 'undefined') {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
  });
}

const VALID_VOICES = new Set([
  'ug-CN-YilianNeural',
  'ug-CN-NasirNeural',
]);
const DEFAULT_VOICE = 'ug-CN-YilianNeural';

export function ttsPlugin(): Plugin {
  return {
    name: 'ulybridge-tts',
    configureServer(server) {
      server.middlewares.use('/api/tts', async (req, res, next) => {
        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }
        if (req.method !== 'POST') {
          next();
          return;
        }

        try {
          const body = await readJsonBody(req);
          const text = String(body.text ?? '').trim();
          const requestedVoice = String(body.voice ?? '');
          const voice = VALID_VOICES.has(requestedVoice)
            ? requestedVoice
            : DEFAULT_VOICE;

          if (!text) {
            sendJson(res, 400, { error: 'Missing text' });
            return;
          }

          const tts = new MsEdgeTTS({ enableLogger: true });
          await tts.setMetadata(
            voice,
            OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3,
          );
          const { audioStream } = tts.toStream(text);

          res.setHeader('Content-Type', 'audio/mpeg');
          res.setHeader('Cache-Control', 'no-store');

          let bytes = 0;
          audioStream.on('data', (chunk: Buffer) => {
            bytes += chunk.length;
          });
          audioStream.on('error', (err: Error) => {
            console.error('[tts] stream error:', err);
            if (!res.writableEnded) res.end();
          });
          audioStream.on('end', () => {
            console.log(`[tts] stream ended (${bytes} bytes)`);
          });
          audioStream.pipe(res);
        } catch (err) {
          console.error('[tts] error:', err);
          sendJson(res, 500, {
            error: String((err as Error)?.message ?? err),
          });
        }
      });
    },
  };
}

function readJsonBody(
  req: IncomingMessage,
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      try {
        const body = Buffer.concat(chunks).toString('utf8');
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}
