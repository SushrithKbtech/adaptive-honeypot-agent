const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// ============================================================================
// HONEYPOT API TESTER
// ============================================================================

// Configuration
const ENDPOINT_URL = process.env.ENDPOINT_URL || 'http://localhost:3000/api/honeypot';
const API_KEY = process.env.API_KEY || '';

// Test scenarios
const testScenarios = [
    {
        name: 'Lottery Prize Scam',
        initialMessage: 'Congratulations! You have won Rs. 25 lakh in our lucky draw. To claim your prize, you need to complete a quick verification process.',
        expectedExtractions: ['amount', 'upi_id', 'phone_number']
    },
    {
        name: 'Bank Fraud',
        initialMessage: 'URGENT: Your SBI account has been compromised. Your account will be blocked in 2 hours. Share your account number and OTP immediately to verify your identity.',
        expectedExtractions: ['bank_account', 'otp', 'phone_number', 'employee_id']
    },
    {
        name: 'UPI Refund Scam',
        initialMessage: 'Your payment of ₹5,999 to Amazon has failed. To get your refund, please verify your UPI ID immediately. Contact us at +91-9876543210.',
        expectedExtractions: ['amount', 'merchant', 'upi_id', 'phone_number']
    },
    {
        name: 'Fake Delivery',
        initialMessage: 'Your parcel from India Post is awaiting delivery. Tracking ID: IN123456789AB. Pay ₹50 delivery charge to receive it. Contact: +91-8765432109',
        expectedExtractions: ['tracking_id', 'amount', 'phone_number']
    },
    {
        name: 'Traffic Challan Scam',
        initialMessage: 'Traffic Police Notice: Challan issued for vehicle MH-12-AB-1234. Fine: ₹5000. Pay immediately to avoid legal action. Challan No: TRF20241234',
        expectedExtractions: ['challan_number', 'vehicle_number', 'amount']
    }
];

// ============================================================================
// TEST RUNNER
// ============================================================================

async function runTest(scenario, maxTurns = 5) {
    const sessionId = uuidv4();
    const conversationHistory = [];

    console.log('\n' + '='.repeat(80));
    console.log(`🧪 TEST: ${scenario.name}`);
    console.log('='.repeat(80));

    const headers = {
        'Content-Type': 'application/json'
    };

    if (API_KEY) {
        headers['x-api-key'] = API_KEY;
    }

    let scammerMessage = scenario.initialMessage;

    for (let turn = 1; turn <= maxTurns; turn++) {
        console.log(`\n--- Turn ${turn} ---`);
        console.log(`🔴 SCAMMER: ${scammerMessage}`);

        try {
            const message = {
                sender: 'scammer',
                text: scammerMessage,
                timestamp: new Date().toISOString()
            };

            const requestBody = {
                sessionId,
                message,
                conversationHistory,
                metadata: {
                    channel: 'SMS',
                    language: 'English',
                    locale: 'IN'
                }
            };

            const startTime = Date.now();
            const response = await axios.post(ENDPOINT_URL, requestBody, {
                headers,
                timeout: 30000
            });
            const responseTime = Date.now() - startTime;

            if (response.status !== 200) {
                console.error(`❌ ERROR: API returned status ${response.status}`);
                break;
            }

            const honeypotReply = response.data.reply || response.data.message || response.data.text;

            if (!honeypotReply) {
                console.error('❌ ERROR: No reply in response');
                console.error('Response:', response.data);
                break;
            }

            console.log(`🟢 HONEYPOT: ${honeypotReply}`);
            console.log(`⏱️  Response time: ${responseTime}ms`);

            // Update conversation history
            conversationHistory.push(message);
            conversationHistory.push({
                sender: 'user',
                text: honeypotReply,
                timestamp: new Date().toISOString()
            });

            // For testing, simulate scammer responses based on turn
            if (turn < maxTurns) {
                scammerMessage = getSimulatedScammerResponse(scenario.name, turn, honeypotReply);
            }

        } catch (error) {
            if (error.code === 'ECONNABORTED') {
                console.error('❌ ERROR: Request timeout (>30 seconds)');
            } else if (error.code === 'ECONNREFUSED') {
                console.error('❌ ERROR: Connection refused - is the server running?');
            } else {
                console.error('❌ ERROR:', error.message);
            }
            break;
        }
    }

    console.log('\n' + '='.repeat(80));
    console.log(`📊 TEST SUMMARY: ${scenario.name}`);
    console.log(`   Total turns: ${conversationHistory.length / 2}`);
    console.log(`   Messages exchanged: ${conversationHistory.length}`);
    console.log('='.repeat(80));

    return {
        scenario: scenario.name,
        turns: conversationHistory.length / 2,
        conversationHistory
    };
}

// ============================================================================
// SIMULATED SCAMMER RESPONSES
// ============================================================================

function getSimulatedScammerResponse(scenarioName, turn, honeypotMessage) {
    const responses = {
        'Lottery Prize Scam': [
            'I am from the Rewards Department. My employee ID is PRZ9001. To proceed with your prize, I need to verify your identity.',
            'You can call me back at +91-9090909090. Now, please send the processing fee of ₹5000 to this UPI ID: prizeclaim@upi',
            'The processing fee is mandatory. Our IFSC code is LUCKY1234. Send the money now or you will lose your prize!',
            'My supervisor is Mr. Sharma. The branch address is 123 Lucky Plaza, Mumbai. Just pay ₹5000 now!'
        ],
        'Bank Fraud': [
            'I am calling from SBI Fraud Department. My employee ID is SBI12345. What is your account number?',
            'You can reach me at +91-9876543210. A transaction of ₹50,000 was attempted. Share your OTP to block it.',
            'The fraud case ID is FRD2024123. Our branch IFSC is SBIN0001234. You need to share your CVV to verify.',
            'My supervisor is Mr. Kumar. Visit our branch at Connaught Place. But first share your card details!'
        ],
        'UPI Refund Scam': [
            'The transaction ID is TXN987654321. The payment to Amazon failed. Share your UPI PIN to process refund.',
            'Our customer care number is +91-8765432109. The refund will be ₹5,999. Send it to refund@fakebank',
            'The merchant name is Amazon India. You need to verify your account by sending ₹1 to verify@scam',
            'Contact our supervisor Mr. Patel at +91-7654321098. Share your bank account number for refund.'
        ],
        'Fake Delivery': [
            'The package is from Delhi. Sender name is Ramesh Kumar. Pay ₹50 to inpost@delivery',
            'Our courier office is at Andheri. Call +91-9988776655. The package contains electronics.',
            'Tracking shows it arrived yesterday. Pay delivery charge to delivery123@upi immediately.',
            'Our supervisor is Ms. Shah. Office address: 456 Post Office Road. Just pay ₹50 now!'
        ],
        'Traffic Challan Scam': [
            'The violation was on MG Road on 10th Feb. Pay ₹5000 fine to challan@traffic',
            'Photo evidence is on our website traffic-pay.xyz/challan/TRF20241234',
            'Contact our office at +91-9898989898. The RTO code is MH01. Pay online now.',
            'Senior Inspector Patil is handling this. Office: Bandra Traffic Police. Pay immediately to avoid arrest!'
        ]
    };

    const scenarioResponses = responses[scenarioName] || responses['Bank Fraud'];
    const index = Math.min(turn - 1, scenarioResponses.length - 1);
    return scenarioResponses[index];
}

// ============================================================================
// RUN ALL TESTS
// ============================================================================

async function runAllTests() {
    console.log('\n🚀 STARTING HONEYPOT API TESTS\n');
    console.log(`Endpoint: ${ENDPOINT_URL}`);
    console.log(`API Key: ${API_KEY ? 'Configured' : 'Not configured'}\n`);

    const results = [];

    for (const scenario of testScenarios) {
        try {
            const result = await runTest(scenario, 4);
            results.push(result);

            // Wait a bit between tests
            await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
            console.error(`❌ Test failed for ${scenario.name}:`, error.message);
        }
    }

    console.log('\n\n' + '='.repeat(80));
    console.log('📈 OVERALL TEST RESULTS');
    console.log('='.repeat(80));

    results.forEach(result => {
        console.log(`✅ ${result.scenario}: ${result.turns} turns completed`);
    });

    console.log('\n✨ Testing complete!\n');
}

// Run tests if called directly
if (require.main === module) {
    runAllTests().catch(error => {
        console.error('Test suite failed:', error);
        process.exit(1);
    });
}

module.exports = { runTest, runAllTests };
