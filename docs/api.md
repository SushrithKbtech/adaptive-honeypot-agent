# API Documentation

## Base URL
- Local: `http://localhost:3000`
- Production: your deployed service URL

## Authentication
- Header: `x-api-key: <API_KEY>`
- If `API_KEY` is not configured on server, requests can be sent without this header.

## POST `/api/conversation`
Processes one scammer message and returns the honeypot reply.

### Request Body
```json
{
  "sessionId": "test-session-123",
  "message": {
    "sender": "scammer",
    "text": "Your account is blocked. Share OTP now.",
    "timestamp": "2026-02-20T10:00:00.000Z"
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
- `400`: missing/invalid request fields
- `401`: invalid or missing API key (when authentication is enabled)
- `500`: server-side failure

## POST `/api/submit-final-output`
Returns final structured output for an existing session.

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
    "emailAddresses": [],
    "caseIds": [],
    "policyNumbers": [],
    "orderIds": []
  },
  "agentNotes": "Summary of conversation and scam indicators."
}
```

## GET `/health`
Health check endpoint.

### Success Response
```json
{
  "status": "healthy",
  "timestamp": "2026-02-20T10:05:00.000Z",
  "uptime": 1234,
  "activeSessions": 1
}
```
