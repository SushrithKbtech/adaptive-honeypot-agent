# API Documentation

## Base URL
- Local: `http://localhost:3000`
- Production: Your deployed endpoint URL

## Authentication
- Header: `x-api-key: <API_KEY>`
- Optional if `API_KEY` is not configured on server.

## 1) POST `/api/conversation`
Process one scammer turn and return the honeypot reply.

### Request Body
```json
{
  "sessionId": "test-session-123",
  "message": {
    "sender": "scammer",
    "text": "Your account will be blocked. Share OTP now.",
    "timestamp": "2026-02-20T09:00:00.000Z"
  },
  "conversationHistory": [],
  "metadata": {
    "channel": "sms",
    "language": "English",
    "locale": "IN"
  }
}
```

### Success Response
```json
{
  "status": "success",
  "reply": "Oh no, this is scary. Can you share your employee ID and callback number?"
}
```

### Error Responses
- `400` invalid payload (missing `sessionId` or `message.text`)
- `401` invalid/missing API key (when enabled)
- `500` internal server error

## 2) POST `/api/submit-final-output`
Get final structured output for a finished session.

### Request Body
```json
{
  "sessionId": "test-session-123"
}
```

### Success Response (shape)
```json
{
  "status": "success",
  "sessionId": "test-session-123",
  "scamDetected": true,
  "totalMessagesExchanged": 20,
  "engagementDurationSeconds": 120,
  "scamType": "bank_fraud",
  "confidenceLevel": 0.9,
  "redFlags": [],
  "redFlagsSummary": "",
  "extractedIntelligence": {
    "phoneNumbers": [],
    "bankAccounts": [],
    "upiIds": [],
    "phishingLinks": [],
    "emailAddresses": []
  },
  "agentNotes": "Summary of conversation and scam indicators"
}
```

## 3) GET `/health`
Health endpoint.

### Response
```json
{
  "status": "healthy",
  "timestamp": "2026-02-20T09:10:00.000Z",
  "uptime": 1234,
  "activeSessions": 1
}
```
