const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const axios = require('axios');
require('dotenv').config();

const AdaptiveHoneypotAgent = require('./honeypotAgent');

// ============================================================================
// CONFIGURATION
// ============================================================================
const PORT = process.env.PORT || 3000;
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

// Rate limiting
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Request logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// ============================================================================
// INITIALIZE HONEYPOT AGENT
// ============================================================================
const honeypotAgent = new AdaptiveHoneypotAgent(OPENAI_API_KEY);
console.log('✅ Adaptive Honeypot Agent initialized');

// ============================================================================
// SESSION MANAGEMENT (IN-MEMORY)
// ============================================================================
const activeSessions = new Map();

function getOrCreateSession(sessionId) {
    if (!activeSessions.has(sessionId)) {
        activeSessions.set(sessionId, {
            sessionId,
            sessionStartMs: Date.now(),
            messages: [],
            extractedIntelligence: {
                phoneNumbers: [],
                bankAccounts: [],
                upiIds: [],
                phishingLinks: [],
                emailAddresses: [],
                trackingIds: [],
                challanNumbers: [],
                consumerNumbers: [],
                vehicleNumbers: [],
                employeeIds: [],
                ifscCodes: [],
                amounts: [],
                merchantNames: [],
                orgNames: [],
                departmentNames: [],
                supervisorNames: [],
                callbackNumbers: [],
                transactionIds: [],
                accountLast4: [],
                complaintIds: [],
                suspiciousKeywords: [],
                appNames: [],
                scammerNames: []
            },
            scamDetected: false,
            scamType: 'unknown',
            turnCount: 0
        });
    }
    return activeSessions.get(sessionId);
}

// ============================================================================
// HELPER: BUILD TURN-BASED HISTORY
// ============================================================================
function buildTurnHistory(conversationHistory) {
    const turns = [];

    for (let i = 0; i < conversationHistory.length; i += 2) {
        const scammerMsg = conversationHistory[i];
        const agentMsg = conversationHistory[i + 1];

        if (scammerMsg && scammerMsg.text && scammerMsg.text.trim()) {
            turns.push({
                scammer: scammerMsg.text,
                agent: agentMsg && agentMsg.text ? agentMsg.text : '',
                timestamp: scammerMsg.timestamp || new Date().toISOString()
            });
        }
    }

    // Return last 5 turns for context
    return turns.slice(-5);
}

// ============================================================================
// HELPER: MERGE INTELLIGENCE
// ============================================================================
function mergeIntelligence(existing, newData) {
    const merged = { ...existing };

    for (const [key, values] of Object.entries(newData)) {
        if (Array.isArray(values) && Array.isArray(merged[key])) {
            merged[key] = [...new Set([...merged[key], ...values])];
        }
    }

    // Mirror callbackNumbers into phoneNumbers for evaluator
    if (merged.callbackNumbers && merged.callbackNumbers.length > 0) {
        merged.phoneNumbers = [...new Set([...merged.phoneNumbers, ...merged.callbackNumbers])];
    }

    return merged;
}

// ============================================================================
// HELPER: POST-PROCESS REPLY (1-2 SENTENCES, ONE QUESTION)
// ============================================================================
function postProcessReply(reply) {
    if (!reply) return "Can you tell me more?";

    // Split into sentences
    let sentences = reply
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => s.length > 0);

    // Find sentences with questions
    const questionSentences = sentences.filter(s => s.includes('?') ||
        /\b(what|where|when|who|why|how|can you|could you|please tell|is there)\b/i.test(s));

    // Find non-question sentences
    const statementSentences = sentences.filter(s => !questionSentences.includes(s));

    // Build final reply: max 1 statement + 1 question
    let finalParts = [];

    if (statementSentences.length > 0) {
        finalParts.push(statementSentences[0]);
    }

    if (questionSentences.length > 0) {
        // Pick the most valuable question (prefer ones with specific info requests)
        const bestQuestion = questionSentences.find(q =>
            /\b(number|ID|name|address|email|phone|account|UPI|reference)\b/i.test(q)
        ) || questionSentences[0];

        finalParts.push(bestQuestion.includes('?') ? bestQuestion : bestQuestion + '?');
    } else if (finalParts.length === 0) {
        // No question found, create one
        finalParts.push("Can you please tell me more about this?");
    } else {
        // Add a generic question if only statement exists
        const genericQuestions = [
            "Can you verify this for me?",
            "How should I proceed?",
            "What do I need to do?"
        ];
        finalParts.push(genericQuestions[Math.floor(Math.random() * genericQuestions.length)]);
    }

    return finalParts.join(' ').trim();
}

// ============================================================================
// HELPER: NORMALIZE FINAL PAYLOAD
// ============================================================================
function normalizeFinalPayload(sessionData, agentResponse) {
    const now = Date.now();
    const durationSeconds = Math.round((now - sessionData.sessionStartMs) / 1000);

    return {
        status: 'success',
        sessionId: sessionData.sessionId,
        scamDetected: sessionData.scamDetected || true,
        scamType: sessionData.scamType || 'fraud',
        totalMessagesExchanged: sessionData.turnCount * 2,
        extractedIntelligence: {
            phoneNumbers: sessionData.extractedIntelligence.phoneNumbers || [],
            bankAccounts: sessionData.extractedIntelligence.bankAccounts || [],
            upiIds: sessionData.extractedIntelligence.upiIds || [],
            phishingLinks: sessionData.extractedIntelligence.phishingLinks || [],
            emailAddresses: sessionData.extractedIntelligence.emailAddresses || [],
            // Include other fields for completeness
            trackingIds: sessionData.extractedIntelligence.trackingIds || [],
            challanNumbers: sessionData.extractedIntelligence.challanNumbers || [],
            consumerNumbers: sessionData.extractedIntelligence.consumerNumbers || [],
            vehicleNumbers: sessionData.extractedIntelligence.vehicleNumbers || [],
            employeeIds: sessionData.extractedIntelligence.employeeIds || [],
            ifscCodes: sessionData.extractedIntelligence.ifscCodes || [],
            amounts: sessionData.extractedIntelligence.amounts || [],
            merchantNames: sessionData.extractedIntelligence.merchantNames || [],
            orgNames: sessionData.extractedIntelligence.orgNames || [],
            departmentNames: sessionData.extractedIntelligence.departmentNames || [],
            supervisorNames: sessionData.extractedIntelligence.supervisorNames || [],
            transactionIds: sessionData.extractedIntelligence.transactionIds || []
        },
        engagementMetrics: {
            totalMessagesExchanged: sessionData.turnCount * 2,
            engagementDurationSeconds: durationSeconds > 0 ? durationSeconds : 1
        },
        agentNotes: agentResponse?.agentNotes ||
            `${sessionData.scamType} scam detected. Engaged for ${sessionData.turnCount} turns. Extracted intelligence across multiple categories.`
    };
}

// ============================================================================
// HELPER: SEND CALLBACK
// ============================================================================
async function sendCallback(callbackUrl, payload, apiKey) {
    if (!callbackUrl) return;

    try {
        const headers = { 'Content-Type': 'application/json' };
        if (apiKey) {
            headers['x-api-key'] = apiKey;
        }

        await axios.post(callbackUrl, payload, { headers, timeout: 10000 });
        console.log(`✅ Callback sent to ${callbackUrl}`);
    } catch (error) {
        console.error(`❌ Callback failed: ${error.message}`);
    }
}

// ============================================================================
// API KEY AUTHENTICATION MIDDLEWARE
// ============================================================================
function authenticateApiKey(req, res, next) {
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
// MAIN CONVERSATION ENDPOINT
// ============================================================================
app.post('/api/conversation', authenticateApiKey, async (req, res) => {
    const startTime = Date.now();

    try {
        const {
            sessionId,
            message,
            conversationHistory = [],
            metadata = {},
            callbackUrl
        } = req.body;

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

        // Get or create session
        const session = getOrCreateSession(sessionId);
        session.turnCount++;

        console.log(`\n📩 Session ${sessionId} | Turn ${session.turnCount}`);
        console.log(`   Scammer: ${message.text.substring(0, 100)}...`);

        // Build turn-based history
        const recentTurns = buildTurnHistory(conversationHistory);

        // Convert to agent format
        const agentHistory = [];
        for (const turn of recentTurns) {
            agentHistory.push({ sender: 'scammer', text: turn.scammer, timestamp: turn.timestamp });
            if (turn.agent) {
                agentHistory.push({ sender: 'user', text: turn.agent, timestamp: turn.timestamp });
            }
        }

        // Add current scammer message
        agentHistory.push({
            sender: 'scammer',
            text: message.text,
            timestamp: message.timestamp || new Date().toISOString()
        });

        // Call honeypot agent
        const agentResponse = await honeypotAgent.handleMessage(
            sessionId,
            message.text,
            agentHistory,
            metadata
        );

        // Post-process reply to ensure 1-2 sentences with ONE question
        const processedReply = postProcessReply(agentResponse.reply);

        // Update session state
        session.messages.push({
            scammer: message.text,
            agent: processedReply,
            timestamp: new Date().toISOString()
        });

        // Merge intelligence
        if (agentResponse.metadata && agentResponse.metadata.extractedIntelligence) {
            session.extractedIntelligence = mergeIntelligence(
                session.extractedIntelligence,
                agentResponse.metadata.extractedIntelligence
            );
        }

        // Update scam detection
        session.scamDetected = true;
        if (agentResponse.metadata && agentResponse.metadata.scamType) {
            session.scamType = agentResponse.metadata.scamType;
        }

        // Calculate engagement metrics
        const durationSeconds = Math.round((Date.now() - session.sessionStartMs) / 1000);

        // Build response payload
        const responsePayload = {
            status: 'success',
            reply: processedReply,
            scamDetected: session.scamDetected,
            extractedIntelligence: {
                phoneNumbers: session.extractedIntelligence.phoneNumbers,
                bankAccounts: session.extractedIntelligence.bankAccounts,
                upiIds: session.extractedIntelligence.upiIds,
                phishingLinks: session.extractedIntelligence.phishingLinks,
                emailAddresses: session.extractedIntelligence.emailAddresses,
                // Additional fields
                trackingIds: session.extractedIntelligence.trackingIds,
                challanNumbers: session.extractedIntelligence.challanNumbers,
                consumerNumbers: session.extractedIntelligence.consumerNumbers,
                vehicleNumbers: session.extractedIntelligence.vehicleNumbers,
                employeeIds: session.extractedIntelligence.employeeIds,
                ifscCodes: session.extractedIntelligence.ifscCodes,
                amounts: session.extractedIntelligence.amounts,
                merchantNames: session.extractedIntelligence.merchantNames,
                orgNames: session.extractedIntelligence.orgNames,
                departmentNames: session.extractedIntelligence.departmentNames,
                supervisorNames: session.extractedIntelligence.supervisorNames,
                transactionIds: session.extractedIntelligence.transactionIds
            },
            engagementMetrics: {
                totalMessagesExchanged: session.turnCount * 2,
                engagementDurationSeconds: durationSeconds > 0 ? durationSeconds : 1
            },
            agentNotes: `${session.scamType} scam. Turn ${session.turnCount}. Engaging to extract maximum intelligence.`
        };

        // Check for termination (>=10 turns or agent signals termination)
        const shouldTerminate = session.turnCount >= 10;

        if (shouldTerminate) {
            console.log(`\n🏁 Session ${sessionId} terminating at turn ${session.turnCount}`);

            const finalPayload = normalizeFinalPayload(session, agentResponse);

            // Send callback if provided
            if (callbackUrl) {
                await sendCallback(callbackUrl, finalPayload, API_KEY);
            }

            // Add termination flag to response
            responsePayload.terminated = true;
            responsePayload.terminationReason = 'max_turns_reached';
        }

        const responseTime = Date.now() - startTime;
        console.log(`   Honeypot: ${processedReply}`);
        console.log(`   ⏱️  Response time: ${responseTime}ms | Scam: ${session.scamType}`);

        // Return response
        res.json(responsePayload);

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
// LEGACY ENDPOINTS (FOR COMPATIBILITY)
// ============================================================================

// Main honeypot endpoint (redirect to conversation)
app.post('/api/honeypot', authenticateApiKey, (req, res, next) => {
    req.url = '/api/conversation';
    app.handle(req, res);
});

// Detect endpoint (alias)
app.post('/detect', authenticateApiKey, (req, res, next) => {
    req.url = '/api/conversation';
    app.handle(req, res);
});

// ============================================================================
// FINAL OUTPUT ENDPOINT
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

        const session = activeSessions.get(sessionId);

        if (!session) {
            return res.status(404).json({
                status: 'error',
                message: 'Session not found'
            });
        }

        console.log(`\n📊 Generating final output for session ${sessionId}`);

        const finalPayload = normalizeFinalPayload(session, {});

        console.log(`✅ Final output generated:`);
        console.log(`   Scam Type: ${finalPayload.scamType}`);
        console.log(`   Messages: ${finalPayload.totalMessagesExchanged}`);
        console.log(`   Duration: ${finalPayload.engagementMetrics.engagementDurationSeconds}s`);

        res.json(finalPayload);

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
// SESSION ENDPOINTS
// ============================================================================

app.get('/api/session/:sessionId', authenticateApiKey, (req, res) => {
    const { sessionId } = req.params;
    const session = activeSessions.get(sessionId);

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
});

app.get('/api/sessions', authenticateApiKey, (req, res) => {
    const sessions = Array.from(activeSessions.values()).map(s => ({
        sessionId: s.sessionId,
        scamType: s.scamType,
        turnCount: s.turnCount,
        scamDetected: s.scamDetected
    }));

    res.json({
        status: 'success',
        count: sessions.length,
        sessions
    });
});

// ============================================================================
// HEALTH CHECK
// ============================================================================
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        activeSessions: activeSessions.size
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        service: 'Adaptive Honeypot API',
        version: '2.0.0',
        status: 'running',
        endpoints: {
            conversation: 'POST /api/conversation',
            honeypot: 'POST /api/honeypot (alias)',
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

app.use((req, res) => {
    res.status(404).json({
        status: 'error',
        message: 'Endpoint not found'
    });
});

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
        app.listen(PORT, () => {
            console.log('\n' + '='.repeat(60));
            console.log('🚀 ADAPTIVE HONEYPOT API SERVER');
            console.log('='.repeat(60));
            console.log(`📡 Server running on port ${PORT}`);
            console.log(`🔗 Endpoint: http://localhost:${PORT}/api/conversation`);
            console.log(`🔒 API Key: ${API_KEY ? 'Required' : 'Not required'}`);
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
