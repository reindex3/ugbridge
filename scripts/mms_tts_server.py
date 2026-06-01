#!/usr/bin/env python3
"""Local Uyghur MMS-TTS HTTP server.

The React app already knows how to POST text to a TTS endpoint and play back the
audio blob. This script provides that endpoint locally using the free
facebook/mms-tts-uig-script_arabic checkpoint.
"""

from __future__ import annotations

import argparse
import io
import json
import sys
import wave
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

import numpy as np
import torch
from transformers import AutoTokenizer, VitsModel


DEFAULT_MODEL = "facebook/mms-tts-uig-script_arabic"
MAX_TEXT_CHARS = 2000


class MmsSynthesizer:
    def __init__(self, model_name: str, device: str) -> None:
        self.model_name = model_name
        self.device = device
        print(f"[mms-tts] loading {model_name} on {device}", flush=True)
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = VitsModel.from_pretrained(model_name).to(device)
        self.model.eval()
        self.sample_rate = int(self.model.config.sampling_rate)
        print(f"[mms-tts] ready at {self.sample_rate} Hz", flush=True)

    def synthesize_wav(self, text: str) -> bytes:
        inputs = self.tokenizer(text, return_tensors="pt")
        inputs = {key: value.to(self.device) for key, value in inputs.items()}

        with torch.inference_mode():
            waveform = self.model(**inputs).waveform

        audio = waveform.squeeze().detach().cpu().numpy()
        return encode_wav(audio, self.sample_rate)


def encode_wav(audio: np.ndarray, sample_rate: int) -> bytes:
    clipped = np.clip(audio, -1.0, 1.0)
    pcm16 = (clipped * 32767.0).astype("<i2")

    buf = io.BytesIO()
    with wave.open(buf, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(sample_rate)
        wav.writeframes(pcm16.tobytes())
    return buf.getvalue()


def pick_device(requested: str) -> str:
    if requested != "auto":
        return requested
    return "cuda" if torch.cuda.is_available() else "cpu"


def make_handler(synthesizer: MmsSynthesizer):
    class Handler(BaseHTTPRequestHandler):
        server_version = "UlyBridgeMmsTts/0.1"

        def do_OPTIONS(self) -> None:
            self.send_response(204)
            self.send_cors_headers()
            self.end_headers()

        def do_GET(self) -> None:
            if self.path == "/health":
                self.send_json(200, {"ok": True, "model": synthesizer.model_name})
                return
            self.send_json(404, {"error": "Not found"})

        def do_POST(self) -> None:
            if self.path not in {"/api/tts", "/tts"}:
                self.send_json(404, {"error": "Not found"})
                return

            try:
                body = self.read_json_body()
                text = str(body.get("text", "")).strip()
            except Exception as exc:
                self.send_json(400, {"error": f"Invalid JSON body: {exc}"})
                return

            if not text:
                self.send_json(400, {"error": "Missing text"})
                return

            if len(text) > MAX_TEXT_CHARS:
                self.send_json(
                    413,
                    {
                        "error": (
                            f"Text is too long for local TTS "
                            f"({len(text)} > {MAX_TEXT_CHARS} chars)"
                        )
                    },
                )
                return

            try:
                wav_bytes = synthesizer.synthesize_wav(text)
            except Exception as exc:
                print(f"[mms-tts] synthesis error: {exc}", file=sys.stderr)
                self.send_json(500, {"error": str(exc)})
                return

            self.send_response(200)
            self.send_cors_headers()
            self.send_header("Content-Type", "audio/wav")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(wav_bytes)))
            self.end_headers()
            self.wfile.write(wav_bytes)

        def read_json_body(self) -> dict[str, Any]:
            length = int(self.headers.get("content-length", "0"))
            raw = self.rfile.read(length)
            return json.loads(raw.decode("utf-8") if raw else "{}")

        def send_json(self, status: int, body: dict[str, Any]) -> None:
            payload = json.dumps(body).encode("utf-8")
            self.send_response(status)
            self.send_cors_headers()
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)

        def send_cors_headers(self) -> None:
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")

        def log_message(self, fmt: str, *args: object) -> None:
            print(f"[mms-tts] {self.address_string()} - {fmt % args}")

    return Handler


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=7861)
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument(
        "--device",
        default="auto",
        help="auto, cpu, cuda, or another torch device string",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    device = pick_device(args.device)
    synthesizer = MmsSynthesizer(args.model, device)
    server = ThreadingHTTPServer((args.host, args.port), make_handler(synthesizer))
    print(f"[mms-tts] listening on http://{args.host}:{args.port}/api/tts")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[mms-tts] stopped")


if __name__ == "__main__":
    main()
