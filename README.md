# 🎯 Adaptive Honeypot API - Intelligent Scam Detection System

An advanced AI-powered honeypot system that intelligently engages with scammers, adapts to any scam type, and extracts comprehensive intelligence data.

## 🌟 Key Features

- **🤖 AI-Powered Intelligence**: Uses Google Gemini 2.0 Flash for natural, contextual conversations
- **🎭 Adaptive Personas**: Automatically selects appropriate victim persona based on scam type
- **🔍 Comprehensive Intelligence Extraction**: Automatically extracts phone numbers, UPI IDs, bank accounts, links, and more
- **💬 Natural Conversations**: Engages scammers with human-like responses, varying emotions and reactions
- **🎓 Multi-Scam Support**: Handles lottery scams, bank fraud, UPI scams, fake deliveries, traffic challans, and more
- **📊 Session Management**: Tracks conversations across multiple sessions with MongoDB integration
- **⚡ Production Ready**: Rate limiting, security headers, error handling, and health checks

## 🏗️ Architecture

```
┌─────────────────┐
│   Scammer SMS   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│   Express API Server            │
│   - Authentication              │
│   - Rate Limiting               │
│   - Session Management          │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│   Adaptive Honeypot Agent       │
│   - Scam Type Detection         │
│   - Persona Selection           │
│   - LLM Response Generation     │
│   - Intelligence Extraction     │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│   MongoDB Database              │
│   - Session Storage             │
│   - Conversation Logs           │
│   - Intelligence Data           │
└─────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- MongoDB (optional, but recommended)
- Google Gemini API Key ([Get one here](https://makersuite.google.com/app/apikey))

### Installation

```bash
# Clone the repository
git clone https://github.com/SushrithKbtech/guvi2.git
cd guvi2

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env and add your Gemini API key
# Required: GEMINI_API_KEY
# Optional: API_KEY, MONGODB_URI
```

### Configuration

Edit `.env` file:

```env
PORT=3000
NODE_ENV=production

# Your secret API key (optional)
API_KEY=your-secret-key

# Get from https://makersuite.google.com/app/apikey
GEMINI_API_KEY=your-gemini-api-key

# MongoDB connection string (optional)
MONGODB_URI=mongodb://localhost:27017
DB_NAME=honeypot
```

### Running the Server

```bash
# Production mode
npm start

# Development mode (with auto-reload)
npm run dev
```

Server will start on `http://localhost:3000`

### Testing

```bash
# Run test suite
npm test
```

## 📡 API Reference

### 1. Main Honeypot Endpoint

**POST** `/api/honeypot`

Engage with a scam message and get a natural response.

**Headers:**
```
Content-Type: application/json
x-api-key: your-api-key (if configured)
```

**Request Body:**
```json
{
  "sessionId": "uuid-v4-string",
  "message": {
    "sender": "scammer",
    "text": "URGENT: Your account has been compromised...",
    "timestamp": "2025-02-16T00:00:00Z"
  },
  "conversationHistory": [
    {
      "sender": "scammer",
      "text": "Previous message...",
      "timestamp": "2025-02-16T00:00:00Z"
    }
  ],
  "metadata": {
    "channel": "SMS",
    "language": "English",
    "locale": "IN"
  }
}
```

**Response:**
```json
{
  "status": "success",
  "reply": "I'm concerned about my account. Can you provide your employee ID?"
}
```

### 2. Submit Final Output

**POST** `/api/submit-final-output`

Generate comprehensive analysis after conversation ends.

**Request Body:**
```json
{
  "sessionId": "uuid-v4-string"
}
```

**Response:**
```json
{
  "sessionId": "uuid-v4-string",
  "scamDetected": true,
  "totalMessagesExchanged": 18,
  "scamType": "bank_fraud",
  "extractedIntelligence": {
    "phoneNumbers": ["+91-9876543210"],
    "upiIds": ["scammer@fakebank"],
    "bankAccounts": ["1234567890123456"],
    "phishingLinks": ["http://fake-bank.com"],
    "emailAddresses": ["scammer@fake.com"],
    "employeeIds": ["SBI12345"],
    "ifscCodes": ["SBIN0001234"],
    "amounts": ["₹50000", "₹5000"],
    "trackingIds": [],
    "challanNumbers": [],
    "consumerNumbers": [],
    "vehicleNumbers": [],
    "merchantNames": [],
    "orgNames": ["State Bank of India"],
    "departmentNames": ["Fraud Department"],
    "supervisorNames": ["Kumar"],
    "transactionIds": ["TXN123456"]
  },
  "engagementMetrics": {
    "totalMessagesExchanged": 18,
    "engagementDurationSeconds": 245
  },
  "agentNotes": "Bank fraud scam detected. Scammer posed as SBI employee with fake ID SBI12345..."
}
```

### 3. Get Session Details

**GET** `/api/session/:sessionId`

Retrieve session information.

**Response:**
```json
{
  "status": "success",
  "session": {
    "sessionId": "uuid-v4-string",
    "conversationHistory": [...],
    "extractedIntelligence": {...},
    "scamType": "bank_fraud",
    "startTime": "2025-02-16T00:00:00Z",
    "lastActivity": "2025-02-16T00:05:00Z"
  }
}
```

### 4. List All Sessions

**GET** `/api/sessions`

Get all active sessions.

### 5. Health Check

**GET** `/health`

Check server status.

## 🎭 Supported Scam Types

The system automatically detects and adapts to:

| Scam Type | Persona | Priority Extractions |
|-----------|---------|---------------------|
| **Lottery/Prize** | Excited but naive | Prize amount, UPI ID, processing fees |
| **Bank Fraud** | Panicked and confused | Account numbers, OTPs, employee IDs |
| **UPI Fraud** | Concerned and practical | UPI IDs, transaction IDs, merchant names |
| **Fake Delivery** | Confused and curious | Tracking IDs, delivery fees, phone numbers |
| **Electricity Bill** | Worried and obedient | Consumer numbers, bill amounts, payment links |
| **Traffic Challan** | Nervous and compliant | Challan numbers, vehicle numbers, fines |
| **KYC Update** | Cautious and questioning | Phishing links, employee IDs |
| **Investment Scam** | Interested but skeptical | Platform names, referral links, amounts |

## 🧠 How It Works

### 1. Scam Detection
```javascript
// Analyzes message content and patterns
const scamType = detectScamType(message, conversationHistory);
// Result: 'lottery_prize', 'bank_fraud', 'upi_fraud', etc.
```

### 2. Persona Selection
```javascript
// Selects appropriate victim persona
const persona = scamPatterns[scamType].persona;
// Result: 'excited_naive', 'panicked_confused', etc.
```

### 3. Response Generation
```javascript
// Uses LLM to generate natural, contextual response
const response = await generateResponse(message, history, scamType, turnNumber);
// Result: "₹25 lakh?! Oh my god! How did I win? Which lottery?"
```

### 4. Intelligence Extraction
```javascript
// Extracts all valuable data using regex patterns
const intelligence = extractIntelligence(message, history);
// Result: { phoneNumbers: [...], upiIds: [...], ... }
```

## 🔒 Security Features

- **Helmet.js**: Security headers
- **Rate Limiting**: 100 requests per minute per IP
- **API Key Authentication**: Optional but recommended
- **Input Validation**: Validates all incoming requests
- **Error Handling**: Graceful error responses
- **CORS**: Configurable cross-origin requests

## 📊 Monitoring & Logging

All interactions are logged to MongoDB:

```javascript
{
  sessionId: "uuid",
  timestamp: "2025-02-16T00:00:00Z",
  type: "message_exchange",
  scammerMessage: "...",
  honeypotResponse: "...",
  turnNumber: 3,
  scamType: "bank_fraud",
  newIntelligence: {...}
}
```

## 🚢 Deployment

### Deploy to Render

```bash
# Deploy the web service
# Set environment variables in Render dashboard:
# - GEMINI_API_KEY
# - MONGODB_URI (use MongoDB Atlas)
# - API_KEY
```

### Deploy to Heroku

```bash
heroku create your-honeypot-api
heroku config:set GEMINI_API_KEY=your-key
heroku config:set MONGODB_URI=your-mongodb-uri
git push heroku main
```

### Deploy with Docker

```bash
docker build -t honeypot-api .
docker run -p 3000:3000 \
  -e GEMINI_API_KEY=your-key \
  -e MONGODB_URI=your-mongodb-uri \
  honeypot-api
```

## 🧪 Testing

Run the included test suite:

```bash
# Test against local server
npm test

# Test against deployed server
ENDPOINT_URL=https://your-api.com/api/honeypot npm test
```

## 📈 Performance

- **Response Time**: < 2 seconds average
- **Concurrent Sessions**: Supports 100+ simultaneous conversations
- **Database**: MongoDB with indexed queries for fast lookups
- **LLM**: Gemini 2.0 Flash (fast, efficient, high-quality)

## 🤝 Contributing

Contributions welcome! Areas for improvement:

- [ ] Add more scam type patterns
- [ ] Improve persona responses
- [ ] Add multi-language support
- [ ] Implement voice call integration
- [ ] Add web dashboard for monitoring

## 📄 License

MIT License - see LICENSE file

## 🙏 Acknowledgments

- Google Gemini for AI capabilities
- MongoDB for database
- Express.js for server framework

## 📞 Support

For issues or questions:
- GitHub Issues: [Create an issue](https://github.com/SushrithKbtech/guvi2/issues)
- Email: support@example.com

---

Built with ❤️ for the GUVI Hackathon | Making the internet safer, one scam at a time 🎯
