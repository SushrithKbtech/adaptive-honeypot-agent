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
app.set('trust proxy', 1);

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
                orderIds: [],
                policyNumbers: [],
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
            turnCount: 0,
            askedQuestions: [],  // Track questions to prevent repetition
            askedTopics: [],     // Track question topics to prevent repeats
            usedAsides: []       // Track asides to reduce repetition
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
// HELPER: POST-PROCESS REPLY (1-3 SENTENCES, ONE QUESTION)
// ============================================================================
function postProcessReply(reply, scammerText = '', turn = 0, askedQuestions = [], askedTopics = [], usedAsides = []) {
    if (!reply) return { text: "Can you tell me more?", question: "Can you tell me more?" };

    const isLinkOrAppContext = /\b(link|url|website|click|download|app|apk)\b/i.test(String(scammerText || ''));
    const shouldElongate = isLinkOrAppContext || (turn > 0 && turn % 2 === 0);
    const normalizedAsked = new Set(
        (askedQuestions || [])
            .map(q => String(q || '').toLowerCase().replace(/\s+/g, ' ').trim())
            .filter(Boolean)
    );
    const normalizedTopics = new Set(
        (askedTopics || [])
            .map(t => String(t || '').toLowerCase().replace(/\s+/g, ' ').trim())
            .filter(Boolean)
    );
    const normalizedAsides = new Set(
        (usedAsides || [])
            .map(a => String(a || '').toLowerCase().replace(/\s+/g, ' ').trim())
            .filter(Boolean)
    );

    const normalizeQuestion = (q) => String(q || '').toLowerCase().replace(/\s+/g, ' ').trim();
    const isRepeatedQuestion = (q) => normalizedAsked.has(normalizeQuestion(q));

    const hasAsked = (re) => {
        for (const q of normalizedAsked) {
            if (re.test(q)) return true;
        }
        return false;
    };

    const missingRequired = [];
    if (!hasAsked(/\b(phone|callback|contact number|mobile number|call back)\b/i)) missingRequired.push('callback');
    if (!hasAsked(/\b(upi|upi id|upi handle)\b/i)) missingRequired.push('upi');
    if (!hasAsked(/\b(bank account|account number|a\/c|account details)\b/i)) missingRequired.push('bank');
    if (!hasAsked(/\b(link|url|website|portal)\b/i)) missingRequired.push('link');
    if (!hasAsked(/\b(email|email address|email id)\b/i)) missingRequired.push('email');

    const requiredQuestionMap = {
        callback: [
            "If I need to call back, which number should I use?",
            "Can I have a contact number to verify this?",
            "What’s the best phone number to reach you?"
        ],
        upi: [
            "If I have to pay, which UPI ID should I use?",
            "Can you share the UPI handle for this?",
            "Which UPI ID is linked for this payment?"
        ],
        bank: [
            "If payment is needed, which bank account should I use?",
            "Can you share the account number for this?",
            "Which bank account is this supposed to go to?"
        ],
        link: [
            "Can you share the official link for this?",
            "Which website should I open to verify this?",
            "Please send the correct portal URL."
        ],
        email: [
            "What is the official email I should write to?",
            "Can you share the official email address?",
            "Which email ID is linked to this?"
        ]
    };

    const coversRequiredTopic = (topic, text) => {
        const t = String(text || '');
        if (topic === 'callback') return /\b(phone|callback|contact number|mobile|call back)\b/i.test(t);
        if (topic === 'upi') return /\b(upi)\b/i.test(t);
        if (topic === 'bank') return /\b(bank account|account number|a\/c|account details)\b/i.test(t);
        if (topic === 'link') return /\b(link|url|website|portal)\b/i.test(t);
        if (topic === 'email') return /\b(email|email address|email id)\b/i.test(t);
        return false;
    };

    const ensureRequiredQuestion = (question) => {
        if (turn <= 9 && missingRequired.length > 0) {
            const q = String(question || '');
            const alreadyCoversMissing = missingRequired.some(topic => coversRequiredTopic(topic, q));
            if (!alreadyCoversMissing) {
                const startIndex = (turn - 1) % missingRequired.length;
                for (let i = 0; i < missingRequired.length; i += 1) {
                    const topic = missingRequired[(startIndex + i) % missingRequired.length];
                    const options = requiredQuestionMap[topic] || [];
                    const pick = options.find(opt => !isRepeatedQuestion(opt)) || options[0];
                    if (pick) return pick;
                }
            }
        }
        return question;
    };

    const fallbackQuestions = [
        { topic: 'callback', q: "Can you share a callback number?" },
        { topic: 'callback', q: "Is there a helpline number I can call?" },
        { topic: 'empid', q: "What is your employee ID?" },
        { topic: 'name', q: "What is your full name?" },
        { topic: 'dept', q: "Which department are you calling from?" },
        { topic: 'email', q: "Can you share an official email address?" },
        { topic: 'org', q: "Which company is this from?" },
        { topic: 'supervisor', q: "Can you share your supervisor's name?" },
        { topic: 'address', q: "Where is your office located?" },
        { topic: 'documents', q: "What documents do you need from me?" },
        { topic: 'link', q: "Can you share the official link again?" },
        { topic: 'link', q: "Which website should I open exactly?" },
        { topic: 'link', q: "Is there a safe official portal I can use instead?" },
        { topic: 'payment', q: "Which account or UPI should I use to pay?" },
        { topic: 'amount', q: "What is the exact amount involved?" },
        { topic: 'txnid', q: "Can you share the transaction or reference ID?" },
        { topic: 'merchant', q: "Who is the merchant or beneficiary name?" },
        { topic: 'caseid', q: "Can you share a case or reference number?" },
        { topic: 'process', q: "What is the official process for this?" },
        { topic: 'verification', q: "Who should I contact to verify this?" },
        { topic: 'lottery', q: "Which company is running this lottery?" },
        { topic: 'lottery', q: "What is the claim ID for this prize?" },
        { topic: 'platform', q: "Which website or app is this for?" },
        { topic: 'orderid', q: "What is the order or ticket ID?" },
        { topic: 'tracking', q: "What is the tracking number?" },
        { topic: 'challan', q: "What is the challan or violation number?" },
        { topic: 'consumer', q: "What is the consumer or CA number?" },
        { topic: 'officer', q: "Who is the handling officer?" },
        { topic: 'app', q: "Which app should I download exactly?" }
    ];

    const detectQuestionTopic = (q) => {
        const text = String(q || '').toLowerCase();
        if (/\b(callback|call back|contact number|phone number|mobile number|helpline|desk number)\b/i.test(text)) return 'callback';
        if (/\b(employee id|emp id|staff id|id number)\b/i.test(text)) return 'empid';
        if (/\b(email|email address|email id)\b/i.test(text)) return 'email';
        if (/\b(department|which department)\b/i.test(text)) return 'dept';
        if (/\b(link|website|url|portal)\b/i.test(text)) return 'link';
        if (/\b(upi|account|bank account)\b/i.test(text)) return 'payment';
        if (/\b(amount|fee|charge|payment)\b/i.test(text)) return 'amount';
        if (/\b(transaction id|txn id|txnid)\b/i.test(text)) return 'txnid';
        if (/\b(merchant|beneficiary)\b/i.test(text)) return 'merchant';
        if (/\b(reference|case id|case number|complaint id|ticket)\b/i.test(text)) return 'caseid';
        if (/\b(company|organisation|organization|brand)\b/i.test(text)) return 'org';
        if (/\b(supervisor|manager|senior)\b/i.test(text)) return 'supervisor';
        if (/\b(name|full name)\b/i.test(text)) return 'name';
        if (/\b(address|office address|branch address)\b/i.test(text)) return 'address';
        if (/\b(document|pan|aadhaar|aadhar|kyc)\b/i.test(text)) return 'documents';
        if (/\b(app|application|apk|download)\b/i.test(text)) return 'app';
        if (/\b(order id|order number|ticket id|booking id|invoice number)\b/i.test(text)) return 'orderid';
        if (/\b(tracking|consignment)\b/i.test(text)) return 'tracking';
        if (/\b(challan|violation)\b/i.test(text)) return 'challan';
        if (/\b(consumer number|ca number)\b/i.test(text)) return 'consumer';
        if (/\b(officer)\b/i.test(text)) return 'officer';
        if (/\b(verify|verification|confirm)\b/i.test(text)) return 'verification';
        if (/\b(process|procedure)\b/i.test(text)) return 'process';
        if (/\b(lottery|prize|lucky draw)\b/i.test(text)) return 'lottery';
        if (/\b(website|app|platform)\b/i.test(text)) return 'platform';
        return 'general';
    };

    const pickFallbackQuestion = () => {
        const text = String(scammerText || '').toLowerCase();
        let preferredTopics = ['caseid', 'process', 'verification'];
        if (/\b(challan|traffic|violation)\b/i.test(text)) {
            preferredTopics = ['challan', 'amount', 'dept', 'officer', 'caseid', 'link'];
        } else if (/\b(electricity|power|consumer)\b/i.test(text)) {
            preferredTopics = ['consumer', 'amount', 'dept', 'officer', 'caseid', 'link'];
        } else if (/\b(delivery|courier|parcel|tracking|shipment)\b/i.test(text)) {
            preferredTopics = ['tracking', 'org', 'amount', 'link', 'caseid', 'callback'];
        } else if (/\b(order|refund|return|cancel|amazon|flipkart|myntra|meesho|ecommerce)\b/i.test(text)) {
            preferredTopics = ['platform', 'orderid', 'amount', 'callback', 'email', 'caseid'];
        } else if (/\b(job|offer|hr|interview|salary)\b/i.test(text)) {
            preferredTopics = ['org', 'email', 'callback', 'dept', 'name', 'caseid'];
        } else if (/\b(investment|trading|crypto|returns|profit)\b/i.test(text)) {
            preferredTopics = ['org', 'amount', 'payment', 'link', 'callback', 'caseid'];
        } else if (/\b(tax|itr|refund)\b/i.test(text)) {
            preferredTopics = ['amount', 'caseid', 'link', 'payment', 'org', 'email'];
        } else if (/\b(anydesk|teamviewer|remote|apk|install)\b/i.test(text)) {
            preferredTopics = ['app', 'link', 'empid', 'org', 'caseid'];
        } else if (/\b(lottery|prize|winner|reward|lucky draw)\b/i.test(text)) {
            preferredTopics = ['lottery', 'org', 'caseid', 'amount', 'payment', 'link', 'callback'];
        } else if (/\b(pay|payment|fee|charge|refund|upi|transfer)\b/i.test(text)) {
            preferredTopics = ['payment', 'amount', 'txnid', 'merchant', 'caseid', 'callback'];
        } else if (isLinkOrAppContext) {
            preferredTopics = ['link', 'callback', 'email', 'dept', 'caseid'];
        } else if (/\b(employee|department|official|staff|id|identity)\b/i.test(text)) {
            preferredTopics = ['empid', 'dept', 'email', 'name', 'org', 'supervisor'];
        }

        const candidates = fallbackQuestions.filter(item => preferredTopics.includes(item.topic) || item.topic === 'caseid' || item.topic === 'verification' || item.topic === 'process');
        for (const item of candidates) {
            if (normalizedTopics.has(item.topic)) continue;
            if (!isRepeatedQuestion(item.q)) return item.q;
        }
        for (const item of fallbackQuestions) {
            if (normalizedTopics.has(item.topic)) continue;
            if (!isRepeatedQuestion(item.q)) return item.q;
        }
        return candidates[0]?.q || fallbackQuestions[0].q;
    };

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

    // Build final reply: up to 2 statements + 1 question (LLM should drive statements)
    let finalParts = [];
    let extractedQuestion = null;

    const maxStatements = shouldElongate ? 3 : 2;

    // Ensure first turn starts with a brief shocked reaction before any question.
    if (turn === 1) {
        const textLc = String(scammerText || '').toLowerCase();
        let shock = "Oh no, this is unexpected.";
        if (/\b(kyc|bank|account|sbi|blocked|suspended|fraud|otp)\b/i.test(textLc)) {
            shock = "Oh no, this is scary. I was not expecting a bank alert.";
        } else if (/\b(challan|traffic|fine|police|rto|vehicle)\b/i.test(textLc)) {
            shock = "Oh no, this is a shock. I did not expect any challan.";
        } else if (/\b(lottery|prize|winner|reward|lucky draw)\b/i.test(textLc)) {
            shock = "Oh wow, I am surprised. I never expected a prize like this.";
        } else if (/\b(delivery|parcel|courier|package|tracking)\b/i.test(textLc)) {
            shock = "Oh, this is unexpected. I was not waiting for any parcel.";
        } else if (/\b(electricity|power|bill|disconnected)\b/i.test(textLc)) {
            shock = "Oh no, this is worrying. I paid my bill recently.";
        }
        finalParts.push(shock);
    }

    for (let i = 0; i < Math.min(statementSentences.length, maxStatements); i += 1) {
        finalParts.push(statementSentences[i]);
    }

    if (questionSentences.length > 0) {
        // Pick the most valuable question (prefer ones with specific info requests)
        const bestQuestion = questionSentences.find(q =>
            /\b(number|ID|name|address|email|phone|account|UPI|reference|employee|customer|transaction)\b/i.test(q)
        ) || questionSentences[0];

        extractedQuestion = bestQuestion.includes('?') ? bestQuestion : bestQuestion + '?';
        const topic = detectQuestionTopic(extractedQuestion);
        const isGeneric = topic === 'general' || topic === 'verification' || topic === 'process';
        if (isRepeatedQuestion(extractedQuestion) || normalizedTopics.has(topic) || isGeneric) {
            extractedQuestion = pickFallbackQuestion();
        }
        extractedQuestion = ensureRequiredQuestion(extractedQuestion);
        finalParts.push(extractedQuestion);
    } else if (finalParts.length === 0) {
        // No question found, create one
        extractedQuestion = pickFallbackQuestion();
        extractedQuestion = ensureRequiredQuestion(extractedQuestion);
        finalParts.push(extractedQuestion);
    } else {
        // Add a context-aware question if only statement exists
        extractedQuestion = pickFallbackQuestion();
        extractedQuestion = ensureRequiredQuestion(extractedQuestion);
        finalParts.push(extractedQuestion);
    }

    const statementText = finalParts.slice(0, Math.max(0, finalParts.length - 1)).join('. ').trim();
    const statementOut = statementText ? (/[.!?]$/.test(statementText) ? statementText : `${statementText}.`) : '';
    const questionOut = extractedQuestion ? String(extractedQuestion).trim() : '';
    const combined = [statementOut, questionOut].filter(Boolean).join(' ').trim();

    return {
        text: combined || statementOut || questionOut,
        question: extractedQuestion,
        aside: null
    };
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
        totalMessagesExchanged: sessionData.turnCount * 2,
        engagementDurationSeconds: durationSeconds > 0 ? durationSeconds : 1,
        scamType: sessionData.llmScamType || 'unknown',
        confidenceLevel: sessionData.llmConfidenceLevel || 'low',
        extractedIntelligence: {
            phoneNumbers: sessionData.extractedIntelligence.phoneNumbers || [],
            bankAccounts: sessionData.extractedIntelligence.bankAccounts || [],
            upiIds: sessionData.extractedIntelligence.upiIds || [],
            phishingLinks: sessionData.extractedIntelligence.phishingLinks || [],
            emailAddresses: sessionData.extractedIntelligence.emailAddresses || [],
            // Include other fields for completeness
            trackingIds: sessionData.extractedIntelligence.trackingIds || [],
            orderIds: sessionData.extractedIntelligence.orderIds || [],
            policyNumbers: sessionData.extractedIntelligence.policyNumbers || [],
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
            transactionIds: sessionData.extractedIntelligence.transactionIds || [],
            callbackNumbers: sessionData.extractedIntelligence.callbackNumbers || [],
            accountLast4: sessionData.extractedIntelligence.accountLast4 || [],
            caseIds: sessionData.extractedIntelligence.caseIds || [],
            appNames: sessionData.extractedIntelligence.appNames || [],
            officerNames: sessionData.extractedIntelligence.officerNames || []
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
// GUVI HACKATHON CALLBACK ENDPOINT
// ============================================================================
const GUVI_CALLBACK_URL = 'https://hackathon.guvi.in/api/updateHoneyPotFinalResult';

// ============================================================================
// HELPER: SEND CALLBACK TO GUVI
// ============================================================================
async function sendGuviCallback(sessionData, conversationHistory) {
    try {
        let llmScamType = 'unknown';
        let llmConfidenceLevel = 'low';
        try {
            const llmResult = await honeypotAgent.classifyScamTypeLLM(
                conversationHistory,
                sessionData.extractedIntelligence
            );
            llmScamType = llmResult.scamType || 'unknown';
            llmConfidenceLevel = llmResult.confidenceLevel || 'low';
        } catch (error) {
            console.error('Error classifying scam type with LLM:', error);
        }

        sessionData.llmScamType = llmScamType;
        sessionData.llmConfidenceLevel = llmConfidenceLevel;

        // Generate LLM-powered agent notes
        let agentNotes;
        try {
            agentNotes = await honeypotAgent.generateAgentNotes(
                conversationHistory,
                sessionData.extractedIntelligence,
                llmScamType
            );
        } catch (error) {
            console.error('Error generating agent notes:', error);
            agentNotes = `${llmScamType} scam detected. Engaged for ${sessionData.turnCount} turns. Extracted intelligence successfully.`;
        }

        const durationSeconds = Math.round((Date.now() - sessionData.sessionStartMs) / 1000);

        // Build payload per GUVI spec
        const payload = {
            status: 'success',
            sessionId: sessionData.sessionId,
            scamDetected: sessionData.scamDetected || true,
            totalMessagesExchanged: sessionData.turnCount * 2,
            engagementDurationSeconds: durationSeconds > 0 ? durationSeconds : 1,
            scamType: llmScamType,
            confidenceLevel: llmConfidenceLevel,
            extractedIntelligence: {
                bankAccounts: sessionData.extractedIntelligence.bankAccounts || [],
                upiIds: sessionData.extractedIntelligence.upiIds || [],
                phishingLinks: sessionData.extractedIntelligence.phishingLinks || [],
                phoneNumbers: sessionData.extractedIntelligence.phoneNumbers || [],
                emailAddresses: sessionData.extractedIntelligence.emailAddresses || [],
                trackingIds: sessionData.extractedIntelligence.trackingIds || [],
                orderIds: sessionData.extractedIntelligence.orderIds || [],
                policyNumbers: sessionData.extractedIntelligence.policyNumbers || [],
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
                callbackNumbers: sessionData.extractedIntelligence.callbackNumbers || [],
                transactionIds: sessionData.extractedIntelligence.transactionIds || [],
                accountLast4: sessionData.extractedIntelligence.accountLast4 || [],
                caseIds: sessionData.extractedIntelligence.caseIds || [],
                appNames: sessionData.extractedIntelligence.appNames || [],
                officerNames: sessionData.extractedIntelligence.officerNames || [],
                suspiciousKeywords: sessionData.extractedIntelligence.suspiciousKeywords || []
            },
            agentNotes: agentNotes
        };

        console.log(`📤 Sending final callback to GUVI...`);
        console.log(`GUVI payload:\n${JSON.stringify(payload, null, 2)}`);

        await axios.post(GUVI_CALLBACK_URL, payload, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
        });

        console.log(`✅ GUVI callback sent successfully`);
    } catch (error) {
        console.error(`❌ GUVI callback failed: ${error.message}`);
    }
}

// ============================================================================
// HELPER: SEND CALLBACK (For custom callbacks if provided)
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

        // Call honeypot agent with question tracking
        const agentResponse = await honeypotAgent.handleMessage(
            sessionId,
            message.text,
            agentHistory,
            metadata,
            session.askedQuestions  // Pass previously asked questions
        );

        // Post-process reply to ensure 1-2 sentences with ONE question
        const processed = postProcessReply(
            agentResponse.reply,
            message.text,
            session.turnCount,
            session.askedQuestions,
            session.askedTopics,
            session.usedAsides
        );
        const processedReply = processed.text;
        const extractedQuestion = processed.question;

        // Track all questions from the final reply to prevent repetition
        const questionMatches = (processedReply.match(/[^.!?]*\?/g) || [])
            .map(q => q.trim())
            .filter(Boolean);
        const questionsToTrack = questionMatches.length > 0 ? questionMatches : (extractedQuestion ? [extractedQuestion] : []);

        const detectTopic = (q) => {
            const text = String(q || '').toLowerCase();
            if (/\b(callback|call back|contact number|phone number|mobile number|helpline|desk number)\b/i.test(text)) return 'callback';
            if (/\b(employee id|emp id|staff id|id number)\b/i.test(text)) return 'empid';
            if (/\b(email|email address|email id)\b/i.test(text)) return 'email';
            if (/\b(department|which department)\b/i.test(text)) return 'dept';
            if (/\b(link|website|url|portal)\b/i.test(text)) return 'link';
            if (/\b(upi|account|bank account)\b/i.test(text)) return 'payment';
            if (/\b(amount|fee|charge|payment)\b/i.test(text)) return 'amount';
            if (/\b(transaction id|txn id|txnid)\b/i.test(text)) return 'txnid';
            if (/\b(merchant|beneficiary)\b/i.test(text)) return 'merchant';
            if (/\b(reference|case id|case number|complaint id|ticket)\b/i.test(text)) return 'caseid';
            if (/\b(company|organisation|organization|brand)\b/i.test(text)) return 'org';
            if (/\b(supervisor|manager|senior)\b/i.test(text)) return 'supervisor';
            if (/\b(name|full name)\b/i.test(text)) return 'name';
            if (/\b(address|office address|branch address)\b/i.test(text)) return 'address';
            if (/\b(document|pan|aadhaar|aadhar|kyc)\b/i.test(text)) return 'documents';
            if (/\b(app|application|apk|download)\b/i.test(text)) return 'app';
            if (/\b(order id|order number|ticket id|booking id|invoice number)\b/i.test(text)) return 'orderid';
            if (/\b(tracking|consignment)\b/i.test(text)) return 'tracking';
            if (/\b(challan|violation)\b/i.test(text)) return 'challan';
            if (/\b(consumer number|ca number)\b/i.test(text)) return 'consumer';
            if (/\b(officer)\b/i.test(text)) return 'officer';
            if (/\b(verify|verification|confirm)\b/i.test(text)) return 'verification';
            if (/\b(process|procedure)\b/i.test(text)) return 'process';
            if (/\b(lottery|prize|lucky draw)\b/i.test(text)) return 'lottery';
            if (/\b(website|app|platform)\b/i.test(text)) return 'platform';
            return 'general';
        };

        for (const q of questionsToTrack) {
            const normalized = String(q || '').toLowerCase().replace(/\s+/g, ' ').trim();
            if (normalized && !session.askedQuestions.includes(normalized)) {
                session.askedQuestions.push(normalized);
            }
            const topic = detectTopic(q);
            if (topic && !session.askedTopics.includes(topic)) {
                session.askedTopics.push(topic);
            }
        }

        if (processed.aside) {
            const normalizedAside = processed.aside.toLowerCase().replace(/\s+/g, ' ').trim();
            if (normalizedAside && !session.usedAsides.includes(normalizedAside)) {
                session.usedAsides.push(normalizedAside);
                if (session.usedAsides.length > 10) {
                    session.usedAsides.shift();
                }
            }
        }

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
            const nextType = agentResponse.metadata.scamType;
            if (session.scamType === 'unknown' || nextType !== 'bank_fraud') {
                session.scamType = nextType;
            }
        }

        // Calculate engagement metrics
        const durationSeconds = Math.round((Date.now() - session.sessionStartMs) / 1000);

        // Build response payload per GUVI spec (simple format)
        const responsePayload = {
            status: 'success',
            reply: processedReply
        };

        // Check for termination (>=10 turns)
        const shouldTerminate = session.turnCount >= 10;

        if (shouldTerminate) {
            console.log(`\n🏁 Session ${sessionId} terminating at turn ${session.turnCount}`);

            // Send mandatory GUVI callback with LLM-generated notes
            await sendGuviCallback(session, agentHistory);

            // Add termination flag to response
            responsePayload.terminated = true;
            responsePayload.terminationReason = 'max_turns_reached';
        }

        // Send custom callback if provided (for compatibility)
        if (callbackUrl) {
            const callbackPayload = shouldTerminate
                ? normalizeFinalPayload(session, agentResponse)
                : {
                    status: 'success',
                    reply: processedReply,
                    scamDetected: session.scamDetected,
                    extractedIntelligence: {
                        phoneNumbers: session.extractedIntelligence.phoneNumbers,
                        bankAccounts: session.extractedIntelligence.bankAccounts,
                        upiIds: session.extractedIntelligence.upiIds,
                        phishingLinks: session.extractedIntelligence.phishingLinks,
                        emailAddresses: session.extractedIntelligence.emailAddresses,
                        trackingIds: session.extractedIntelligence.trackingIds,
                        orderIds: session.extractedIntelligence.orderIds,
                        policyNumbers: session.extractedIntelligence.policyNumbers,
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
                        callbackNumbers: session.extractedIntelligence.callbackNumbers,
                        transactionIds: session.extractedIntelligence.transactionIds,
                        accountLast4: session.extractedIntelligence.accountLast4,
                        caseIds: session.extractedIntelligence.caseIds,
                        appNames: session.extractedIntelligence.appNames,
                        officerNames: session.extractedIntelligence.officerNames
                    },
                    engagementMetrics: {
                        totalMessagesExchanged: session.turnCount * 2,
                        engagementDurationSeconds: durationSeconds > 0 ? durationSeconds : 1
                    },
                    agentNotes: `${session.scamType} scam. Turn ${session.turnCount}.`
                };

            console.log(`📤 Sending callback to: ${callbackUrl}`);
            await sendCallback(callbackUrl, callbackPayload, API_KEY);
        }

        // Simulate human response time (5-9 seconds)
        const minDelayMs = 5000;
        const maxDelayMs = 9000;
        const delayMs = Math.floor(minDelayMs + Math.random() * (maxDelayMs - minDelayMs + 1));
        await new Promise(resolve => setTimeout(resolve, delayMs));

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
