const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const AdaptiveHoneypotAgent = require('./honeypotAgent');

// ============================================================================
// CONFIGURATION
// ============================================================================
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'honeypot';
const API_KEY = process.env.API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
    console.error('❌ ERROR: OPENAI_API_KEY is required in environment variables');
    process.exit(1);
}

// ============================================================================
// EXPRESS APP SETUP
// ============================================================================
const app = express();

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rate limiting - prevent abuse
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Request logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// ============================================================================
// MONGODB CONNECTION
// ============================================================================
let db;
let sessionsCollection;
let logsCollection;

async function connectToDatabase() {
    try {
        const client = await MongoClient.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        db = client.db(DB_NAME);
        sessionsCollection = db.collection('sessions');
        logsCollection = db.collection('honeyPotTestingSessionLog');

        // Create indexes for better performance
        await sessionsCollection.createIndex({ sessionId: 1 }, { unique: true });
        await logsCollection.createIndex({ sessionId: 1 });
        await logsCollection.createIndex({ timestamp: -1 });

        console.log('✅ Connected to MongoDB');
        return true;
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        console.log('⚠️  Running without database - session data will not be persisted');
        return false;
    }
}

// ============================================================================
// INITIALIZE HONEYPOT AGENT
// ============================================================================
const honeypotAgent = new AdaptiveHoneypotAgent(OPENAI_API_KEY);
console.log('✅ Adaptive Honeypot Agent initialized');

// ============================================================================
// API KEY AUTHENTICATION MIDDLEWARE
// ============================================================================
function authenticateApiKey(req, res, next) {
    // Skip auth if no API_KEY is configured
    if (!API_KEY) {
        return next();
    }

    const providedKey = req.headers['x-api-key'];

    if (!providedKey || providedKey !== API_KEY) {
        return res.status(401).json({
            status: 'error',
            message: 'Unauthorized - Invalid or missing API key'
        });
    }

    next();
}

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================
const activeSessions = new Map(); // In-memory session store

async function getSession(sessionId) {
    // Try in-memory first
    if (activeSessions.has(sessionId)) {
        return activeSessions.get(sessionId);
    }

    // Try database if available
    if (sessionsCollection) {
        try {
            const session = await sessionsCollection.findOne({ sessionId });
            if (session) {
                activeSessions.set(sessionId, session);
                return session;
            }
        } catch (error) {
            console.error('Error fetching session from DB:', error);
        }
    }

    // Create new session
    const newSession = {
        sessionId,
        conversationHistory: [],
        extractedIntelligence: {},
        scamType: null,
        startTime: new Date().toISOString(),
        lastActivity: new Date().toISOString()
    };

    activeSessions.set(sessionId, newSession);

    if (sessionsCollection) {
        try {
            await sessionsCollection.insertOne(newSession);
        } catch (error) {
            console.error('Error saving session to DB:', error);
        }
    }

    return newSession;
}

async function updateSession(sessionId, updates) {
    const session = activeSessions.get(sessionId);
    if (session) {
        Object.assign(session, updates, {
            lastActivity: new Date().toISOString()
        });

        activeSessions.set(sessionId, session);

        if (sessionsCollection) {
            try {
                await sessionsCollection.updateOne(
                    { sessionId },
                    { $set: updates }
                );
            } catch (error) {
                console.error('Error updating session in DB:', error);
            }
        }
    }
}

async function logToDatabase(sessionId, logData) {
    if (logsCollection) {
        try {
            await logsCollection.insertOne({
                sessionId,
                timestamp: new Date().toISOString(),
                ...logData
            });
        } catch (error) {
            console.error('Error logging to database:', error);
        }
    }
}

// ============================================================================
// MAIN HONEYPOT ENDPOINT
// ============================================================================
app.post('/api/honeypot', authenticateApiKey, async (req, res) => {
    const startTime = Date.now();

    try {
        const { sessionId, message, conversationHistory = [], metadata = {} } = req.body;

        // Validation
        if (!sessionId) {
            return res.status(400).json({
                status: 'error',
                message: 'sessionId is required'
            });
        }

        if (!message || !message.text) {
            return res.status(400).json({
                status: 'error',
                message: 'message.text is required'
            });
        }

        console.log(`\n📩 Session ${sessionId} | Turn ${Math.floor(conversationHistory.length / 2) + 1}`);
        console.log(`   Scammer: ${message.text.substring(0, 100)}...`);

        // Get or create session
        const session = await getSession(sessionId);

        // Build conversation history (combine stored + provided)
        const fullHistory = [
            ...session.conversationHistory,
            ...conversationHistory
        ];

        // Add current scammer message to history
        const scammerMessage = {
            sender: 'scammer',
            text: message.text,
            timestamp: message.timestamp || new Date().toISOString()
        };
        fullHistory.push(scammerMessage);

        // Generate honeypot response
        const result = await honeypotAgent.handleMessage(
            sessionId,
            message.text,
            fullHistory,
            metadata
        );

        // Add honeypot response to history
        const honeypotMessage = {
            sender: 'user',
            text: result.reply,
            timestamp: new Date().toISOString()
        };
        fullHistory.push(honeypotMessage);

        // Merge extracted intelligence
        const mergedIntelligence = honeypotAgent.mergeIntelligence(
            session.extractedIntelligence || {},
            result.metadata.extractedIntelligence || {}
        );

        // Update session
        await updateSession(sessionId, {
            conversationHistory: fullHistory,
            extractedIntelligence: mergedIntelligence,
            scamType: result.metadata.scamType,
            turnNumber: result.metadata.turnNumber
        });

        // Log interaction
        await logToDatabase(sessionId, {
            type: 'message_exchange',
            scammerMessage: message.text,
            honeypotResponse: result.reply,
            turnNumber: result.metadata.turnNumber,
            scamType: result.metadata.scamType,
            newIntelligence: result.metadata.extractedIntelligence
        });

        const responseTime = Date.now() - startTime;
        console.log(`   Honeypot: ${result.reply}`);
        console.log(`   ⏱️  Response time: ${responseTime}ms | Scam: ${result.metadata.scamType}`);

        // Return response
        res.json({
            status: 'success',
            reply: result.reply
        });

    } catch (error) {
        console.error('❌ Error processing request:', error);

        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// ============================================================================
// ALTERNATE ENDPOINT (FOR COMPATIBILITY)
// ============================================================================
app.post('/detect', authenticateApiKey, async (req, res) => {
    // Redirect to main endpoint
    req.url = '/api/honeypot';
    return app.handle(req, res);
});

// ============================================================================
// FINAL OUTPUT SUBMISSION ENDPOINT
// ============================================================================
app.post('/api/submit-final-output', authenticateApiKey, async (req, res) => {
    try {
        const { sessionId } = req.body;

        if (!sessionId) {
            return res.status(400).json({
                status: 'error',
                message: 'sessionId is required'
            });
        }

        console.log(`\n📊 Generating final output for session ${sessionId}`);

        const session = await getSession(sessionId);

        if (!session || !session.conversationHistory || session.conversationHistory.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Session not found or has no conversation history'
            });
        }

        // Generate comprehensive final output
        const finalOutput = await honeypotAgent.generateFinalOutput(
            sessionId,
            session.conversationHistory
        );

        // Log final output to database
        await logToDatabase(sessionId, {
            type: 'final_output',
            ...finalOutput
        });

        console.log(`✅ Final output generated:`);
        console.log(`   Scam Type: ${finalOutput.scamType}`);
        console.log(`   Messages: ${finalOutput.totalMessagesExchanged}`);
        console.log(`   Duration: ${finalOutput.engagementMetrics.engagementDurationSeconds}s`);
        console.log(`   Intelligence: ${JSON.stringify(finalOutput.extractedIntelligence).substring(0, 200)}...`);

        res.json(finalOutput);

    } catch (error) {
        console.error('❌ Error generating final output:', error);

        res.status(500).json({
            status: 'error',
            message: 'Error generating final output',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// ============================================================================
// SESSION MANAGEMENT ENDPOINTS
// ============================================================================

// Get session details
app.get('/api/session/:sessionId', authenticateApiKey, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = await getSession(sessionId);

        if (!session) {
            return res.status(404).json({
                status: 'error',
                message: 'Session not found'
            });
        }

        res.json({
            status: 'success',
            session
        });

    } catch (error) {
        console.error('Error fetching session:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error fetching session'
        });
    }
});

// Get all sessions (for monitoring)
app.get('/api/sessions', authenticateApiKey, async (req, res) => {
    try {
        const sessions = Array.from(activeSessions.values());

        res.json({
            status: 'success',
            count: sessions.length,
            sessions: sessions.map(s => ({
                sessionId: s.sessionId,
                scamType: s.scamType,
                messageCount: s.conversationHistory.length,
                startTime: s.startTime,
                lastActivity: s.lastActivity
            }))
        });

    } catch (error) {
        console.error('Error fetching sessions:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error fetching sessions'
        });
    }
});

// ============================================================================
// HEALTH CHECK ENDPOINT
// ============================================================================
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        activeSessions: activeSessions.size,
        database: db ? 'connected' : 'disconnected'
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        service: 'Adaptive Honeypot API',
        version: '2.0.0',
        status: 'running',
        endpoints: {
            honeypot: 'POST /api/honeypot',
            detect: 'POST /detect (alias)',
            finalOutput: 'POST /api/submit-final-output',
            session: 'GET /api/session/:sessionId',
            sessions: 'GET /api/sessions',
            health: 'GET /health'
        }
    });
});

// ============================================================================
// ERROR HANDLERS
// ============================================================================

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        status: 'error',
        message: 'Endpoint not found'
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);

    res.status(500).json({
        status: 'error',
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// ============================================================================
// START SERVER
// ============================================================================
async function startServer() {
    try {
        // Connect to database
        await connectToDatabase();

        // Start HTTP server
        app.listen(PORT, () => {
            console.log('\n' + '='.repeat(60));
            console.log('🚀 ADAPTIVE HONEYPOT API SERVER');
            console.log('='.repeat(60));
            console.log(`📡 Server running on port ${PORT}`);
            console.log(`🔗 Endpoint: http://localhost:${PORT}/api/honeypot`);
            console.log(`🔒 API Key: ${API_KEY ? 'Required' : 'Not required'}`);
            console.log(`💾 Database: ${db ? 'Connected' : 'Disconnected (using in-memory only)'}`);
            console.log(`🤖 AI Model: GPT-4o-mini (OpenAI)`);
            console.log('='.repeat(60) + '\n');
            console.log('Ready to engage scammers! 🎯\n');
        });

    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\nSIGINT received. Shutting down gracefully...');
    process.exit(0);
});

// Start the server
startServer();

module.exports = app;
