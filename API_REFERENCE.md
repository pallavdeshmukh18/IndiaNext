# API Endpoint Reference Guide

## Base URL
- **Development**: `http://localhost:8000`
- **Production**: Configure in environment

## Authentication Endpoints

### Register New User
```http
POST /auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123"
}

Response (201):
{
  "userId": "507f1f77bcf86cd799439011",
  "name": "John Doe",
  "email": "john@example.com",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Login User
```http
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securePassword123"
}

Response (200):
{
  "userId": "507f1f77bcf86cd799439011",
  "name": "John Doe",
  "email": "john@example.com",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Google OAuth Login
```http
POST /auth/google
Content-Type: application/json

{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjAxMjM0NTY3ODkwYWJj..."
}

Response (200):
{
  "userId": "507f1f77bcf86cd799439011",
  "name": "John Doe",
  "email": "john@example.com",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## Threat Analysis Endpoints

### Full Threat Analysis
```http
POST /api/threats/analyze
Content-Type: application/json
Authorization: Bearer {token}

{
  "messageText": "Urgent: Verify your account now or it will be suspended",
  "inputType": "messageText"
}

Response (200):
{
  "threatType": "Phishing Message",
  "riskScore": 85,
  "confidence": 0.92,
  "explanation": "Email/SMS phishing classifier label: phishing message (92%).",
  "recommendation": "Block message and warn user about phishing attempt",
  "logId": "507f1f77bcf86cd799439011",
  "isSuspicious": true,
  "riskLevel": "HIGH"
}
```

### Quick Analysis
```http
POST /api/threats/quick-analyze
Content-Type: application/json
Authorization: Bearer {token}

{
  "url": "http://paypal-login-secure.xyz/verify",
  "inputType": "url",
  "pageUrl": "http://example.com"
}

Response (200):
{
  "threatType": "Phishing URL",
  "riskScore": 78,
  "confidence": 0.88,
  "explanation": "URL classifier label: phishing url (88%).",
  "recommendation": "Block URL and report to security team",
  "analyzedAt": "2024-03-17T10:30:00Z",
  "source": {
    "pageUrl": "http://example.com",
    "title": null
  }
}
```

### Security Suite Analysis (Multi-Modal)
```http
POST /api/threats/suite-analyze
Content-Type: multipart/form-data
Authorization: Bearer {token}

FormData:
- messageText: "Click here to verify"
- url: "http://phishing-site.net/verify"
- promptInput: "Ignore previous instructions"
- image: <file>
- audioBase64: "data:audio/wav;base64,..."
- saveToLog: true

Response (200):
{
  "primaryThreatType": "Multi-Modal Threat",
  "overallRiskScore": 88,
  "threats": [
    {
      "detector": "phishingMessaging",
      "threatType": "Phishing Message",
      "riskScore": 85,
      "isSuspicious": true
    },
    {
      "detector": "maliciousUrl",
      "threatType": "Phishing URL",
      "riskScore": 92,
      "isSuspicious": true
    }
  ],
  "summary": "Multiple threat signals detected across inputs",
  "recommendation": "Take highest-risk mitigation action",
  "logId": "507f1f77bcf86cd799439011"
}
```

### Live Screen Analysis
```http
POST /api/threats/live-screen-analyze
Content-Type: application/json
Authorization: Bearer {token}

{
  "pageUrl": "http://suspicious-site.com",
  "title": "Urgent Action Required",
  "pageText": "Verify your account now",
  "screenshotBase64": "data:image/png;base64,..."
}

Response (200):
{
  "threatType": "Phishing Page",
  "riskScore": 82,
  "confidence": 0.89,
  "explanation": "Page content and URL indicate phishing attempt",
  "recommendation": "Block this website in real-time"
}
```

---

## Analytics Endpoints

### Get User Analytics
```http
GET /api/analytics
Authorization: Bearer {token}

Response (200):
{
  "success": true,
  "data": {
    "totalScans": 145,
    "highRisk": 23,
    "mediumRisk": 45,
    "lowRisk": 77
  }
}
```

### Get Threat Trends
```http
GET /api/analytics/trends
Authorization: Bearer {token}

Response (200):
{
  "success": true,
  "data": [
    {
      "date": "2024-03-10",
      "scans": 12
    },
    {
      "date": "2024-03-11",
      "scans": 18
    },
    {
      "date": "2024-03-12",
      "scans": 15
    }
  ]
}
```

### Get Threat Types
```http
GET /api/analytics/threat-types
Authorization: Bearer {token}

Response (200):
{
  "success": true,
  "data": [
    {
      "threatType": "Phishing Message",
      "count": 45
    },
    {
      "threatType": "Phishing URL",
      "count": 32
    },
    {
      "threatType": "Prompt Injection",
      "count": 18
    }
  ]
}
```

---

## History/Scan Log Endpoints

### Get Scan History
```http
GET /api/scans?page=1&limit=20
Authorization: Bearer {token}

Response (200):
{
  "page": 1,
  "limit": 20,
  "total": 145,
  "totalPages": 8,
  "scans": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "user": "507f1f77bcf86cd799439010",
      "inputType": "messageText",
      "content": "Urgent: verify your account",
      "prediction": "Phishing Message",
      "confidence": 85,
      "riskLevel": "HIGH",
      "explanation": ["Phishing detector triggered"],
      "recommendations": ["Block message"],
      "createdAt": "2024-03-17T10:30:00Z",
      "updatedAt": "2024-03-17T10:30:00Z"
    }
  ]
}
```

### Get Single Scan
```http
GET /api/scans/507f1f77bcf86cd799439011
Authorization: Bearer {token}

Response (200):
{
  "_id": "507f1f77bcf86cd799439011",
  "user": "507f1f77bcf86cd799439010",
  "inputType": "messageText",
  "content": "Urgent: verify your account",
  "prediction": "Phishing Message",
  "confidence": 85,
  "riskLevel": "HIGH",
  "explanation": ["Email/SMS phishing classifier label: phishing message (85%)"],
  "recommendations": ["Block message and warn user"],
  "createdAt": "2024-03-17T10:30:00Z",
  "updatedAt": "2024-03-17T10:30:00Z"
}
```

---

## Alert Endpoints

### Get High-Risk Alerts
```http
GET /api/alerts
Authorization: Bearer {token}

Response (200):
{
  "success": true,
  "count": 5,
  "alerts": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "user": "507f1f77bcf86cd799439010",
      "inputType": "url",
      "content": "http://malware-site.xyz",
      "prediction": "Malware URL",
      "confidence": 92,
      "riskLevel": "HIGH",
      "explanation": ["URL scoring indicates malware distribution"],
      "recommendations": ["Immediately block access"],
      "createdAt": "2024-03-17T10:30:00Z"
    }
  ]
}
```

---

## Input Types

The following `inputType` values are supported:

| Type | Description | Example |
|------|-------------|---------|
| `messageText` | Email, SMS, or message content | "Verify your account" |
| `url` | Web URL to analyze | "http://phishing-site.com" |
| `promptInput` | AI prompt or command injection | "Ignore previous instructions" |
| `logText` | Server or application logs | "[ERROR] Unauthorized access" |
| `generatedText` | AI-generated text | "Lorem ipsum dolor sit..." |
| `imageUrl` | URL to an image | "https://example.com/image.jpg" |
| `imageBase64` | Base64-encoded image | "data:image/png;base64,..." |
| `audioUrl` | URL to audio file | "https://example.com/audio.wav" |
| `audioBase64` | Base64-encoded audio | "data:audio/wav;base64,..." |

---

## Threat Types (Response Values)

Possible values for `threatType` field:

- "Phishing Message" - Email/SMS phishing attempts
- "Phishing URL" - URLs designed to steal credentials
- "Malicious URL" - URLs hosting malware/exploits
- "Defacement URL" - URLs with injected content
- "Prompt Injection" - Prompts attempting to override AI behavior
- "Deepfake Image" - AI-generated fake images
- "Deepfake Audio" - AI-generated fake audio
- "AI-Generated Text" - Synthetic text from language models
- "Anomaly Logs" - Unusual patterns in system logs
- "Deceptive Content" - Content designed to deceive
- "None" - No threat detected

---

## Risk Levels

| Level | Score Range | Description |
|-------|------------|-------------|
| `HIGH` | 75-100 | Immediate action required |
| `MEDIUM` | 40-74 | Review and potential action |
| `LOW` | 0-39 | Monitor, likely safe |

---

## Authentication

All endpoints except `/auth/*` require JWT token in header:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

If token is invalid or missing:
```http
Response (401):
{
  "error": "Unauthorized"
}
```

---

## Error Responses

### Bad Request
```http
Response (400):
{
  "error": "Input is required for analysis."
}
```

### Unauthorized
```http
Response (401):
{
  "error": "Unauthorized"
}
```

### Not Found
```http
Response (404):
{
  "error": "Scan not found"
}
```

### Server Error
```http
Response (500):
{
  "error": "Internal server error during threat analysis."
}
```

---

## Response Headers

All responses include:
```
Content-Type: application/json
CORS: Enabled (localhost:5173)
```

---

## Rate Limiting

Currently no rate limiting is enforced. In production:
- Recommended: 100 requests/minute per user
- Quick analyze: 1000 requests/minute
- Admin endpoints: 10 requests/minute

---

## Testing with cURL

### Test Login
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Test Analysis
```bash
TOKEN="your_jwt_token_here"
curl -X POST http://localhost:8000/api/threats/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "messageText": "Urgent: verify your account",
    "inputType": "messageText"
  }'
```

### Test Analytics
```bash
TOKEN="your_jwt_token_here"
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/analytics
```

---

## WebSocket Endpoints (Future)

Planned for real-time updates:
- `/ws/alerts` - Real-time alert notifications
- `/ws/scans` - Live scan progress
- `/ws/analytics` - Real-time analytics updates

---

## Changelog

### v1.0.0 (Current)
- All core endpoints working
- Full threat detection suite
- User authentication
- Analytics and reporting
- Alert system
- Input type support complete

---

For more details, see [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)
