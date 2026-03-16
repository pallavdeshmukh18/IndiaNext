# Quick Start Guide - IndiaNext

## 🚀 Fast Setup (5 minutes)

### 1. Prerequisites Check
```bash
node --version  # Should be 16+
npm --version   # Should be 8+
python3 --version  # Optional, but recommended
```

### 2. One-Command Setup

**Windows:**
```bash
.\setup.bat
```

**Mac/Linux:**
```bash
bash setup.sh
```

This will:
- ✓ Install all dependencies
- ✓ Create environment files
- ✓ Verify your setup

### 3. Start the Application

**Option A: Docker (Easiest)**
```bash
docker-compose up
```
Then open: http://localhost:5173

**Option B: Manual (3 terminals)**

Terminal 1:
```bash
cd backend
npm run dev
```

Terminal 2:
```bash
cd frontend
npm run dev
```

Then open: http://localhost:5173

### 4. First Steps

1. **Register a test account**
   - Click "Sign Up" on login page
   - Use any email/password

2. **Try a scan**
   - Go to "Analyze" tab
   - Paste a sample: "Urgent: verify your account now"
   - Click "Run analysis"

3. **View results**
   - Check Dashboard for stats
   - View History for past scans
   - Check Alerts for high-risk items

---

## 🔧 Configuration

### Backend (.env)
The most important variables:
```
PORT=8000
MONGO_URI=mongodb+srv://your-username:your-password@cluster.mongodb.net/IndiaNext
HF_API_TOKEN=hf_your_token_here
```

### Frontend (.env)
```
VITE_API_BASE_URL=http://localhost:8000/api
```

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Port 8000 already in use | Change PORT in backend/.env |
| MongoDB connection failed | Check MONGO_URI in .env |
| Frontend shows "mock data" | Ensure backend is running, check API URL |
| Module not found errors | Run `npm install` in the affected directory |
| Models won't load | Set HF_INFERENCE_MODE=api and add HF_API_TOKEN |

---

## 📊 Testing the Connection

### Check Backend is Running
```bash
curl http://localhost:8000
# Should return JSON with status "ok"
```

### Test Authentication
```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Test",
    "email":"test@example.com",
    "password":"password123"
  }'
```

### Test Analysis
```bash
curl -X POST http://localhost:8000/api/threats/quick-analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "messageText":"Urgent: verify your account",
    "inputType":"messageText"
  }'
```

---

## 📚 Project Structure

```
├── backend/           # API Server (Node.js/Express)
├── frontend/          # Web UI (React/Vite)
├── ML/                # ML Models (Python)
├── INTEGRATION_GUIDE.md  # Full integration documentation
└── setup.sh/setup.bat   # Automatic setup script
```

---

## 🌐 Access Points

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000/api
- **MongoDB**: localhost:27017 (if running locally)

---

## 🚀 Next Steps

1. **Customize**: Edit components in `frontend/src/components/`
2. **Add features**: Extend API endpoints in `backend/routes/`
3. **Deploy**: Follow INTEGRATION_GUIDE.md deployment section
4. **Integrate email**: Set up Gmail API in `backend/config/googleAuth.js`

---

## 📖 Full Documentation

See [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) for:
- Complete architecture overview
- API endpoint reference
- ML service documentation
- Docker deployment
- Troubleshooting guide

---

## ✅ Checklist

- [ ] Node.js 16+ installed
- [ ] MongoDB running or Atlas account ready
- [ ] Hugging Face API token (optional but recommended)
- [ ] `.env` files configured
- [ ] Backend running on port 8000
- [ ] Frontend running on port 5173
- [ ] Can login with test account
- [ ] Can submit a threat analysis
- [ ] Results appear in Dashboard/History

---

## 💡 Tips

- Use the **Analysis** page to test threat detection
- Check **Dashboard** for analytics overview
- Review **History** to search past scans
- **Alerts** show HIGH-risk cases
- **Inbox** demonstrates email integration

---

## 🆘 Need Help?

1. Check [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)
2. Review backend logs: `npm run dev` output
3. Check browser console: F12 → Console tab
4. Verify `.env` files have correct values
5. Ensure MongoDB is accessible

---

Enjoy using IndiaNext! 🎉
