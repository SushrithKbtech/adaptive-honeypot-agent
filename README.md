# Honeypot API

## Description
Adaptive honeypot agent that detects scam patterns, keeps the scammer engaged, and extracts actionable intelligence. The repo includes a Node.js API and a lightweight Python reference API for environments that prefer FastAPI.

## Tech Stack
- **Language/Framework:** Node.js (Express.js), Python (FastAPI)
- **Key Libraries:** OpenAI SDK (Node), FastAPI, Pydantic
- **LLM/AI Models:** GPT-4o-mini (Node implementation)

## Setup Instructions
1. Clone the repository
2. Install dependencies
3. Set environment variables
4. Run the application

### Node.js
1. `npm install`
2. Create `.env` from `.env.example`
3. `npm start`

### Python (reference API)
1. `python -m venv .venv`
2. `.venv\Scripts\activate`
3. `pip install -r requirements.txt`
4. `uvicorn src.main:app --host 0.0.0.0 --port 8000`

## API Endpoint
- **URL:** `https://your-deployed-url.com/honeypot`
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