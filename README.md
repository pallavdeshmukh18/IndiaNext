# 🛡️ Krypton (IndiaNext) — AI-Powered Multi-Channel Scam Defense

Krypton is a full-stack threat detection platform that identifies scams and suspicious activity across web, messaging, email, and live screen context.

It combines **multichannel ingestion**, **AI-assisted risk analysis**, and **actionable, explainable outputs** in one workspace.

---

## ✨ What’s Included (Final)

### 1) Unified Threat Analysis Workspace
- Analyze suspicious:
  - `messageText`
  - `url`
  - `promptInput`
  - `logText`
  - `generatedText`
  - `imageUrl`
  - `audioUrl`
- **Full Scan mode** runs multiple inputs in one pass and returns per-channel verdicts.

### 2) Live Screen Monitoring + Voice Alerts
- Screen sharing monitor captures periodic frames.
- Vision-capable AI evaluates live screen risk.
- Spoken alerts via browser speech synthesis for fast human response.
- Startup/test voice checks and error feedback are built in.

### 3) Direct Email Fetch + In-Platform Analysis
- Gmail integration fetches inbox context.
- Email content can be analyzed directly inside platform flows.
- Supports triage + history tracking from one UI.

### 4) Chat/Bot Channels
- **WhatsApp bot** flow via Twilio webhooks.
- **Telegram bot** integration for conversational scan interactions.

### 5) Browser Extension
- Extension captures page signals and sends suspicious context into analysis pipeline.
- Useful for real-time browsing protection and domain/page heuristics.

### 6) Combined 7-Model Case Reasoning
Krypton’s scoring pipeline combines outputs from a multi-model stack (classification + heuristics + media/text checks) into a single explainable risk verdict.

### 7) Security Operations Features
- Risk score + risk level (`LOW` / `MEDIUM` / `HIGH`)
- Indicators + recommendation per result
- Alerts queue
- Searchable scan history
- User analytics/trends/threat breakdown

---

## 🏗️ Architecture

- **Frontend**: React + Vite
- **Backend**: Node.js + Express
- **Database**: MongoDB
- **AI/ML**:
  - API-based model inference (HF / AI providers)
  - Local Python model support (optional)
- **Integrations**:
  - Google OAuth + Gmail
  - Twilio WhatsApp
  - Telegram bot
  - Browser extension

---

## 📁 Project Structure

```text
indianext/
├── backend/
│   ├── bot/                    # WhatsApp/Telegram integrations
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── server.js               # Primary backend entry
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/              # Includes Analysis + ScreenMonitor
│   │   ├── components/
│   │   └── lib/
│   ├── vite.config.js
│   └── package.json
├── browser-extension/
├── ML/
├── API_REFERENCE.md
├── INTEGRATION_GUIDE.md
├── QUICKSTART.md
└── README.md
```

---

## 🚀 Quick Start (Local)

### Prerequisites
- Node.js 18+
- npm 8+
- MongoDB (local/Atlas)
- Python 3.8+ (optional, for local ML utilities)

### 1) Install & Run Backend

```bash
cd backend
npm install
npm run dev
```

Backend starts on `http://localhost:8000`.

### 2) Install & Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend starts on `http://localhost:5173`.

---

## 🔐 Environment Variables

## Backend (`backend/.env`)

```env
PORT=8000
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# HF / ML bridge options
HF_API_TOKEN=hf_xxx
HF_INFERENCE_MODE=api
```

## Frontend (`frontend/.env`)

```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_GOOGLE_CLIENT_ID=your_google_client_id

# ScreenMonitor Gemini key (loaded by frontend)
GEMINI_API_KEY=your_gemini_key
```

Notes:
- `GEMINI_API_KEY` is used in the browser runtime for ScreenMonitor.
- `vite.config.js` is configured to read both `VITE_*` and `GEMINI_*` variables.

---

## 🌐 API Endpoints (Core)

### Auth
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/google`

### Threat Analysis
- `POST /api/threats/analyze`
- `POST /api/threats/quick-analyze`
- `POST /api/threats/suite-analyze`
- `POST /api/threats/live-screen-analyze`

### Analytics / Alerts / History
- `GET /api/analytics`
- `GET /api/analytics/trends`
- `GET /api/analytics/threat-types`
- `GET /api/alerts`
- `GET /api/scans`
- `GET /api/scans/:id`

For complete request/response reference, see `API_REFERENCE.md`.

---

## 🚀 Deployment (Recommended)

### Frontend → Vercel
- Root: `frontend`
- Build command: `npm run build`
- Output: `dist`
- Add frontend env vars (`VITE_API_BASE_URL`, `VITE_GOOGLE_CLIENT_ID`, `GEMINI_API_KEY`)

### Backend → Render (Web Service)
- Root: `backend`
- Build command: `npm install`
- Start command: `npm start`
- Required env: `PORT` (Render sets), `MONGO_URI`, `JWT_SECRET`, OAuth/AI keys

Important:
- Backend is configured to bind to `0.0.0.0` and open port early so Render port scan succeeds.

---

## ✅ Demo-Ready Feature Checklist

- [x] Multi-input threat analysis
- [x] Full Scan across channels
- [x] Alerts + History + Analytics dashboard
- [x] Browser extension data ingestion
- [x] WhatsApp bot flow
- [x] Telegram bot integration
- [x] Gmail/email fetch + in-platform scan flow
- [x] Live screen monitoring
- [x] Voice alert output
- [x] Combined 7-model case reasoning

---

## 🧪 Troubleshooting

| Issue | Fix |
|---|---|
| Backend deploy says no open port | Ensure Render service uses `backend` root + `npm start`; backend binds `0.0.0.0` |
| Screen monitor not speaking | Use Chrome/Edge, unmute tab/system, click `Test Voice` in settings |
| Screen monitor AI errors | Verify `GEMINI_API_KEY`, quota, and network; check UI error feed |
| Frontend falls back to mock behavior | Confirm backend URL in `VITE_API_BASE_URL` |
| Mongo connection errors | Verify `MONGO_URI` and network allowlist |

---

## 📚 Additional Docs

- `QUICKSTART.md`
- `INTEGRATION_GUIDE.md`
- `INTEGRATION_SUMMARY.md`
- `API_REFERENCE.md`

---

## 📝 License

Proprietary / All rights reserved - Team NODEtorious.
