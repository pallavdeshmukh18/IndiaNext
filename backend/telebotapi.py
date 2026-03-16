import os
from pathlib import Path
from typing import Optional

import requests
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="Telegram Bot API")

BASE_DIR = Path(__file__).resolve().parent


def load_local_env():
    env_path = BASE_DIR / ".env"
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


load_local_env()

BACKEND_BASE_URL = os.getenv("BACKEND_BASE_URL", "http://localhost:8000")
SUITE_ANALYZE_URL = f"{BACKEND_BASE_URL.rstrip('/')}/api/threats/suite-analyze"

SERVICE_TO_CHECK = {
    "email_phishing": "phishingMessaging",
    "url_phishing": "maliciousUrl",
    "prompt_injection": "promptInjection",
    "anomaly": "anomalyLogs",
    "ai_content": "aiGeneratedContent",
    "deepfake_image": "deepfakeImage",
    "deepfake_voice": "deepfakeAudio",
}

SERVICE_LABELS = {
    "email_phishing": "Email Phishing",
    "url_phishing": "URL Phishing",
    "prompt_injection": "Prompt Injection",
    "anomaly": "Anomaly Detection",
    "ai_content": "AI Generated Content",
    "deepfake_image": "Deepfake Image",
    "deepfake_voice": "Deepfake Voice",
}


class AnalyzeRequest(BaseModel):
    service: str
    text: Optional[str] = None
    image_base64: Optional[str] = None
    audio_base64: Optional[str] = None


def build_suite_payload(data: AnalyzeRequest):
    service = data.service

    if service == "email_phishing":
        if not data.text:
            raise HTTPException(status_code=400, detail="Email text is required.")
        return {"messageText": data.text, "saveToLog": False}

    if service == "url_phishing":
        if not data.text:
            raise HTTPException(status_code=400, detail="URL text is required.")
        return {"url": data.text.strip(), "saveToLog": False}

    if service == "prompt_injection":
        if not data.text:
            raise HTTPException(status_code=400, detail="Prompt text is required.")
        return {"promptInput": data.text, "saveToLog": False}

    if service == "anomaly":
        if not data.text:
            raise HTTPException(status_code=400, detail="Log or activity text is required.")
        return {"logText": data.text, "saveToLog": False}

    if service == "ai_content":
        if not data.text:
            raise HTTPException(status_code=400, detail="Content text is required.")
        return {"generatedText": data.text, "saveToLog": False}

    if service == "deepfake_image":
        if not data.image_base64:
            raise HTTPException(status_code=400, detail="Image data is required.")
        return {"imageBase64": data.image_base64, "saveToLog": False}

    if service == "deepfake_voice":
        if not data.audio_base64:
            raise HTTPException(status_code=400, detail="Audio data is required.")
        return {"audioBase64": data.audio_base64, "saveToLog": False}

    raise HTTPException(status_code=400, detail=f"Unsupported service '{service}'.")


def format_bot_response(service: str, backend_result: dict):
    check_key = SERVICE_TO_CHECK.get(service)
    checks = backend_result.get("checks") or {}
    selected = checks.get(check_key) or {}
    explanation = selected.get("explanation") or backend_result.get("summary") or "No explanation returned."
    if isinstance(explanation, list):
        explanation = " ".join(str(item) for item in explanation if item)

    return {
        "service": service,
        "serviceLabel": SERVICE_LABELS.get(service, service),
        "isSuspicious": bool(selected.get("isSuspicious", backend_result.get("isSuspicious", False))),
        "riskScore": int(selected.get("riskScore", backend_result.get("overallRiskScore", 0))),
        "riskLevel": selected.get("riskLevel", backend_result.get("riskLevel", "LOW")),
        "threatType": selected.get("threatType", backend_result.get("primaryThreatType", "None")),
        "label": selected.get("label", "unknown"),
        "confidence": float(selected.get("confidence", 0)),
        "model": selected.get("model"),
        "source": selected.get("source", backend_result.get("runtime", {}).get("mode", "unknown")),
        "recommendation": backend_result.get("recommendation"),
        "explanation": explanation,
        "summary": backend_result.get("summary", ""),
        "raw": selected,
    }


@app.get("/health")
def health():
    return {"status": "ok", "backend": SUITE_ANALYZE_URL}


@app.post("/analyze")
def analyze(data: AnalyzeRequest):
    payload = build_suite_payload(data)

    try:
        response = requests.post(SUITE_ANALYZE_URL, json=payload, timeout=60)
        response.raise_for_status()
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"Backend scan request failed: {exc}") from exc

    backend_result = response.json()
    return format_bot_response(data.service, backend_result)
