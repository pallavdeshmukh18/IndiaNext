"""
Local Hugging Face inference bridge.

Reads JSON payload from stdin and writes JSON response to stdout.

Input shape:
{
  "model": "model-id-or-local-path",
  "inputType": "text" | "image" | "audio",
  "text": "..."                    # required for text
  "source": "path|url|data-uri"    # required for image/audio
}
"""

import io
import json
import base64
import tempfile
from pathlib import Path
from urllib.parse import urlparse

import requests
from PIL import Image
from transformers import pipeline


def _read_payload():
    import sys
    data = sys.stdin.read()
    if not data.strip():
        raise ValueError("No payload received on stdin.")
    return json.loads(data)


def _as_candidates(output):
    if output is None:
        return []

    if isinstance(output, dict):
        if "label" in output:
            return [{"label": str(output.get("label", "unknown")), "score": float(output.get("score", 0.0))}]
        return []

    if isinstance(output, list):
        # HF pipelines can return nested lists.
        if len(output) == 1 and isinstance(output[0], list):
            output = output[0]
        candidates = []
        for item in output:
            if isinstance(item, dict) and "label" in item:
                candidates.append({
                    "label": str(item.get("label", "unknown")),
                    "score": float(item.get("score", 0.0))
                })
        candidates.sort(key=lambda x: x["score"], reverse=True)
        return candidates

    return []


def _download_bytes(url: str) -> bytes:
    resp = requests.get(url, timeout=20)
    resp.raise_for_status()
    return resp.content


def _decode_data_uri(data_uri: str):
    # data:<mime>;base64,<payload>
    if not data_uri.startswith("data:") or ";base64," not in data_uri:
        raise ValueError("Invalid data URI.")
    header, payload = data_uri.split(";base64,", 1)
    mime = header.split(":", 1)[1] if ":" in header else "application/octet-stream"
    return mime, base64.b64decode(payload)


def _load_image_source(source: str):
    if source.startswith("http://") or source.startswith("https://"):
        blob = _download_bytes(source)
        return Image.open(io.BytesIO(blob)).convert("RGB")

    if source.startswith("data:"):
        _, blob = _decode_data_uri(source)
        return Image.open(io.BytesIO(blob)).convert("RGB")

    path = Path(source)
    if not path.exists():
        raise FileNotFoundError(f"Image path not found: {source}")
    return Image.open(path).convert("RGB")


def _load_audio_source(source: str) -> str:
    if source.startswith("http://") or source.startswith("https://"):
        blob = _download_bytes(source)
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
            tmp.write(blob)
            return tmp.name

    if source.startswith("data:"):
        _, blob = _decode_data_uri(source)
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
            tmp.write(blob)
            return tmp.name

    path = Path(source)
    if not path.exists():
        raise FileNotFoundError(f"Audio path not found: {source}")
    return str(path)


def _infer_text(model: str, text: str):
    clf = pipeline(
        task="text-classification",
        model=model,
        local_files_only=True
    )
    out = clf(text[:4000], top_k=5, truncation=True)
    return _as_candidates(out), out


def _infer_image(model: str, source: str):
    clf = pipeline(
        task="image-classification",
        model=model,
        local_files_only=True
    )
    img = _load_image_source(source)
    out = clf(img, top_k=5)
    return _as_candidates(out), out


def _infer_audio(model: str, source: str):
    clf = pipeline(
        task="audio-classification",
        model=model,
        local_files_only=True
    )
    audio_input = _load_audio_source(source)
    out = clf(audio_input, top_k=5)
    return _as_candidates(out), out


def main():
    payload = _read_payload()
    model = payload.get("model")
    input_type = payload.get("inputType")

    if not model:
        raise ValueError("Payload field 'model' is required.")
    if input_type not in {"text", "image", "audio"}:
        raise ValueError("Payload field 'inputType' must be text, image, or audio.")

    if input_type == "text":
        text = payload.get("text", "")
        if not isinstance(text, str) or not text.strip():
            raise ValueError("Payload field 'text' is required for text input.")
        candidates, raw = _infer_text(model, text)
    elif input_type == "image":
        source = payload.get("source", "")
        if not isinstance(source, str) or not source.strip():
            raise ValueError("Payload field 'source' is required for image input.")
        candidates, raw = _infer_image(model, source)
    else:
        source = payload.get("source", "")
        if not isinstance(source, str) or not source.strip():
            raise ValueError("Payload field 'source' is required for audio input.")
        candidates, raw = _infer_audio(model, source)

    print(json.dumps({
        "ok": True,
        "candidates": candidates,
        "raw": raw
    }))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(json.dumps({
            "ok": False,
            "error": str(exc)
        }))
