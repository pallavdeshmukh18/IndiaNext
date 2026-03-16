# IndiaNext Threat Lens Extension

## What it does

- Monitors the current web page for phishing signals in real time.
- Captures a screenshot and runs OCR to extract visible text.
- Checks for login forms, suspicious keywords, and brand/domain mismatches.
- Flags fake login pages, brand impersonation, and risky flows.

## Setup

### 1. Backend requirements
- Start the backend server (Node.js, Express).
- Ensure your backend `.env` includes:
  - `HF_INFERENCE_MODE=api`
  - `HF_API_TOKEN=your_hf_token` (required for Hugging Face API calls)
  - `HF_MODEL_SCREEN_OCR=microsoft/trocr-base-printed` (recommended for OCR)
- The backend must expose `/api/threats/live-screen-analyze`.

### 2. Extension install
- Open Chrome (or Chromium-based browser).
- Go to `chrome://extensions/`.
- Enable "Developer mode".
- Click "Load unpacked" and select the `browser-extension` folder.

### 3. Usage
- Click the Threat Lens icon in your browser.
- Set the backend URL (default: `http://localhost:8000`).
- Click "Scan Current Screen".
- The extension will:
  - Capture a screenshot
  - Extract DOM signals
  - Send both to the backend for analysis
- Results show risk score, threat type, detected brand, domain, OCR excerpt, and evidence.

### 4. Live mode
- Toggle "Live monitor" to scan the page every 8 seconds automatically.

## Troubleshooting
- If screenshots fail, check browser permissions and try reloading the extension.
- If OCR is slow or missing, verify `HF_MODEL_SCREEN_OCR` is set and backend has internet access.
- Backend errors: check `.env` for correct Hugging Face token and model IDs.

## .env changes
- Add this line to your backend `.env`:
  ```
  HF_MODEL_SCREEN_OCR=microsoft/trocr-base-printed
  ```
- All other settings can remain as they are if you already have HF_API_TOKEN and HF_INFERENCE_MODE=api.

## Demo tips
- Use a fake login page with a mismatched domain and brand logo for best effect.
- Results will highlight domain mismatch, login form, and brand evidence.

---
For questions or issues, contact the IndiaNext team.
