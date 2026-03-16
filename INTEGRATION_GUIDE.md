# IndiaNext - Full Stack Integration Guide

## Project Overview

IndiaNext is a comprehensive AI-powered threat detection and analysis platform with three main components:
- **Backend**: Node.js/Express API server with ML service integration
- **Frontend**: React (Vite) dashboard and UI
- **ML Services**: Python-based threat detection models (phishing URLs, emails, etc.)

---

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌──────────────┐
│   Frontend  │◄───────►│   Backend    │◄───────►│   ML Service │
│  (React)    │  HTTP   │  (Node.js)   │  Child  │  (Python)    │
│  Port 5173  │         │  Port 8000   │ Process │  Subprocess  │
└─────────────┘         └──────────────┘         └──────────────┘
                              │
                              ▼
                        ┌──────────────┐
                        │   MongoDB    │
                        │              │
                        └──────────────┘
```

---

## Component Details

### Backend (`/backend`)

**Technologies**: Express.js, MongoDB, Mongoose, JWT, Hugging Face APIs

**Key Services**:
- **Authentication**: JWT-based auth with Google OAuth support
- **Threat Detection**: ML model integration via Hugging Face APIs or local models
- **Scan Logging**: Historical scan data persistence
- **Analytics**: Threat trends, statistics, alerts
- **Security**: Auth middleware, input validation

**Main Endpoints**:
```
POST   /auth/register              - User registration
POST   /auth/login                 - User login
POST   /auth/google                - Google OAuth login
POST   /api/threats/analyze        - Full threat analysis
POST   /api/threats/quick-analyze  - Quick threat scan
POST   /api/threats/suite-analyze  - Multi-input analysis
POST   /api/threats/live-screen    - Live screen analysis
GET    /api/analytics              - User analytics
GET    /api/analytics/trends       - Threat trends
GET    /api/analytics/threat-types - Threat classifications
GET    /api/alerts                 - High-risk alerts
GET    /api/scans                  - Scan history
GET    /api/scans/:id              - Individual scan details
```

### Frontend (`/frontend`)

**Technologies**: React 19, Vite, React Router, Lucide Icons, Three.js

**Key Pages**:
- **Landing**: Marketing homepage
- **Login/Signup**: Authentication UI
- **Dashboard**: Analytics overview, threat summary, recent scans
- **Analysis**: Multi-channel threat submission interface
- **History**: Searchable scan history with filters
- **Alerts**: High-priority alert queue
- **Inbox**: Gmail/email integration (mock data)

**Features**:
- Real-time API integration with fallback to mock data
- Session persistence with localStorage
- Responsive design with Tailwind CSS
- 3D graphics with Three.js
- Smooth animations with Framer Motion

### ML Services (`/ML`)

**Components**:
- **hf_local**: Local Hugging Face model inference
- **phishing_url**: Malicious URL detection (sklearn model)
- **phishing_mail**: Email phishing classification

**Supported Threat Types**:
- Phishing Messages
- Malicious URLs
- Prompt Injection
- Deepfake Images
- Deepfake Audio
- AI-Generated Text
- Anomaly Detection in Logs
- Screen OCR Analysis

---

## Setup & Installation

### Prerequisites

- Node.js 16+ and npm
- Python 3.8+ with pip
- MongoDB (local or cloud)
- Hugging Face API token (optional, for HF API mode)

### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment (.env already exists)
# Edit .env with your MongoDB URI, JWT secret, HF token, etc.

# Start development server
npm run dev
# Or production
npm start
```

**Key Environment Variables** (in `.env`):
```
PORT=8000
MONGO_URI=mongodb+srv://...
JWT_SECRET=your-secret
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
HF_API_TOKEN=hf_...
HF_INFERENCE_MODE=api  # or 'local'
PYTHON_BIN=python3
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Environment is already configured in .env
# VITE_API_BASE_URL=http://localhost:8000/api
# VITE_GOOGLE_CLIENT_ID=...

# Start development server
npm run dev
# Runs on http://localhost:5173

# Build for production
npm run build
```

### 3. ML Models Setup (Optional - for local inference)

```bash
cd ML/hf_local

# Install Python dependencies
pip install -r requirements.txt

# Download and cache models locally
python setup_models.py
```

---

## API Integration Flow

### 1. User Authentication

```
User → Login Page → POST /auth/login → Backend validates → JWT created
         ↓
      Store token in localStorage (via session.js)
         ↓
      All subsequent requests include: Authorization: Bearer {token}
```

### 2. Threat Analysis Flow

```
User enters suspicious content → Frontend /analysis page
         ↓
Form submission → POST /api/threats/analyze
         ↓
Backend receives input → Detects threat type
         ↓
ML Service (HF API/local) → Threat classification
         ↓
Risk scoring & recommendation → Save to MongoDB
         ↓
Response returned → Display on Frontend
         ↓
User sees: Risk level, confidence, explanation, indicators
```

### 3. Dashboard Analytics Flow

```
User visits Dashboard → Frontend loads session
         ↓
Parallel API calls:
  - GET /api/analytics (overall stats)
  - GET /api/analytics/trends (7-day trend)
  - GET /api/analytics/threat-types (threat breakdown)
  - GET /api/alerts (HIGH-risk scans)
  - GET /api/scans?limit=8 (recent scans)
         ↓
Backend aggregates from MongoDB
         ↓
Frontend renders charts, cards, summaries
```

---

## Running the Full Stack

### Option 1: Manual (3 Terminals)

**Terminal 1 - Backend**:
```bash
cd backend
npm run dev
# Runs on http://localhost:8000
```

**Terminal 2 - Frontend**:
```bash
cd frontend
npm run dev
# Runs on http://localhost:5173
```

**Terminal 3 - Python ML (if running local inference)**:
```bash
# ML services run as Node.js child processes - no separate terminal needed
```

### Option 2: Using Docker Compose (Recommended for deployment)

Create `docker-compose.yml` in project root:

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:6
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_DATABASE: IndiaNext

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - PORT=8000
      - MONGO_URI=mongodb://mongodb:27017/IndiaNext
      - JWT_SECRET=your-secret-key
      - HF_API_TOKEN=${HF_API_TOKEN}
    depends_on:
      - mongodb
    volumes:
      - ./backend:/app
      - /app/node_modules

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "5173:5173"
    environment:
      - VITE_API_BASE_URL=http://localhost:8000/api
    depends_on:
      - backend
    volumes:
      - ./frontend:/app
      - /app/node_modules
```

Run with:
```bash
docker-compose up
```

---

## Testing the Integration

### 1. Test Authentication

```bash
# Register
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### 2. Test Threat Analysis

```bash
# Quick analyze
TOKEN="your-jwt-token"
curl -X POST http://localhost:8000/api/threats/quick-analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "messageText": "Urgent: verify your account now",
    "inputType": "messageText"
  }'
```

### 3. Test Dashboard

1. Open http://localhost:5173
2. Login with test credentials
3. Navigate to Dashboard - should show analytics
4. Click "Analyze" to submit threat
5. View in History after submission

---

## Troubleshooting

### Issue: Frontend shows "Mock data" instead of live data

**Solution**: 
- Ensure backend is running on port 8000
- Check `.env` has `VITE_API_BASE_URL=http://localhost:8000/api`
- Verify no CORS errors in browser console
- Check token is being sent in Authorization header

### Issue: MongoDB connection fails

**Solution**:
- Verify MongoDB is running
- Check `MONGO_URI` in `.env` is correct
- If using MongoDB Atlas, ensure IP is whitelisted
- Connection string format: `mongodb+srv://user:pass@cluster.mongodb.net/dbname`

### Issue: ML models failing to load

**Solution**:
- If using HF API: Ensure `HF_API_TOKEN` is set and valid
- If using local inference: Run `python setup_models.py` in `/ML/hf_local`
- Check `HF_INFERENCE_MODE` in `.env` matches setup
- Review backend logs for specific model errors

### Issue: CORS errors from frontend

**Solution**:
- Backend has `cors()` enabled globally
- Ensure frontend is making requests to correct API URL
- Check browser Network tab for actual request URLs

---

## Environment Variables Reference

### Backend `.env`

| Variable | Purpose | Example |
|----------|---------|---------|
| `PORT` | Backend server port | `8000` |
| `MONGO_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster...` |
| `JWT_SECRET` | JWT signing secret | `your-secret-key` |
| `GOOGLE_CLIENT_ID` | Google OAuth ID | `xxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret | `GOCSP...` |
| `HF_API_TOKEN` | Hugging Face API token | `hf_...` |
| `HF_INFERENCE_MODE` | Model inference mode | `api` or `local` |
| `PYTHON_BIN` | Python executable | `python3` |

### Frontend `.env`

| Variable | Purpose | Example |
|----------|---------|---------|
| `VITE_API_BASE_URL` | Backend API URL | `http://localhost:8000/api` |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID | `xxx.apps.googleusercontent.com` |

---

## Project Structure

```
indianext/
├── backend/                    # Node.js/Express server
│   ├── models/                # MongoDB schemas
│   ├── controllers/           # Route handlers
│   ├── services/              # Business logic & ML integration
│   ├── routes/                # API endpoints
│   ├── middleware/            # Auth, validation, etc.
│   ├── utils/                 # Helpers (token generation, verification)
│   ├── bot/                   # WhatsApp/Telegram integrations
│   ├── server.js              # Main entry point
│   └── .env                   # Configuration
│
├── frontend/                   # React/Vite application
│   ├── src/
│   │   ├── pages/             # Page components (dashboard, analysis, etc.)
│   │   ├── components/        # Reusable components
│   │   ├── lib/               # Utilities (API client, session mgmt)
│   │   ├── App.jsx            # Main app component
│   │   └── main.jsx           # Entry point
│   ├── .env                   # Frontend configuration
│   └── vite.config.js         # Vite configuration
│
├── ML/
│   ├── hf_local/              # Local Hugging Face models
│   │   ├── infer.py           # Model inference script
│   │   └── models/            # Downloaded models
│   ├── phishing_url/          # URL phishing detection
│   │   ├── predict.py         # Prediction service
│   │   └── data/              # Model data
│   └── phishing_mail/         # Email classification
│
└── README.md                   # Project documentation
```

---

## Next Steps

1. **Verify all endpoints work** - Run API tests above
2. **Customize UI** - Modify frontend components in `/frontend/src/components`
3. **Integrate email** - Connect Gmail API (already has config in backend)
4. **Deploy** - Use Docker Compose or cloud platform
5. **Monitor** - Set up logging and error tracking

---

## Support & Issues

For issues or questions:
1. Check backend logs: `npm run dev` output
2. Check frontend console: Browser DevTools
3. Verify environment variables are set correctly
4. Check MongoDB is accessible
5. Review API response in Network tab of browser DevTools

---

## License

Proprietary - All Rights Reserved
