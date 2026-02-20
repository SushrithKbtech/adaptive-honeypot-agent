# Honeypot API

## Description
Adaptive honeypot agent that detects scam patterns, keeps the scammer engaged, and extracts actionable intelligence. This repo provides a Node.js API implementation.

## Tech Stack
- **Language/Framework:** Node.js (Express.js)
- **Key Libraries:** OpenAI SDK, Express, Axios
- **LLM/AI Models:** GPT-4.1-mini

## Setup Instructions
1. Clone the repository
2. Install dependencies
3. Set environment variables
4. Run the application

### Node.js
1. `npm install`
2. Create `.env` from `.env.example`
3. `npm start`

## API Endpoint
- **URL:** `https://finalguvi-production.up.railway.app/api/conversation`
- **Method:** `POST`
- **Authentication:** `x-api-key` header

Example request body:
```json
{
  "sessionId": "unique-session-id",
  "message": {
    "text": "Your account is blocked. Click here to update KYC."
  }
}
```

## Approach
- **How you detect scams:** Keyword and pattern matching across common scam categories, with confidence scoring.
- **How you extract intelligence:** Regex extraction for UPI IDs, phone numbers, and banking markers, and targeted follow-up questions.
- **How you maintain engagement:** Bridge Logic (react first, ask next) and reciprocity traps that keep the scammer talking without revealing sensitive data.
