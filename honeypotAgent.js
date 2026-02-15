const OpenAI = require('openai');

// ============================================================================
// ADAPTIVE HONEYPOT AGENT - INTELLIGENT SCAM DETECTION & ENGAGEMENT
// ============================================================================
// This agent uses LLM-powered intelligence to adapt to ANY scam type
// and engage scammers in natural, contextually appropriate conversations
// ============================================================================

class AdaptiveHoneypotAgent {
  constructor(apiKey) {
    this.openai = new OpenAI({
      apiKey: apiKey
    });
    this.model = 'gpt-4o-mini'; // Fast, efficient, cost-effective

    // Scam type detection patterns
    this.scamPatterns = {
      lottery_prize: {
        keywords: ['won', 'prize', 'lottery', 'lucky draw', 'congratulations', 'lakh', 'crore', 'winner'],
        persona: 'excited_naive',
        priority_extractions: ['prize_amount', 'upi_id', 'bank_account', 'processing_fee']
      },
      bank_fraud: {
        keywords: ['account', 'blocked', 'suspended', 'bank', 'sbi', 'hdfc', 'icici', 'debit', 'credit', 'atm'],
        persona: 'panicked_confused',
        priority_extractions: ['account_number', 'otp', 'cvv', 'card_number', 'employee_id']
      },
      upi_fraud: {
        keywords: ['upi', 'paytm', 'phonepe', 'gpay', 'refund', 'cashback', 'payment failed', 'verify'],
        persona: 'concerned_practical',
        priority_extractions: ['upi_id', 'transaction_id', 'phone_number', 'merchant_name']
      },
      fake_delivery: {
        keywords: ['delivery', 'courier', 'parcel', 'package', 'india post', 'blue dart', 'dhl', 'tracking'],
        persona: 'confused_curious',
        priority_extractions: ['tracking_id', 'delivery_fee', 'phone_number', 'upi_id']
      },
      electricity_bill: {
        keywords: ['electricity', 'bill', 'power', 'mseb', 'discom', 'consumer number', 'due'],
        persona: 'worried_obedient',
        priority_extractions: ['consumer_number', 'bill_amount', 'payment_link', 'upi_id']
      },
      traffic_challan: {
        keywords: ['challan', 'traffic', 'violation', 'fine', 'police', 'rto', 'vehicle'],
        persona: 'nervous_compliant',
        priority_extractions: ['challan_number', 'vehicle_number', 'fine_amount', 'payment_link']
      },
      kyc_update: {
        keywords: ['kyc', 'update', 'verify', 'details', 'expired', 'link', 'click'],
        persona: 'cautious_questioning',
        priority_extractions: ['phishing_link', 'phone_number', 'employee_id']
      },
      investment_scam: {
        keywords: ['investment', 'returns', 'profit', 'trading', 'stock', 'crypto', 'double', 'earn'],
        persona: 'interested_skeptical',
        priority_extractions: ['platform_name', 'referral_link', 'investment_amount', 'phone_number']
      }
    };

    // Intelligence extraction patterns
    this.extractionPatterns = {
      phoneNumbers: [
        /(?:\+91[\s-]?)?[6-9]\d{9}/g,
        /(?:\+91)?[6-9]\d{2}[\s-]?\d{3}[\s-]?\d{4}/g
      ],
      upiIds: [
        /[\w.-]+@[\w.-]+/g
      ],
      bankAccounts: [
        /\b\d{9,18}\b/g
      ],
      phishingLinks: [
        /https?:\/\/[^\s]+/g,
        /www\.[^\s]+/g,
        /[a-z0-9-]+\.(com|in|org|net|xyz|click|site)[^\s]*/gi
      ],
      emailAddresses: [
        /[\w.-]+@[\w.-]+\.(com|in|org|net|co\.in)/g
      ],
      trackingIds: [
        /\b[A-Z]{2}\d{9,12}[A-Z]?\b/g,
        /tracking[\s:]+([A-Z0-9]{8,})/gi
      ],
      challanNumbers: [
        /challan[\s#:]+([A-Z0-9]{8,})/gi,
        /\b[A-Z]{2}\d{8,12}\b/g
      ],
      consumerNumbers: [
        /consumer[\s#:]+(\d{8,})/gi,
        /\b\d{10,14}\b/g
      ],
      vehicleNumbers: [
        /\b[A-Z]{2}[\s-]?\d{1,2}[\s-]?[A-Z]{1,2}[\s-]?\d{4}\b/gi
      ],
      employeeIds: [
        /(?:emp|employee|id|agent)[\s#:]+([A-Z0-9]{4,})/gi,
        /\b[A-Z]{2,4}\d{4,8}\b/g
      ],
      ifscCodes: [
        /\b[A-Z]{4}0[A-Z0-9]{6}\b/g
      ]
    };
  }

  // ============================================================================
  // SCAM TYPE DETECTION
  // ============================================================================
  detectScamType(message, conversationHistory = []) {
    const fullContext = conversationHistory.map(m => m.text).join(' ') + ' ' + message;
    const lowerContext = fullContext.toLowerCase();

    const scores = {};

    for (const [scamType, config] of Object.entries(this.scamPatterns)) {
      let score = 0;
      for (const keyword of config.keywords) {
        if (lowerContext.includes(keyword.toLowerCase())) {
          score++;
        }
      }
      scores[scamType] = score;
    }

    // Find the scam type with highest score
    const detectedType = Object.entries(scores)
      .sort((a, b) => b[1] - a[1])[0];

    return detectedType[1] > 0 ? detectedType[0] : 'general_fraud';
  }

  // ============================================================================
  // PERSONA-BASED RESPONSE GENERATION
  // ============================================================================
  getPersonaInstructions(persona, scamType, turnNumber) {
    const personas = {
      excited_naive: `EMOTIONAL STATE: Excited but overwhelmed, wants the prize badly
MINDSET: Cooperative and eager, NOT confrontational
BEHAVIOR:
- React with genuine excitement and disbelief when amounts are mentioned
- Want to claim the prize, so ask questions naturally to understand the process
- Show you're trying to cooperate but need clarification
- Sound eager but also a bit confused about the process
- Mix excitement with natural questions about legitimacy
- Don't challenge them aggressively - you WANT this to be real
- Get more curious about details as they reveal information
AVOID: Repeating amounts back, confrontational "why" questions, sounding defensive`,

      panicked_confused: `EMOTIONAL STATE: Scared and anxious, wants to fix the problem
MINDSET: Cooperative and worried, NOT confrontational
BEHAVIOR:
- Genuinely worried about the threat (blocked account, legal action)
- Want to resolve the issue quickly
- Ask questions because you're confused, not because you're challenging them
- Sound stressed but trying to understand
- Show trust in authority initially
- Ask for clarification in a worried tone, not accusatory
- Get more specific about verification details as panic sets in
AVOID: Confrontational questioning, sounding skeptical too early, challenging authority`,

      concerned_practical: `EMOTIONAL STATE: Concerned but level-headed, wants clarity
MINDSET: Cooperative but cautious, NOT defensive
BEHAVIOR:
- You're concerned about the UPI/payment issue
- Want to sort it out properly
- Ask direct questions but in a cooperative tone
- Sound like you're trying to understand, not interrogate
- Reference your own confusion naturally
- Show willingness to help resolve the situation
- Get more specific about transaction details as they talk
AVOID: Sounding accusatory, defensive "how do I know" statements early on`,

      confused_curious: `EMOTIONAL STATE: Puzzled and curious, wants answers
MINDSET: Cooperative and seeking clarity, NOT confrontational
BEHAVIOR:
- Genuinely confused because you didn't order anything
- Curious about the details
- Want to understand what's happening
- Ask questions naturally out of confusion, not suspicion
- Show you're trying to make sense of the situation
- Sound cooperative as you seek answers
- Get more specific about tracking/sender details
AVOID: Confrontational tone, immediate accusations, defensive questioning`,

      worried_obedient: `EMOTIONAL STATE: Anxious and compliant, wants to pay quickly
MINDSET: Cooperative and obedient, NOT questioning authority harshly
BEHAVIOR:
- Worried about the consequences (disconnection, penalties)
- Want to pay immediately to avoid problems
- Ask for details because you need them to pay, not to challenge
- Sound respectful and cooperative
- Show urgency to resolve this
- Trust what they're saying initially
- Get payment details naturally as a worried person would
AVOID: Aggressive questioning, confrontational tone, challenging their authority`,

      nervous_compliant: `EMOTIONAL STATE: Nervous and law-abiding, wants to resolve the issue
MINDSET: Cooperative and compliant, NOT defensive
BEHAVIOR:
- Nervous about the traffic violation/fine
- Want to pay and resolve it properly
- Ask questions to understand how to comply, not to challenge
- Sound respectful and cooperative
- Show you're law-abiding and want to do the right thing
- Get verification details naturally while being compliant
- Become more specific about payment process as they guide you
AVOID: Confrontational questioning, sounding suspicious immediately, defensive tone`,

      cautious_questioning: `EMOTIONAL STATE: Cautious but willing to cooperate, wants verification
MINDSET: Cooperative but careful, NOT aggressive
BEHAVIOR:
- Cautious about KYC/verification requests
- Want to do it if it's legitimate
- Ask questions because you want to verify, not accuse
- Sound like you're being careful, not confrontational
- Show willingness to update KYC if needed
- Ask for details in a respectful, verification-seeking way
- Get more specific about process as they explain
AVOID: Aggressive skepticism, confrontational "prove it" attitude, defensive tone`,

      interested_skeptical: `EMOTIONAL STATE: Interested but careful, wants more information
MINDSET: Cooperative but cautious, NOT combative
BEHAVIOR:
- Interested in the investment opportunity
- Want to learn more before committing
- Ask questions out of due diligence, not confrontation
- Sound like a potential investor seeking clarity
- Show genuine interest while being prudent
- Get company details naturally as an interested person would
- Become more specific about legitimacy checks as they pitch
AVOID: Immediate accusations, confrontational skepticism, aggressive questioning`
    };

    return personas[persona] || personas.concerned_practical;
  }

  // ============================================================================
  // INTELLIGENT QUESTION STRATEGY
  // ============================================================================
  getStrategicQuestions(scamType, turnNumber, extractedSoFar) {
    const strategies = {
      lottery_prize: [
        "How did I win? Which lottery did I enter?",
        "Can you tell me your organization name and employee ID?",
        "What is the verification process? Is there an official website?",
        "You mentioned processing fee - how much is it and where should I send?",
        "Can you give me a callback number to verify this?",
        "What documents do I need? Is there a reference number?",
        "How will I receive the prize money?"
      ],
      bank_fraud: [
        "Which bank are you calling from? Can you confirm my account number?",
        "What is your employee ID and department?",
        "What transaction are you talking about? I didn't do anything suspicious",
        "Can you give me your official callback number?",
        "Should I come to the branch instead? Which branch should I visit?",
        "What is the case reference number?",
        "How do I verify you're really from the bank?"
      ],
      upi_fraud: [
        "Which merchant is this payment to? I don't recognize it",
        "What is the transaction ID or reference number?",
        "Can you tell me the exact amount and date?",
        "How do I get my refund? What's the process?",
        "Is there a customer care number I can call?",
        "Why do you need my UPI PIN for a refund?",
        "Can you send me an official email about this?"
      ],
      fake_delivery: [
        "What is the tracking number for this package?",
        "Who is the sender? I didn't order anything recently",
        "Which courier company are you from?",
        "Where is the package coming from?",
        "Can you tell me what's inside?",
        "How much is the delivery charge?",
        "Can I pick it up from your office instead?"
      ],
      electricity_bill: [
        "What is my consumer number? Let me verify",
        "How much is the outstanding amount?",
        "When was the due date? I thought I already paid",
        "Can you give me the bill reference number?",
        "What is your office address? Can I pay there?",
        "Is there a late fee? How much total should I pay?",
        "Can I check this on the official website or app?"
      ],
      traffic_challan: [
        "What is the challan number and date of violation?",
        "Which vehicle is this for? Can you tell me the registration number?",
        "Where did this violation happen? What did I do wrong?",
        "How much is the fine amount?",
        "Can I see the photo evidence?",
        "Is there an official portal to check and pay?",
        "What if I want to contest this challan?"
      ]
    };

    const questions = strategies[scamType] || strategies.bank_fraud;
    return questions[Math.min(turnNumber - 1, questions.length - 1)];
  }

  // ============================================================================
  // EXTRACT INTELLIGENCE FROM MESSAGES
  // ============================================================================
  extractIntelligence(message, conversationHistory = []) {
    const intelligence = {
      phoneNumbers: [],
      upiIds: [],
      bankAccounts: [],
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
    };

    // Combine all conversation text
    const allText = conversationHistory
      .filter(m => m.sender === 'scammer')
      .map(m => m.text)
      .join('\n') + '\n' + message;

    // Extract using patterns
    for (const [key, patterns] of Object.entries(this.extractionPatterns)) {
      for (const pattern of patterns) {
        const matches = allText.match(pattern);
        if (matches) {
          intelligence[key].push(...matches);
        }
      }
    }

    // Deduplicate and clean
    for (const key of Object.keys(intelligence)) {
      intelligence[key] = [...new Set(intelligence[key])].filter(v => v && v.trim());
    }

    // Extract amounts (₹ symbols, numbers with lakh/crore)
    const amountPatterns = [
      /₹[\s]?[\d,]+(?:\s?(?:lakh|crore))?/gi,
      /(?:rs|inr)[\s.]?[\d,]+/gi,
      /\d+\s?(?:lakh|crore)/gi
    ];

    for (const pattern of amountPatterns) {
      const matches = allText.match(pattern);
      if (matches) {
        intelligence.amounts.push(...matches);
      }
    }
    intelligence.amounts = [...new Set(intelligence.amounts)];

    // Extract merchant names (mentioned after "from", "to", "merchant")
    const merchantPattern = /(?:from|to|merchant|shop|store)[\s:]+([A-Za-z\s&]{3,30}?)(?:\s|,|\.|\?|!|$)/gi;
    const merchantMatches = [...allText.matchAll(merchantPattern)];
    if (merchantMatches.length > 0) {
      intelligence.merchantNames = [...new Set(merchantMatches.map(m => m[1].trim()))];
    }

    // Extract organization names
    const orgPattern = /(?:from|calling from|represent|bank|company)[\s:]+([A-Z][A-Za-z\s&]{3,30}?)(?:\s|,|Department|Office|\.|$)/g;
    const orgMatches = [...allText.matchAll(orgPattern)];
    if (orgMatches.length > 0) {
      intelligence.orgNames = [...new Set(orgMatches.map(m => m[1].trim()))];
    }

    // Extract department names
    const deptPattern = /(?:from|calling from)(?: the)?\s([A-Za-z\s]+?Department|[A-Za-z\s]+?Office)/gi;
    const deptMatches = [...allText.matchAll(deptPattern)];
    if (deptMatches.length > 0) {
      intelligence.departmentNames = [...new Set(deptMatches.map(m => m[1].trim()))];
    }

    // Extract supervisor/manager names
    const supervisorPattern = /(?:supervisor|manager|senior|officer|sir|madam)[\s:]+(?:mr|ms|mrs)?\.?\s?([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/gi;
    const supervisorMatches = [...allText.matchAll(supervisorPattern)];
    if (supervisorMatches.length > 0) {
      intelligence.supervisorNames = [...new Set(supervisorMatches.map(m => m[1].trim()))];
    }

    // Extract transaction IDs
    const txnPattern = /(?:transaction|txn|reference|ref)[\s#:ID]+([A-Z0-9]{8,})/gi;
    const txnMatches = [...allText.matchAll(txnPattern)];
    if (txnMatches.length > 0) {
      intelligence.transactionIds = [...new Set(txnMatches.map(m => m[1]))];
    }

    // Extract suspicious keywords (urgency, threats, manipulation tactics)
    const suspiciousPatterns = [
      // Urgency tactics
      /\b(urgent|immediately|right now|within \d+ (minutes|hours)|last chance|expire|deadline|today only|hurry|quick|fast)\b/gi,
      // Threats
      /\b(blocked?|suspend(ed)?|deactivate|cancel|terminate|legal action|police|arrest|penalty|fine|court)\b/gi,
      // Authority manipulation
      /\b(verify|confirm|update|authenticate|validate|security check|mandatory|required|compliance)\b/gi,
      // Payment pressure
      /\b(pay now|payment pending|overdue|arrears|dues|refund|cashback|prize|winner|won|claim)\b/gi,
      // Fake legitimacy
      /\b(official|authorized|department|government|bank|RBI|income tax|GST|cybercrime|fraud department)\b/gi,
      // Call to action
      /\b(click here|tap here|download|install|share|send|forward|call back?|whatsapp|SMS)\b/gi
    ];

    const allKeywords = new Set();
    for (const pattern of suspiciousPatterns) {
      const matches = allText.toLowerCase().match(pattern) || [];
      matches.forEach(keyword => allKeywords.add(keyword.trim()));
    }
    intelligence.suspiciousKeywords = [...allKeywords];

    return intelligence;
  }

  // ============================================================================
  // LLM-POWERED INTELLIGENCE EXTRACTION (Enhanced)
  // ============================================================================
  async extractIntelligenceWithLLM(conversationHistory, scamType) {
    try {
      const conversation = conversationHistory
        .map(m => `${m.sender === 'scammer' ? 'SCAMMER' : 'VICTIM'}: ${m.text}`)
        .join('\n');

      const prompt = `Analyze this scam conversation and extract ALL suspicious keywords, tactics, and manipulation techniques.

CONVERSATION:
${conversation}

SCAM TYPE: ${scamType}

Extract and list:
1. Urgency tactics (e.g., "immediately", "urgent", "within 24 hours")
2. Threat words (e.g., "blocked", "arrested", "legal action")
3. Authority claims (e.g., "bank official", "government", "police")
4. Manipulation phrases (e.g., "verify now", "last chance", "mandatory")
5. Pressure tactics (e.g., "pay now", "account suspended")

Return ONLY a comma-separated list of suspicious keywords/phrases found (max 20).
Example: urgent, blocked, verify immediately, legal action, government official, pay now

Keywords:`;

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert in analyzing scam tactics and identifying manipulation patterns.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 150
      });

      const keywords = completion.choices[0].message.content.trim()
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0);

      return keywords;
    } catch (error) {
      console.error('LLM keyword extraction error:', error);
      return [];
    }
  }

  // ============================================================================
  // MERGE INTELLIGENCE FROM MULTIPLE SOURCES
  // ============================================================================
  mergeIntelligence(existing, newData) {
    const merged = { ...existing };

    for (const [key, values] of Object.entries(newData)) {
      if (Array.isArray(values)) {
        merged[key] = [...new Set([...(merged[key] || []), ...values])];
      }
    }

    return merged;
  }

  // ============================================================================
  // GET SCAM-SPECIFIC QUESTIONING STRATEGY
  // ============================================================================
  getScamSpecificQuestions(scamType, turnNumber) {
    const strategies = {
      lottery_prize: `Target: Prize claim process, org name, employee details, payment methods
- Who is organizing this lottery?
- What is your employee ID / supervisor name?
- How do I claim the prize?
- What processing fees / taxes are involved?
- Which bank account / UPI should I use to pay?
- Can I get a reference number?
- What is the callback number for verification?`,

      bank_fraud: `Target: Bank name, employee ID, branches, account verification, transaction details
- Which bank are you calling from?
- What is your employee ID?
- What branch are you from?
- What is the suspicious transaction ID?
- Which merchant was it?
- Can you give me a callback number?
- What is the reference case number?`,

      upi_fraud: `Target: Merchant names, transaction IDs, amounts, UPI IDs, phone numbers
- Which merchant was this payment to?
- What is the transaction ID?
- What is your UPI ID for refund?
- Can you share the exact amount?
- What phone number can I call back on?
- Is there a reference number?`,

      delivery_scam: `Target: Tracking IDs, company name, sender details, package contents, fees
- What is the tracking number?
- Which courier company?
- Who is the sender?
- What's in the package?
- Where was it shipped from?
- What fees do I need to pay?
- Can I get a customer service number?`,

      electricity_bill: `Target: Consumer number, arrears amount, office details, payment methods
- What is my consumer number?
- Which electricity board?
- What is the exact arrears amount?
- From which office are you calling?
- What is your employee ID?
- Where should I pay?
- Can I get a reference number?`,

      traffic_challan: `Target: Challan number, vehicle number, location, fine amount, officer details
- What is the challan number?
- Which vehicle is this for?
- Where did this violation occur?
- What is the exact fine amount?
- What is your officer ID?
- Which police station?
- How do I verify this?`,

      kyc_update: `Target: Bank name, employee ID, reason for KYC, documents needed, deadlines
- Which bank is this for?
- Why does my KYC need updating?
- What is your employee ID?
- What documents do you need?
- What's the deadline?
- Can I visit the branch instead?
- What happens if I don't update?`,

      investment_scam: `Target: Company name, investment scheme, returns promised, payment methods
- What is your company name?
- What is the investment scheme?
- What returns are guaranteed?
- Who are the founders?
- Is this SEBI registered?
- Where do I send the money?
- Can I get documentation?`
    };

    return strategies[scamType] || strategies.bank_fraud;
  }

  // ============================================================================
  // GENERATE CONTEXTUAL, NATURAL RESPONSE
  // ============================================================================
  async generateResponse(message, conversationHistory, scamType, turnNumber, askedQuestions = []) {
    const persona = this.scamPatterns[scamType]?.persona || 'concerned_practical';
    const personaInstructions = this.getPersonaInstructions(persona, scamType, turnNumber);

    // Build conversation context
    const conversationContext = conversationHistory
      .slice(-6) // Last 6 messages for context
      .map(m => `${m.sender === 'scammer' ? 'SCAMMER' : 'YOU'}: ${m.text}`)
      .join('\n');

    // Build list of previously asked questions
    const previouslyAsked = askedQuestions.length > 0
      ? `\n\nQUESTIONS YOU'VE ALREADY ASKED (DO NOT REPEAT THESE):\n${askedQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
      : '';

    // Get scam-specific questioning strategy
    const questioningStrategy = this.getScamSpecificQuestions(scamType, turnNumber);

    const prompt = `You are a real Indian person being scammed. Sound like someone who WANTS to cooperate but needs clarification.

SCAM TYPE: ${scamType}
CONVERSATION:
${conversationContext}

SCAMMER JUST SAID:
${message}

${personaInstructions}

INTELLIGENCE TO EXTRACT (naturally, not aggressively):
${questioningStrategy}${previouslyAsked}

YOUR MINDSET:
- You WANT to proceed (claim prize / fix problem / make payment)
- You're NOT trying to catch them in a lie
- You're asking questions because you NEED the info to proceed, not to confront
- You're cooperative, maybe a bit stressed, but NOT defensive or confrontational
- You sound like someone genuinely trying to understand the next steps

HOW TO SOUND:
- Excited/worried/confused (match your persona's emotion)
- Ask questions naturally as someone trying to cooperate
- Show you're eager to proceed but need clarification
- React authentically to what they just revealed
- Slip in ONE question to get more details
- Sound like you're trying to help THEM help YOU

CRITICAL - DO NOT DO THESE:
❌ DON'T repeat amounts/numbers back (e.g., "₹25 lakh" at the start)
❌ DON'T start with confrontational "why" questions ("Why do I have to...?")
❌ DON'T say "Sir, I understand... but could you please..."
❌ DON'T sound defensive or challenging
❌ DON'T repeat information they just told you word-for-word
❌ DON'T use overly formal polite language
❌ DON'T sound like you're interrogating them

INSTEAD DO THIS:
✅ React to new information with genuine emotion
✅ Ask questions like you're trying to understand HOW to proceed
✅ Sound eager/worried and wanting to cooperate
✅ Use natural speech: "Okay", "So...", "Wait", "I'm just...", "Let me..."
✅ Mix your emotional reaction with a natural follow-up question
✅ Sound like you're seeking guidance, not challenging them

EXAMPLES OF GOOD RESPONSES:
"Wow really? Okay so how do I actually claim this? What's the first step?"
"Oh god, that's scary. What should I do right now to stop it?"
"I'm so confused...how did this even happen? Can you explain the process?"
"This is amazing! So tell me, which company is organizing this?"

TURN ${turnNumber} - How would a real ${persona} person ask for the next detail naturally?

Just your natural response (40-60 words max):`;


    try {
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a natural Indian person responding to a scammer. Sound completely human and conversational, never formal or robotic. Think and react like a real worried person would.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.95,  // Higher temperature for more natural variety
        max_tokens: 150
      });

      const response = completion.choices[0].message.content.trim();

      // Clean up any meta-commentary
      return response
        .replace(/^(YOU:|VICTIM:|RESPONSE:)/i, '')
        .trim();
    } catch (error) {
      console.error('LLM generation error:', error);

      // Fallback to strategic question
      return this.getStrategicQuestions(scamType, turnNumber, {});
    }
  }

  // ============================================================================
  // GENERATE AGENT NOTES SUMMARY
  // ============================================================================
  async generateAgentNotes(conversationHistory, extractedIntelligence, scamType) {
    const fullConversation = conversationHistory
      .map(m => `${m.sender === 'scammer' ? 'SCAMMER' : 'VICTIM'}: ${m.text}`)
      .join('\n');

    const prompt = `Analyze this scam conversation and provide a concise summary for law enforcement.

SCAM TYPE: ${scamType}

CONVERSATION:
${fullConversation}

EXTRACTED INTELLIGENCE:
${JSON.stringify(extractedIntelligence, null, 2)}

Provide a 2-3 sentence summary that includes:
1. What type of scam this is
2. Key tactics the scammer used
3. Most important intelligence gathered
4. Any red flags or suspicious elements

Keep it professional and concise.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert in analyzing scam conversations for law enforcement.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 200
      });

      return completion.choices[0].message.content.trim();
    } catch (error) {
      console.error('Agent notes generation error:', error);
      return `${scamType} scam detected. Scammer attempted to extract sensitive information. Extracted intelligence includes contact details and payment information.`;
    }
  }

  // ============================================================================
  // MAIN CONVERSATION HANDLER
  // ============================================================================
  async handleMessage(sessionId, message, conversationHistory = [], metadata = {}, askedQuestions = []) {
    try {
      const turnNumber = Math.floor(conversationHistory.length / 2) + 1;

      // Detect scam type
      const scamType = this.detectScamType(message, conversationHistory);

      // Extract intelligence from current message (regex-based)
      const newIntelligence = this.extractIntelligence(message, conversationHistory);

      // Extract suspicious keywords using LLM (more intelligent)
      if (conversationHistory.length >= 2) {
        const llmKeywords = await this.extractIntelligenceWithLLM(conversationHistory, scamType);
        // Merge LLM keywords with regex keywords
        newIntelligence.suspiciousKeywords = [
          ...new Set([...newIntelligence.suspiciousKeywords, ...llmKeywords])
        ];
      }

      // Generate natural, contextual response with question tracking
      const response = await this.generateResponse(
        message,
        conversationHistory,
        scamType,
        turnNumber,
        askedQuestions
      );

      return {
        status: 'success',
        reply: response,
        metadata: {
          scamType,
          turnNumber,
          extractedIntelligence: newIntelligence
        }
      };

    } catch (error) {
      console.error('Error handling message:', error);

      // Fallback response
      return {
        status: 'success',
        reply: "I'm not fully understanding this. Can you please explain again?",
        metadata: {
          error: error.message
        }
      };
    }
  }

  // ============================================================================
  // GENERATE FINAL OUTPUT FOR SUBMISSION
  // ============================================================================
  async generateFinalOutput(sessionId, conversationHistory) {
    try {
      // Extract ALL intelligence from entire conversation
      const extractedIntelligence = this.extractIntelligence(
        '',
        conversationHistory
      );

      // Detect scam type
      const scamType = this.detectScamType('', conversationHistory);

      // Calculate engagement metrics
      const totalMessages = conversationHistory.length;
      const timestamps = conversationHistory
        .filter(m => m.timestamp)
        .map(m => new Date(m.timestamp).getTime());

      const engagementDuration = timestamps.length >= 2
        ? Math.round((Math.max(...timestamps) - Math.min(...timestamps)) / 1000)
        : 0;

      // Generate agent notes
      const agentNotes = await this.generateAgentNotes(
        conversationHistory,
        extractedIntelligence,
        scamType
      );

      return {
        sessionId,
        scamDetected: true,
        totalMessagesExchanged: totalMessages,
        extractedIntelligence,
        engagementMetrics: {
          totalMessagesExchanged: totalMessages,
          engagementDurationSeconds: engagementDuration
        },
        scamType,
        agentNotes
      };

    } catch (error) {
      console.error('Error generating final output:', error);

      return {
        sessionId,
        scamDetected: true,
        totalMessagesExchanged: conversationHistory.length,
        extractedIntelligence: this.extractIntelligence('', conversationHistory),
        agentNotes: 'Scam conversation detected and analyzed.'
      };
    }
  }
}

// ============================================================================
// EXPORT
// ============================================================================
module.exports = AdaptiveHoneypotAgent;
