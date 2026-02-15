# 🚀 Quick Setup Guide

Follow these steps to get your Adaptive Honeypot API up and running.

## Step 1: Get Your Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key

## Step 2: Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and add your Gemini API key:
   ```env
   GEMINI_API_KEY=AIza...your-actual-key-here
   ```

3 (Optional) Add other configuration:
   ```env
   PORT=3000
   API_KEY=your-secret-key-123
   MONGODB_URI=mongodb://localhost:27017
   ```

## Step 3: Install Dependencies

```bash
npm install
```

## Step 4: Start the Server

```bash
# Production mode
npm start

# OR Development mode (auto-reload on changes)
npm run dev
```

You should see:
```
✅ Connected to MongoDB
✅ Adaptive Honeypot Agent initialized
🚀 ADAPTIVE HONEYPOT API SERVER
📡 Server running on port 3000
🔗 Endpoint: http://localhost:3000/api/honeypot
Ready to engage scammers! 🎯
```

## Step 5: Test Your API

Open a new terminal and run:

```bash
npm test
```

This will test your API with 5 different scam scenarios.

## Step 6: Test with cURL (Manual Test)

```bash
curl -X POST http://localhost:3000/api/honeypot \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-123",
    "message": {
      "sender": "scammer",
      "text": "URGENT: Your account has been compromised. Share your OTP immediately.",
      "timestamp": "2025-02-16T00:00:00Z"
    },
    "conversationHistory": [],
    "metadata": {
      "channel": "SMS",
      "language": "English",
      "locale": "IN"
    }
  }'
```

Expected response:
```json
{
  "status": "success",
  "reply": "I'm worried about my account. Can you tell me which bank you're calling from?"
}
```

## Common Issues

### Issue: "GEMINI_API_KEY is required"
**Solution**: Make sure you've created a `.env` file and added your Gemini API key.

### Issue: MongoDB connection failed
**Solution**: This is optional. The system will work without MongoDB (using in-memory storage). If you want MongoDB:
- Install MongoDB locally, OR
- Use MongoDB Atlas (cloud): Get free cluster at [mongodb.com](https://www.mongodb.com/cloud/atlas)

### Issue: Port 3000 already in use
**Solution**: Change the port in `.env`:
```env
PORT=3001
```

## Next Steps

### Deploy to Production

See README.md for deployment instructions for:
- Render
- Heroku  
- Docker
- Any cloud platform

### Monitor Your API

Access monitoring endpoints:

```bash
# Health check
curl http://localhost:3000/health

# List active sessions
curl http://localhost:3000/api/sessions

# Get specific session
curl http://localhost:3000/api/session/SESSION_ID_HERE
```

### Submit to Hackathon

When deploying for the hackathon:

1. **Deploy your API** to a cloud platform (Render, Heroku, etc.)
2. **Test your deployed URL** using the test suite
3. **Submit on the platform**:
   - Deployment URL: `https://your-api.render.com/api/honeypot`
   - API Key: (if you set one in .env)
   - GitHub URL: `https://github.com/SushrithKbtech/guvi2`

## Need Help?

- Check `README.md` for detailed documentation
- Review `test-honeypot.js` for API usage examples
- Check the console logs for debugging information

Good luck! 🎯
