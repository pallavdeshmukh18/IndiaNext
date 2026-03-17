# 🛡️ Krypton - AI-Powered Threat Detection Platform

**IndiaNext** is a comprehensive, full-stack threat detection and analysis platform that leverages machine learning to protect users from phishing, malware, prompt injection, deepfakes, and other digital threats across multiple channels: email, messaging, URLs, logs, and more.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- npm 8+
- MongoDB (local or Atlas)
- Python 3.8+ (optional, for local ML inference)

### One-Command Setup

**Windows:**
```bash
.\setup.bat
```

**Mac/Linux:**
```bash
bash setup.sh
```

### Run the Stack

**Option 1: Docker (Recommended)**
```bash
docker-compose up
# Opens http://localhost:5173
```

**Option 2: Manual (3 Terminals)**
```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev

# Terminal 3
# Open http://localhost:5173
```

---

## 📖 Documentation

### Getting Started
- **[QUICKSTART.md](./QUICKSTART.md)** - 5-minute setup guide
- **[INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)** - Complete integration documentation
- **[INTEGRATION_SUMMARY.md](./INTEGRATION_SUMMARY.md)** - What's been integrated

### Reference
- **[API_REFERENCE.md](./API_REFERENCE.md)** - Complete API endpoint guide
- [API Endpoints](#-api-endpoints) - Quick reference below

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│         IndiaNext Threat Detection             │
└─────────────────────────────────────────────────┘

Frontend (React/Vite)     Backend (Node.js)       ML Services (Python)
├─ Dashboard             ├─ API Routes           ├─ Phishing Detection
├─ Analysis              ├─ Controllers          ├─ URL Analysis  
├─ History              ├─ Services             ├─ Prompt Injection
├─ Alerts               ├─ Middleware           ├─ Deepfake Detection
└─ Inbox                ├─ Models               └─ Log Anomalies
                        └─ Database             
                                                MongoDB
                                                └─ User Data
                                                └─ Scans
                                                └─ Analytics
```

---

## 🎯 Key Features

### 🔍 Threat Detection
- **Phishing Messages** - Email & SMS phishing classification
- **Malicious URLs** - Website threat analysis
- **Prompt Injection** - AI jailbreak detection
- **Deepfake Media** - Image and audio synthetic content detection
- **Log Anomalies** - System log pattern analysis
- **AI-Generated Text** - Synthesized content identification

### 📊 Analytics & Reporting
- Real-time threat trends
- Risk level distribution
- Threat type breakdown
- High-priority alert queue
- Searchable scan history

### 👥 User Management
- Email/Password registration
- Google OAuth integration
- JWT token-based sessions
- Per-user analytics and history

### 🚀 Multi-Channel Support
- Web interface
- Browser extension integration
- WhatsApp bot (Twilio)
- Telegram bot integration
- Gmail integration

---

## 📁 Project Structure

```
indianext/
├── backend/                    # Node.js/Express API Server
│   ├── models/                # MongoDB Schemas
│   ├── controllers/           # Request Handlers
│   ├── services/              # Business Logic & ML Integration
│   ├── routes/                # API Endpoints
│   ├── middleware/            # Auth, Validation
│   ├── utils/                 # Utilities
│   ├── bot/                   # WhatsApp/Telegram bots
│   ├── server.js              # Entry Point
│   ├── .env                   # Configuration
│   └── package.json
│
├── frontend/                   # React/Vite Application
│   ├── src/
│   │   ├── pages/            # Page Components
│   │   ├── components/       # Reusable Components
│   │   ├── lib/              # Utilities (API, Session)
│   │   ├── assets/           # Images, Fonts
│   │   ├── App.jsx           # Root Component
│   │   └── main.jsx          # Entry Point
│   ├── .env                  # Configuration
│   ├── vite.config.js        # Build Config
│   └── package.json
│
├── ML/                         # Machine Learning Services
│   ├── hf_local/             # Local HF Model Inference
│   │   ├── infer.py          # Inference Script
│   │   ├── models/           # Downloaded Models
│   │   └── requirements.txt
│   ├── phishing_url/         # URL Detection Models
│   │   ├── predict.py        # Prediction Script
│   │   └── data/
│   └── phishing_mail/        # Email Classification
│
├── INTEGRATION_GUIDE.md        # Full Integration Documentation
├── INTEGRATION_SUMMARY.md      # What's Been Integrated
├── QUICKSTART.md              # Fast Setup Guide
├── API_REFERENCE.md           # API Endpoint Reference
├── docker-compose.yml         # Stack Orchestration
├── setup.sh / setup.bat       # Automated Setup
└── README.md                  # This File
```

---

## 🔗 API Endpoints

### Authentication (No Auth Required)
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `POST /auth/google` - Google OAuth login

### Threat Analysis (Auth Required)
- `POST /api/threats/analyze` - Full threat analysis
- `POST /api/threats/quick-analyze` - Quick scan
- `POST /api/threats/suite-analyze` - Multi-modal analysis
- `POST /api/threats/live-screen-analyze` - Live screen analysis

### Analytics
- `GET /api/analytics` - User statistics
- `GET /api/analytics/trends` - Threat trends
- `GET /api/analytics/threat-types` - Threat breakdown

### History & Alerts
- `GET /api/scans` - Scan history (paginated)
- `GET /api/scans/:id` - Individual scan details
- `GET /api/alerts` - High-risk alerts

**See [API_REFERENCE.md](./API_REFERENCE.md) for detailed documentation.**

---

## 🔐 Configuration

### Backend `.env`
```env
PORT=8000
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/IndiaNext
JWT_SECRET=your-secret-key
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
HF_API_TOKEN=hf_xxx  # For Hugging Face API
HF_INFERENCE_MODE=api  # or 'local'
PYTHON_BIN=python3
```

### Frontend `.env`
```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
```

**See `.env.example` files for complete configuration templates.**

---

## 🛠️ Development

### Start Development Servers

```bash
# Backend (Terminal 1)
cd backend
npm install  # First time only
npm run dev

# Frontend (Terminal 2)
cd frontend
npm install  # First time only
npm run dev

# Visit http://localhost:5173
```

### Build & Deploy

```bash
# Backend
cd backend
npm run build  # If using TypeScript

# Frontend
cd frontend
npm run build
npm run preview  # Test production build

# Docker
docker-compose up  # Development
docker-compose -f docker-compose.prod.yml up  # Production (create this file)
```

---

## 🧪 Testing

### Test Authentication
```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Test User",
    "email":"test@example.com",
    "password":"password123"
  }'
```

### Test Threat Analysis
```bash
TOKEN="your-jwt-token"
curl -X POST http://localhost:8000/api/threats/quick-analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "messageText": "Urgent: verify your account",
    "inputType": "messageText"
  }'
```

**See [API_REFERENCE.md](./API_REFERENCE.md) for more examples.**

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Port 8000 already in use | Change `PORT` in backend/.env |
| MongoDB connection failed | Check `MONGO_URI` in .env |
| Frontend shows "mock data" | Ensure backend is running on correct port |
| ML models won't load | Set `HF_API_TOKEN` or run `python setup_models.py` |
| Module not found | Run `npm install` in affected directory |

**See [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) for detailed troubleshooting.**

---

## 📚 Learning Resources

1. **First Time Setup**: Follow [QUICKSTART.md](./QUICKSTART.md)
2. **Full Integration**: Read [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)
3. **API Development**: See [API_REFERENCE.md](./API_REFERENCE.md)
4. **Integration Status**: Check [INTEGRATION_SUMMARY.md](./INTEGRATION_SUMMARY.md)

---

## 🚀 Deployment

### Production Checklist
- [ ] Set strong `JWT_SECRET`
- [ ] Use production MongoDB URI
- [ ] Configure Hugging Face API token
- [ ] Set up Google OAuth credentials
- [ ] Update CORS origins for frontend
- [ ] Enable HTTPS
- [ ] Set up monitoring/logging
- [ ] Configure backups for MongoDB
- [ ] Set up CI/CD pipeline

### Cloud Deployment Options
- **AWS**: EC2 + RDS + SageMaker
- **Google Cloud**: App Engine + Cloud SQL
- **Azure**: App Service + Azure SQL
- **Heroku**: Easy deployment (free tier available)
- **DigitalOcean**: Droplets + Managed DB

---

## 🤝 Contributing

To contribute to IndiaNext:

1. Create a feature branch
2. Make your changes
3. Test locally
4. Submit a pull request

---

## 📝 License

All rights reserved. Proprietary software.

---

## 💬 Support

For issues, questions, or feature requests:

1. Check the [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)
2. Review [API_REFERENCE.md](./API_REFERENCE.md)
3. Check browser console for errors
4. Review backend server logs
5. Verify environment configuration

---

## 🎉 Ready to Use

Everything is fully integrated and ready to deploy. Start with:

```bash
docker-compose up
# Open http://localhost:5173
```

Enjoy using IndiaNext! 🛡️
