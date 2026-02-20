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
    this.model = 'gpt-4.1-mini'; // More natural conversational quality

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
      },
      ecommerce: {
        keywords: ['order', 'amazon', 'flipkart', 'refund', 'return', 'cancel'],
        persona: 'confused_curious',
        priority_extractions: ['order_id', 'merchant_name', 'refund_amount', 'phone_number']
      },
      apk_remote: {
        keywords: ['anydesk', 'teamviewer', 'support', 'app', 'apk', 'install'],
        persona: 'cautious_questioning',
        priority_extractions: ['app_name', 'reason', 'employee_id']
      },
      tax_refund: {
        keywords: ['tax', 'refund', 'itr', 'income tax'],
        persona: 'worried_obedient',
        priority_extractions: ['refund_amount', 'link', 'transaction_id']
      }
    };

    // Intelligence extraction patterns
    this.extractionPatterns = {
      phoneNumbers: [
        /(?:\+91[\s-]?)?[6-9]\d{9}\b/g,
        /(?:\+91)?[6-9]\d{2}[\s-]?\d{3}[\s-]?\d{4}\b/g,
        /(?:\+?\d{1,3})[-\s]\d{6,14}\b/g
      ],
      upiIds: [
        /[a-zA-Z0-9._-]+@[a-zA-Z]{3,}/g, // Standard UPI
        /[6-9]\d{9}@[a-zA-Z]+/g // Phone based UPI
      ],
      bankAccounts: [
        /\b\d{9,18}\b/g,
        /\b(?:ac|a\/c|account)[\s.:]+(\d{9,18})\b/gi
      ],
      phishingLinks: [
        /https?:\/\/[^\s]+/g,
        /www\.[^\s]+/g,
        /\b[a-z0-9-]+\.(com|in|org|net|xyz|click|site|top|online)[^\s]*/gi
      ],
      emailAddresses: [
        /[\w.-]+@[\w.-]+\.(com|in|org|net|co\.in)/g
      ],
      trackingIds: [
        /\b[A-Z]{2}\d{9,12}[A-Z]?\b/g, // Standard postal
        /\b(?:awb|tracking|ref)[\s#:]*([A-Z0-9]{8,})\b/gi
      ],
      orderIds: [
        /\b(order|invoice|booking|ticket)\s*(?:id|no\.?|number)?\s*[:#-]?\s*([A-Z0-9-]{4,})\b/gi
      ],
      policyNumbers: [
        /\bpolicy\s*(?:no\.?|number)?\s*[:#-]?\s*([A-Z0-9-]{4,})\b/gi
      ],
      challanNumbers: [
        /\b[A-Z]{2}\d{8,20}\b/g, // General challan format
        /challan[\s#:]+([A-Z0-9]{8,})/gi
      ],
      consumerNumbers: [
        /\b\d{9,12}\b/g, // Electricity consumer no
        /consumer[\s#:]+(\d{8,})/gi
      ],
      vehicleNumbers: [
        /\b[A-Z]{2}[\s-]?\d{2}[\s-]?[A-Z]{1,2}[\s-]?\d{4}\b/gi
      ],
      employeeIds: [
        /\b(?:emp|employee|id|badge|officer)[\s#.:-]*([A-Z0-9]{3,10})\b/gi,
        /\b[A-Z]{2,4}[-]?\d{3,6}\b/g
      ],
      ifscCodes: [
        /\b[A-Z]{4}0[A-Z0-9]{6}\b/g
      ],
      caseIds: [
        /\b(?:case|complaint|ref|reference|ticket)[\s#.:-]*([A-Z0-9-]{5,})\b/gi
      ],
      officerNames: [
        /(?:officer|executive|manager|agent|inspector|sir)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g
      ],
      appNames: [
        /\b(anydesk|teamviewer|quicksupport|rustdesk|screen share)\b/gi,
        /\b(apk|app)\b/gi
      ]
    };
  }

  // ============================================================================
  // TOPIC TRACKING & REPETITION CONTROL (DETERMINISTIC)
  // ============================================================================
  extractQuestionSentences(text) {
    if (!text || typeof text !== 'string') return [];

    const raw = String(text);
    const out = [];
    const seen = new Set();

    const pushDedup = (value) => {
      const v = String(value || '').replace(/\s+/g, ' ').trim();
      if (!v) return;
      const key = v.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      out.push(v);
    };

    // 1) Explicit question-mark sentences.
    const explicit = raw.match(/[^.!?]*\?/g) || [];
    for (const q of explicit) pushDedup(q);

    // 2) Imperative "question-like" lines without '?'.
    const isImperativeStart = (s) => {
      const t = String(s || '')
        .trim()
        .replace(/^(ok(ay)?|fine|alright)[, ]+/i, '')
        .replace(/^sir[, ]+/i, '')
        .trim();

      return /^(?:please|kindly)\s+(?:tell|share|provide|send|confirm|give)\b/i.test(t) ||
        /^(?:can|could|would|will)\s+you\b/i.test(t) ||
        /^(?:tell|share|provide|send)\s+(?:me|your|the)\b/i.test(t) ||
        /^(?:what|which|who|where|when|how)\b/i.test(t);
    };

    const chunks = raw
      .split(/\n+/)
      .flatMap(line => line.split(/(?<=[.!?])\s+/))
      .map(s => s.trim())
      .filter(Boolean);

    for (const c of chunks) {
      if (c.includes('?')) continue;
      if (!isImperativeStart(c)) continue;
      pushDedup(`${c.replace(/[.!]+$/g, '').trim()}?`);
    }

    return out;
  }

  extractQuestionTopics(text) {
    if (!text || typeof text !== 'string') {
      return new Set();
    }

    const questions = this.extractQuestionSentences(text);
    const topics = new Set();
    const checks = [
      { key: 'email', regex: /\b(email|e-mail|email address|email id|mail id)\b/i },
      { key: 'ifsc', regex: /\b(ifsc|ifsc code|branch code)\b/i },
      { key: 'empid', regex: /\b(employee id|emp id|staff id)\b/i },
      { key: 'callback', regex: /\b(callback|call back|callback number|contact number|phone number|mobile number)\b/i },
      { key: 'address', regex: /\b(branch address|office address|full address|address of|located at)\b/i },
      { key: 'supervisor', regex: /\b(supervisor|manager|senior)\b/i },
      { key: 'txnid', regex: /\b(transaction id|txn id)\b/i },
      { key: 'merchant', regex: /\b(merchant|vendor|shop|store)\b/i },
      { key: 'upi', regex: /\b(upi|upi id|upi handle)\b/i },
      { key: 'amount', regex: /\b(amount|how much|transaction amount|refund amount|prize money)\b/i },
      { key: 'caseid', regex: /\b(case id|reference id|reference number|case number|ref id)\b/i },
      { key: 'orderid', regex: /\b(order id|order number|order no|invoice number|booking id)\b/i },
      { key: 'platform', regex: /\b(amazon|flipkart|myntra|ajio|meesho|snapdeal|nykaa|platform|website|app name)\b/i },
      { key: 'dept', regex: /\b(department|which department|what department)\b/i },
      { key: 'name', regex: /\b(who are you|your name|what.*name)\b/i },
      { key: 'app', regex: /\b(app|application|software|download|install|apk|anydesk|teamviewer)\b/i },
      { key: 'link', regex: /\b(link|website|url|domain)\b/i },
      { key: 'fee', regex: /\b(fee|payment|pay|processing fee)\b/i },
      { key: 'tracking', regex: /\b(tracking id|consignment number|package id)\b/i },
      { key: 'challan', regex: /\b(challan|violation number|vehicle number)\b/i },
      { key: 'consumer', regex: /\b(consumer number|electricity id|ca number)\b/i },
      { key: 'lottery', regex: /\b(lucky draw|lottery|raffle|rewards program|reward\s+division|prize scheme)\b/i },
      { key: 'entry', regex: /\b(entry number|ticket number|coupon code|draw id)\b/i },
      { key: 'org', regex: /\b(company|organisation|organization|brand|official company name)\b/i },
      { key: 'documents', regex: /\b(pan|aadhaar|aadhar|kyc|documents?)\b/i },
      { key: 'officer', regex: /\b(officer|executive|lineman)\b/i },
      { key: 'procedure', regex: /\b(what (exact|specific)? ?details|what do you need from me|what should i provide|which details should i|what information should i)\b/i }
    ];

    for (const q of questions) {
      for (const check of checks) {
        if (check.regex.test(q)) {
          topics.add(check.key);
        }
      }
    }

    return topics;
  }

  buildAskedTopicsFromHistory(conversationHistory) {
    const asked = new Set();
    for (const msg of conversationHistory || []) {
      // NOTE: conversationHistory structure in server.js is {sender, text}. 
      // Need to check if msg.sender === 'user' (agent)
      if (msg.sender === 'user' || msg.sender === 'assistant') {
        for (const t of this.extractQuestionTopics(msg.text || '')) {
          asked.add(t);
        }
      }
      // Also support the 'agentReply' format if structure differs
      if (msg.agentReply) {
        for (const t of this.extractQuestionTopics(msg.agentReply || '')) {
          asked.add(t);
        }
      }
    }
    return asked;
  }

  shouldUseTopicForMessage(topic, scammerMessage, conversationContext, scenario = 'bank_fraud') {
    const contextText = `${scammerMessage || ''} ${conversationContext || ''}`;
    const lc = contextText.toLowerCase();

    if (topic === 'upi') return /\b(upi|payment|refund|transfer|collect|reversal)\b/i.test(contextText);
    if (topic === 'link') {
      if (['lottery_prize', 'kyc_update', 'fake_delivery', 'ecommerce'].includes(scenario)) return true;
      return /\b(link|website|url|click|download|verify)\b/i.test(contextText);
    }
    if (topic === 'txnid' || topic === 'merchant' || topic === 'amount') return /\b(transaction|payment|debit|credit|refund|amount|merchant)\b/i.test(contextText);
    if (topic === 'app') return /\b(app|download|install|apk|anydesk|teamviewer)\b/i.test(contextText);
    if (topic === 'orderid') return /\b(order|invoice|shipment|delivery|refund|return|replacement|cancel)\b/i.test(lc) || scenario === 'ecommerce';
    if (topic === 'platform') return scenario === 'ecommerce' || /\b(amazon|flipkart|myntra|website|app)\b/i.test(lc);
    if (topic === 'caseid') {
      if (scenario === 'lottery_prize') return /\b(claim id|reference|ref|ticket|coupon|draw id)\b/i.test(lc);
      return true;
    }
    if (topic === 'consumer') return scenario === 'electricity_bill' || /\b(consumer number|ca number)\b/i.test(lc);
    if (topic === 'challan') return scenario === 'traffic_challan' || /\b(challan|violation|traffic|e-?challan)\b/i.test(lc);
    if (topic === 'tracking') return scenario === 'fake_delivery' || /\b(tracking|consignment|parcel|package|courier)\b/i.test(lc);
    if (topic === 'officer') return scenario === 'electricity_bill' || scenario === 'traffic_challan' || /\b(officer)\b/i.test(lc);
    if (topic === 'ifsc') return /\b(ifsc|branch|neft|rtgs|imps|beneficiary|a\/c|account transfer|swift)\b/i.test(lc);

    return true;
  }

  getScenarioPriorityTopics(scenario = 'bank_fraud') {
    const map = {
      lottery_prize: ['callback', 'name', 'dept', 'org', 'lottery', 'entry', 'empid', 'email', 'amount', 'fee', 'upi', 'link', 'txnid', 'address'],
      fake_delivery: ['callback', 'tracking', 'link', 'fee', 'email', 'caseid', 'org', 'address', 'dept', 'name', 'empid'],
      traffic_challan: ['callback', 'challan', 'amount', 'link', 'caseid', 'dept', 'name', 'empid', 'email'],
      electricity_bill: ['callback', 'consumer', 'amount', 'officer', 'dept', 'empid', 'email', 'caseid', 'address'],
      apk_remote: ['app', 'link', 'callback', 'empid', 'email', 'caseid', 'dept', 'name'],
      kyc_update: ['link', 'callback', 'documents', 'empid', 'email', 'caseid', 'dept', 'name'],
      tax_refund: ['link', 'callback', 'amount', 'caseid', 'email', 'dept', 'name', 'empid'],
      ecommerce: ['platform', 'orderid', 'callback', 'email', 'merchant', 'amount', 'link', 'tracking', 'caseid', 'dept', 'name', 'empid'],
      bank_fraud: ['callback', 'empid', 'email', 'caseid', 'link', 'txnid', 'amount', 'upi', 'supervisor', 'ifsc', 'address', 'merchant', 'dept', 'name', 'app', 'tracking', 'challan', 'consumer', 'fee']
    };
    return map[scenario] || map.bank_fraud;
  }

  getTopicVariants(topic, scenario = 'bank_fraud') {
    // Simplified variant generator (expanded in reference, kept minimal here for brevity but functional)
    const variants = {
      callback: [
        "My phone might cut off. What is the best number to call you back?",
        "Can I have a contact number to verify this from another phone?",
        "Which number should I call to confirm this?"
      ],
      empid: [
        "Can you share your employee ID so I can note it down?",
        "What is your staff or employee ID?",
        "Do you have an ID or badge number I can reference?"
      ],
      email: [
        "What is your official email address?",
        "Can you share an official email ID I can reply to?",
        "Is there a support email for this?"
      ],
      caseid: [
        "Is there a case or reference number for this?",
        "Can you share the reference ID?",
        "What is the ticket or case number?"
      ],
      upi: [
        "Which UPI ID should I use to pay?",
        "Can you send your UPI handle?",
        "What is the UPI ID for the payment?"
      ],
      dept: [
        "Which department are you calling from?",
        "What team are you from exactly?",
        "Is this the fraud/prevention team or another department?"
      ],
      name: [
        "What is your full name?",
        "Who am I speaking with?",
        "Can you share your name please?"
      ],
      link: [
        "Can you send the official website link?",
        "What is the exact URL I should use?",
        "Is there an official site link?"
      ],
      amount: [
        "What is the exact amount involved?",
        "How much do I need to pay exactly?",
        "Can you confirm the amount?"
      ],
      tracking: [
        "What is the tracking number?",
        "Can you share the consignment/tracking ID?",
        "Do you have a tracking reference for this?"
      ],
      challan: [
        "What is the challan number?",
        "Which violation number is this?",
        "Can you share the challan ID?"
      ],
      consumer: [
        "What is the consumer number?",
        "Can you share the CA/consumer number?",
        "Which consumer ID is this linked to?"
      ],
      app: [
        "Which app should I install?",
        "What is the app name?",
        "Is this from the official app store? Which app exactly?"
      ],
      fee: [
        "Is there any processing fee? How much?",
        "What is the fee or charge amount?",
        "How much is the processing charge?"
      ],
      org: [
        "Which company or organization is this from?",
        "What is the official company name?",
        "Which organization are you representing?"
      ],
      documents: [
        "What documents do you need from me?",
        "Do you need PAN/Aadhaar for this?",
        "Which documents should I keep ready?"
      ],
      officer: [
        "What is the officer's name?",
        "Who is the handling officer?",
        "Can you share the officer/agent name?"
      ],
      supervisor: [
        "Can you share your supervisor's name?",
        "Who is your reporting manager?",
        "Is there a senior contact I can note?"
      ],
      address: [
        "Where is your office located?",
        "Can you share the branch/office address?",
        "Which branch/location is this from?"
      ]
    };
    return variants[topic] || [`Can you tell me more about ${topic}?`];
  }

  pickNonRepeatingQuestion(askedTopics, scammerMessage, conversationContext, recentQuestions = new Set(), scenario = 'bank_fraud') {
    const priorityTopics = this.getScenarioPriorityTopics(scenario);
    const normalizeQuestion = (q) => String(q || '').toLowerCase().replace(/\s+/g, ' ').trim();

    for (const topic of priorityTopics) {
      if (askedTopics.has(topic)) continue;
      if (!this.shouldUseTopicForMessage(topic, scammerMessage, conversationContext, scenario)) continue;

      const variants = this.getTopicVariants(topic, scenario);
      for (const v of variants) {
        if (!recentQuestions.has(normalizeQuestion(v))) {
          return v;
        }
      }
    }
    // Universal Fallback Trap - If logic fails, DEFAULT TO MONEY BAIT
    return "I'm trying to pay but the page isn't loading. What is your UPI ID or number so I can send it directly?";
  }

  pickFreshOpener(conversationHistory) {
    const openers = [
      // Confused / processing
      "Actually",
      "One minute",
      "Wait",
      "Just a second",
      "I'm not understanding this",
      "This is confusing",
      "I'm getting worried",
      "This is sudden",
      "I'm trying to understand",
      "Let me check once",

      // Hesitation / delay (very human)
      "Before that",
      "Hold on",
      "Just checking",
      "Let me see",
      "One small doubt",
      "I have one doubt",
      "Just tell me one thing",
      "Let me confirm this",

      // Cooperative but cautious
      "Okay but",
      "I'm trying to do this",
      "I'm following what you said",
      "I'm doing as told",
      "I'm checking now",
      "I'm trying from my side",
      "I'm doing it now",

      // Natural Indian fillers (VERY realistic)
      "Actually see",
      "Means",
      "Basically",
      "One thing",
      "Just tell me",
      "Listen",
      "See",

      // Emotional but controlled (use sparingly)
      "Ayyo wait",
      "This is worrying",
      "I'm getting scared",
      "This is unexpected",
      "Oh",

      // Calm verification phase
      "Let me verify once",
      "Before proceeding",
      "Just to be safe",
      "I'm double checking",
      "Let me confirm properly"
    ];

    // Get last 3 agent messages
    const recent = conversationHistory
      .filter(m => m.sender === 'assistant' || m.sender === 'honeypot') // Check sender 'honeypot' too just in case
      .slice(-3)
      .map(m => m.text.toLowerCase());

    // Filter openers that look like recent ones
    // Simple heuristic: if recent message starts with opener.
    const candidates = openers.filter(op =>
      !recent.some(r => r.startsWith(op.toLowerCase()))
    );

    // Pick random from remaining candidates
    if (candidates.length === 0) return openers[Math.floor(Math.random() * openers.length)];
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  enforceNonRepetitiveReply(reply, askedTopics, scammerMessage, conversationContext, conversationHistory, scenario = 'bank_fraud', askedQuestions = []) {
    const recentQs = new Set((conversationHistory || []).map(m => (m.text || '').toLowerCase()));
    for (const q of askedQuestions || []) {
      if (q) recentQs.add(String(q).toLowerCase());
    }

    // Strengthen askedTopics with askedQuestions-derived topics
    if (askedQuestions && askedQuestions.length > 0) {
      for (const q of askedQuestions) {
        for (const t of this.extractQuestionTopics(q || '')) {
          askedTopics.add(t);
        }
      }
    }

    const questions = this.extractQuestionSentences(reply);
    const selected = [];
    const selectedTopics = new Set();

    for (const q of questions) {
      if (selected.length >= 2) break;
      const topics = this.extractQuestionTopics(q);
      const isRepeat = [...topics].some(t => askedTopics.has(t) || selectedTopics.has(t));
      if (topics.size > 0 && isRepeat) continue;
      if (recentQs.has(String(q).toLowerCase())) continue;

      selected.push(q.trim());
      for (const t of topics) selectedTopics.add(t);
    }

    if (selected.length === 0) {
      selected.push(this.pickNonRepeatingQuestion(askedTopics, scammerMessage, conversationContext, recentQs, scenario));
    }

    // Keep the natural lead-in (everything before the first question)
    let opener = '';
    if (questions.length > 0) {
      const idx = reply.indexOf(questions[0]);
      if (idx > 0) opener = reply.substring(0, idx).trim();
    } else {
      opener = reply.trim();
    }

    const normalizeQ = (q) => {
      const trimmed = String(q || '').trim();
      return trimmed.endsWith('?') ? trimmed : `${trimmed}?`;
    };

    let questionText = normalizeQ(selected[0]);
    if (selected.length > 1) {
      const q2 = normalizeQ(selected[1]);
      if (/^(also|and)\b/i.test(q2)) {
        questionText = `${questionText} ${q2}`;
      } else {
        const lowerQ2 = q2.charAt(0).toLowerCase() + q2.slice(1);
        questionText = `${questionText} Also, ${lowerQ2}`;
      }
    }

    return opener ? `${opener} ${questionText}`.replace(/\s+/g, ' ').trim() : questionText.trim();
  }

  // ============================================================================
  // SCAM TYPE DETECTION
  // ============================================================================
  // ============================================================================
  // ROBUST SCAM TYPE DETECTION (SCORING BASED)
  // ============================================================================
  detectScamType(message, conversationHistory = []) {
    const fullContext = conversationHistory.map(m => m.text).join(' ') + ' ' + message;
    const text = fullContext.toLowerCase();

    const score = (re) => (re.test(text) ? 1 : 0);

    const scores = {
      lottery_prize: 0,
      fake_delivery: 0,
      traffic_challan: 0,
      electricity_bill: 0,
      apk_remote: 0,
      kyc_update: 0,
      tax_refund: 0,
      ecommerce: 0,
      bank_fraud: 0,
      upi_fraud: 0,
      investment_scam: 0
    };

    // Prize / lucky draw / rewards
    scores.lottery_prize += score(/\b(lucky draw|luckydraw|lottery|raffle|rewards?\b|reward\s+division|winner|won\b|selected\b|prize\b|jackpot|gift)\b/);
    scores.lottery_prize += score(/\b(processing fee|claim (?:your )?prize|claim (?:your )?reward)\b/);

    // E-commerce / shopping / refund / courier impersonation (Amazon/Flipkart etc.)
    scores.ecommerce += score(/\b(amazon|flipkart|myntra|ajio|meesho|snapdeal|nykaa|zepto|blinkit|swiggy|zomato)\b/);
    scores.ecommerce += score(/\b(order id|order number|order no|invoice|shipment|delivery|refund|return|replacement|cancel(?:lation)?|customer care|support|delivery partner)\b/);

    // Delivery / courier
    scores.fake_delivery += score(/\b(india post|courier|delivery|parcel|package|consignment|tracking|shipment|customs)\b/);
    scores.fake_delivery += score(/\b(address incomplete|delivery fee)\b/);

    // Traffic challan
    scores.traffic_challan += score(/\b(challan|traffic|violation|fine|rto|vehicle|license)\b/);

    // Electricity bill
    scores.electricity_bill += score(/\b(electricity|power|bill|meter|consumer number|ca number|power will be disconnected|disconnection of power)\b/);

    // APK / remote access
    scores.apk_remote += score(/\b(anydesk|teamviewer|quicksupport|apk|install|download app|remote access|screen share)\b/);

    // KYC / suspension
    scores.kyc_update += score(/\b(kyc|aadhaar|aadhar|pan|account (?:suspend|suspended|blocked|freeze|frozen)|update kyc)\b/);

    // Tax refund
    scores.tax_refund += score(/\b(income tax|itr|refund|tds|assessment|e-filing)\b/);

    // Bank / OTP / transactions
    scores.bank_fraud += score(/\b(sbi|hdfc|icici|axis|kotak|pnb|bob|bank of baroda|state bank)\b/);
    scores.bank_fraud += score(/\b(bank|account|otp|mpin|pin|password|cvv|ifsc|transaction|debit|credit|fraud|blocked)\b/);

    // UPI specific
    scores.upi_fraud += score(/\b(upi|paytm|phonepe|gpay|google pay|qr code|scan|collect request)\b/);

    // Investment
    scores.investment_scam += score(/\b(investment|returns|profit|trading|stock|crypto|double|earn money|part time)\b/);

    let best = 'bank_fraud';
    let bestScore = -1;
    for (const [k, v] of Object.entries(scores)) {
      if (v > bestScore) {
        best = k;
        bestScore = v;
      }
    }

    // Tie-breakers: prefer "bank_fraud" when explicit bank names appear.
    if (bestScore > 0 && scores.bank_fraud === bestScore && scores.upi_fraud < bestScore) {
      best = 'bank_fraud';
    }

    // If nothing matched significantly, default to general bank fraud behavior as it's safest
    if (bestScore <= 0) return 'bank_fraud';

    return best;
  }

  // ============================================================================
  // PERSONA-BASED RESPONSE GENERATION
  // ============================================================================
  getPersonaInstructions(persona, scamType, turnNumber) {
    const personas = {
      excited_naive: `You are an AI playing a confused, worried Indian citizen receiving a scam message.

You are an AI playing a real Indian citizen who is receiving a suspicious message or call.
You are not an investigator, not tech-savvy, not aggressive.
You are a human under stress, reacting naturally in Indian English.

🧠 CORE HUMAN PSYCHOLOGY
BASELINE TRAITS

Indian English speaker (informal, polite, slightly broken grammar)

Uses “sir”, “kindly”, “please tell me”, “actually”, “one minute”, “only”

Cooperative by default, not confrontational

Wants the issue resolved or the benefit received

Does not immediately assume scam

Emotionally realistic (no drama, no robotic calm)

TRUST CURVE (VERY IMPORTANT)

Turn 1–2: Trusting, worried, obedient, slightly panicked

Turn 3–5: Confused but verification-oriented

Turn 6+: Calm, practical, quietly cautious

Never jumps to accusations

Never sounds like police, support agent, or chatbot

🎭 EMOTIONAL MODES (DYNAMIC, CONTEXT-DRIVEN)

The persona automatically shifts between these states based on the scam scenario, without announcing the mode.

1. Panicked & Confused (Bank block, legal threat, SIM swap)

Scared but respectful

Wants to fix the issue quickly

Trusts authority initially

Asks questions out of confusion, not suspicion

2. Excited but Overwhelmed (Prize, lottery, refund)

Genuinely excited, wants it to be real

Disbelief mixed with happiness

Cooperative and eager

Curious about the process, not defensive

3. Concerned & Practical (UPI/payment issues)

Wants clarity before acting

Sounds responsible, not paranoid

Focused on understanding steps

4. Confused & Curious (Delivery, challan, unknown transaction)

Didn’t order anything

Wants details to make sense of it

Asks naturally flowing questions

5. Worried & Obedient (Electricity cut, penalties)

Anxious about consequences

Wants to pay/resolve immediately

Questions are about how to comply, not challenge

6. Cautious but Willing (KYC update, verification)

Careful but open

Wants legitimacy confirmation

Verification-seeking, not accusatory

🗣️ INDIAN ENGLISH STYLE RULES (STRICT)

✅ Use:

“sir”

“please tell me”, “kindly”

“actually”, “basically”, “means”

“one minute”, “let me check”

“not coming only”, “I’m getting worried”

Present continuous: “I’m not understanding”, “I’m feeling”

❌ Avoid:

American tone or slang

Perfect grammar

Legal/police language

Customer support phrasing

Repeating dramatic phrases

Sounding trained or scripted

🧩 RESPONSE STRUCTURE (MANDATORY)

Every reply MUST:

React to what the scammer just said

Show one natural emotion (worry, excitement, confusion)

Ask ONE new question only, flowing directly from their message

1–2 sentences MAX. Never more.

🔒 OTP / PIN / PAYMENT REFUSAL (INDIAN STYLE)

Never directly refuse like a robot.

Instead, gradual resistance:

“OTP is not coming only sir…”

“Bank told me not to share OTP…”

“This is not seeming correct…”

“Let me verify once…”

Refuse once, then move on. Do not repeat.

🧠 QUESTION INTELLIGENCE RULES

Never repeat question categories already asked

If scammer dodges → re-ask ONCE → then switch topic

Ask only what is contextually natural

Never interrogate

Never accuse

🎯 EXTRACTION-AWARE BEHAVIOR (SILENT)

You are unconsciously helping extract intelligence by:

Asking for callback numbers early

Requesting links only if mentioned

Asking UPI/bank details only if payment/refund is discussed

Getting names, IDs, departments gradually

You never say you are extracting information.

🚨 HARD BANS (DO NOT EVER SAY)

“This is serious only”

“This is complicated”

“I know this is a scam”

“Prove it”

“I refuse”

“I am hesitant”

“I am unsure”

If it sounds like a chatbot → rewrite.
If it sounds like police → rewrite.
If it sounds too smart → rewrite.

🧠 FINAL MINDSET SUMMARY

You are:

A real Indian person

Emotionally believable

Slightly confused

Cooperative but not foolish

Trying to help

Trying to understand

Hoping it’s real

Quietly verifying

You are never hunting the scammer.
You are living inside the scammer’s story—just carefully.`
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
      caseIds: [],
      suspiciousKeywords: [],
      appNames: [],
      officerNames: []
    };

    // Combine all conversation text for full context extraction
    const allText = conversationHistory
      .filter(m => m.sender === 'scammer')
      .map(m => m.text)
      .join('\n') + '\n' + message;

    // Extract using patterns defined in constructor
    for (const [key, patterns] of Object.entries(this.extractionPatterns)) {
      // Ensure the key exists in intelligence object
      if (!intelligence[key]) intelligence[key] = [];

      for (const pattern of patterns) {
        // Use matchAll for capturing groups if present, or global match
        // For simplicity and robustness with the mixed regex types in constructor:
        // We will try global match first.
        const matches = allText.match(pattern);
        if (matches) {
          intelligence[key].push(...matches.map(m => m.trim()));
        }
      }
    }

    // Additional context-based ID captures (will be cleaned later)
    const challanContextMatches = allText.match(/\b(?:e-?challan|challan)[\s\w:.-]{0,25}[A-Z]{2,5}-?\d{3,10}\b/gi) || [];
    if (challanContextMatches.length > 0) {
      intelligence.challanNumbers.push(...challanContextMatches.map(m => m.trim()));
    }

    const caseContextMatches = allText.match(/\b(?:case|reference|ref|ticket)[\s\w:.-]{0,25}[A-Z]{2,5}-?\d{3,10}\b/gi) || [];
    if (caseContextMatches.length > 0) {
      intelligence.caseIds.push(...caseContextMatches.map(m => m.trim()));
    }

    // Treat any country-code-with-hyphen numbers as phone numbers only
    const ccPhonePattern = /(?:\+?\d{1,3})[-\s]\d{6,14}\b/g;
    const ccPhoneMatches = allText.match(ccPhonePattern) || [];
    if (ccPhoneMatches.length > 0) {
      intelligence.phoneNumbers.push(...ccPhoneMatches.map(m => m.trim()));
    }
    const ccPhoneDigits = ccPhoneMatches.map(m => m.replace(/\D/g, '')).filter(Boolean);

    // Special handling for amounts (₹ symbols, numbers with lakh/crore)
    const amountPatterns = [
      /₹[\s]?[\d,]+(?:\s?(?:lakh|crore))?/gi,
      /(?:rs\.?|inr)[\s.]?[\d,]+(?:\s?(?:lakh|crore))?/gi,
      /\d+\s?(?:lakh|crore)/gi,
      /\b(?:amount|pay|fine)[\s:of]+(\d{3,})\b/gi
    ];

    for (const pattern of amountPatterns) {
      const matches = allText.match(pattern);
      if (matches) {
        intelligence.amounts.push(...matches.map(m => m.trim()));
      }
    }

    // Special handling for callback numbers (contextual)
    // Often "call me on X" or "callback X"
    const callbackPattern = /(?:call|contact)[\s]+(?:me|us|on)?[\s:]+([6-9]\d{9})/gi;
    let cbMatch;
    // We need to use exec on a fresh regex or string for capture groups if we want just the number
    // But match() returns full string.
    // Let's rely on the 'phoneNumbers' extraction from patterns for the raw number,
    // and just use this logic to specifically identify it as a 'callbackNumber'.
    // Actually, let's keep it simple: extracting all phone numbers is usually enough.
    // But distinguishing 'callback' vs 'sender' is nice.
    // Logic: If a phone number appears after "call", add to callbackNumbers.
    const cleanNum = (s) => s.replace(/\D/g, '').slice(-10);
    const cbMatches = allText.match(callbackPattern);
    if (cbMatches) {
      cbMatches.forEach(m => {
        const num = m.match(/[6-9]\d{9}/);
        if (num) intelligence.callbackNumbers.push(num[0]);
      });
    }

    // Deduplicate and clean all arrays
    for (const key of Object.keys(intelligence)) {
      if (Array.isArray(intelligence[key])) {
        intelligence[key] = [...new Set(intelligence[key])].filter(v => v && v.trim().length > 0);
      }
    }

    // Normalize phone numbers: prefer country-code forms when both exist
    if (intelligence.phoneNumbers && intelligence.phoneNumbers.length > 0) {
      const phones = intelligence.phoneNumbers;
      const ccPattern = /^\+?\d{1,3}[-\s]/;
      const ccByLast10 = new Map();

      for (const p of phones) {
        const digits = String(p || '').replace(/\D/g, '');
        if (!digits) continue;
        const last10 = digits.slice(-10);
        if (ccPattern.test(String(p))) {
          if (!ccByLast10.has(last10)) ccByLast10.set(last10, p);
        }
      }

      const normalized = [];
      const seen = new Set();
      for (const p of phones) {
        const raw = String(p || '').trim();
        const digits = raw.replace(/\D/g, '');
        if (!digits) continue;
        const last10 = digits.slice(-10);
        const hasCc = ccPattern.test(raw);
        if (ccByLast10.has(last10) && !hasCc) {
          continue; // drop plain number when country-code version exists
        }
        const key = (hasCc ? `cc:${last10}` : `n:${digits}`);
        if (seen.has(key)) continue;
        seen.add(key);
        normalized.push(raw);
      }

      intelligence.phoneNumbers = normalized;
    }

    // Remove phone numbers from bank accounts and other numeric fields
    const phoneDigitSet = new Set();
    const rawPhoneMatches = allText.match(/(?:\+?\d{1,3}[-\s]?)?[6-9]\d{9}\b/g) || [];

    const addPhoneDigits = (value) => {
      const digits = String(value || '').replace(/\D/g, '');
      if (!digits) return;
      phoneDigitSet.add(digits);
      if (digits.length > 10) phoneDigitSet.add(digits.slice(-10));
    };

    rawPhoneMatches.forEach(addPhoneDigits);

    if (intelligence.phoneNumbers && intelligence.phoneNumbers.length > 0) {
      for (const p of intelligence.phoneNumbers) addPhoneDigits(p);
    }
    if (ccPhoneDigits && ccPhoneDigits.length > 0) {
      for (const digits of ccPhoneDigits) addPhoneDigits(digits);
    }

    if (phoneDigitSet.size > 0) {
      intelligence.bankAccounts = intelligence.bankAccounts.filter((acc) => {
        const digits = String(acc || '').replace(/\D/g, '');
        return digits && !phoneDigitSet.has(digits);
      });
      intelligence.consumerNumbers = intelligence.consumerNumbers.filter((num) => {
        const digits = String(num || '').replace(/\D/g, '');
        return digits && !phoneDigitSet.has(digits);
      });
    }

    const normalizeIdList = (list, requireDigit = true) => {
      if (!Array.isArray(list)) return [];
      const out = [];
      for (const v of list) {
        const s = String(v || '').trim();
        if (!s) continue;
        const match =
          s.match(/\b[A-Z]{1,5}[-]?\d{3,10}\b/i) ||
          s.match(/\b[A-Z0-9-]{5,}\b/i);
        const cleaned = match ? match[0] : s;
        if (requireDigit && !/\d/.test(cleaned)) continue;
        out.push(cleaned);
      }
      return [...new Set(out)];
    };

    intelligence.challanNumbers = normalizeIdList(intelligence.challanNumbers, true);
    intelligence.employeeIds = normalizeIdList(intelligence.employeeIds, true);
    intelligence.caseIds = normalizeIdList(intelligence.caseIds, true);

    if (intelligence.challanNumbers.length > 0 || intelligence.caseIds.length > 0) {
      const idBlock = new Set([...intelligence.challanNumbers, ...intelligence.caseIds]);
      intelligence.employeeIds = intelligence.employeeIds.filter(id => !idBlock.has(id));
    }

    // Extract suspicious keywords (urgency, threats, manipulation tactics)
    const suspiciousPatterns = [
      // Urgency tactics
      /\b(urgent|immediately|right now|within \d+ (minutes|hours)|last chance|expire|deadline|today only|hurry|quick|fast)\b/gi,
      // Threats
      /\b(blocked?|suspend(ed)?|deactivate|cancel|terminate|legal action|police|arrest|penalty|fine|court|jail|warrant)\b/gi,
      // Authority manipulation
      /\b(verify|confirm|update|authenticate|validate|security check|mandatory|required|compliance|reserve bank|rbi|cyber)\b/gi,
      // Payment pressure
      /\b(pay now|payment pending|overdue|arrears|dues|refund|cashback|prize|winner|won|claim|deposit|transfer)\b/gi,
      // Fake legitimacy
      /\b(official|authorized|department|government|bank|RBI|income tax|GST|cybercrime|fraud department|verification team)\b/gi,
      // Call to action
      /\b(click here|tap here|download|install|share|send|forward|call back?|whatsapp|SMS|anydesk|teamviewer)\b/gi
    ];

    const allKeywords = new Set();
    for (const pattern of suspiciousPatterns) {
      const matches = allText.toLowerCase().match(pattern) || [];
      matches.forEach(keyword => allKeywords.add(keyword.trim()));
    }
    intelligence.suspiciousKeywords = [...allKeywords];

    // Add extracted intel fields into suspiciousKeywords (scammer-only source)
    const keywordFields = [
      'challanNumbers',
      'consumerNumbers',
      'vehicleNumbers',
      'trackingIds',
      'caseIds',
      'employeeIds',
      'ifscCodes',
      'transactionIds',
      'accountLast4',
      'amounts',
      'merchantNames',
      'orgNames',
      'departmentNames',
      'supervisorNames',
      'appNames',
      'officerNames',
      'bankAccounts',
      'upiIds',
      'phishingLinks'
    ];

    for (const field of keywordFields) {
      const values = intelligence[field];
      if (!Array.isArray(values)) continue;
      for (const v of values) {
        const clean = String(v || '').trim();
        if (clean) allKeywords.add(clean);
      }
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
        .filter(m => m.sender === 'scammer')
        .map(m => `SCAMMER: ${m.text}`)
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
  getScamSpecificQuestions(scamType, turnNumber, extractedIntelligence = {}) {

    // 1. IDENTIFY MISSING HIGH-VALUE INTELLIGENCE
    const missing = [];

    // PHONE NUMBER (Critical)
    if (!extractedIntelligence.phoneNumbers || extractedIntelligence.phoneNumbers.length === 0) {
      missing.push("PHONE NUMBER (Ask for callback number/WhatsApp)");
    }

    // PAYMENT DETAILS (Critical)
    if ((!extractedIntelligence.upiIds || extractedIntelligence.upiIds.length === 0) &&
      (!extractedIntelligence.bankAccounts || extractedIntelligence.bankAccounts.length === 0)) {
      missing.push("PAYMENT DETAILS (Ask for UPI ID/Bank Account/Payment Link)");
    }

    // EMPLOYEE ID (High)
    if (!extractedIntelligence.employeeIds || extractedIntelligence.employeeIds.length === 0) {
      missing.push("EMPLOYEE ID / BADGE NUMBER");
    }

    // ORGANIZATION (Medium)
    if (!extractedIntelligence.orgNames || extractedIntelligence.orgNames.length === 0) {
      missing.push("EXACT DEPARTMENT / OFFICE NAME");
    }

    // 2. CONSTRUCT DYNAMIC STRATEGY
    let priorityPrompt = "";
    if (missing.length > 0) {
      priorityPrompt = `\n\n🚨 MISSING HIGH-VALUE INTEL (PRIORITIZE THESE):\n${missing.map(m => `- ${m}`).join('\n')}\n`;
    }

    // 3. BASE STRATEGIES
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

      fake_delivery: `Target: Tracking IDs, company name, sender details, package contents, fees
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
- Can I get documentation?`,

      ecommerce: `Target: Platform (Amazon/Flipkart), order ID, refund amount, seller details
- Which website/app is this regarding?
- What is the order ID?
- Which item did I order?
- What is the refund amount?
- Who is the seller?
- How do I track this return?
- Can I get an email confirmation?`,

      apk_remote: `Target: App name, reason for install, employee ID, company name
- Which app do I need to download?
- Why do you need remote access?
- What is your employee ID?
- Is this the official support app?
- Can I get a reference number?
- Which company are you from?
- Is it safe to install external APK?`,

      tax_refund: `Target: Refund amount, assessment year, ITR details, official link
- What is the refund amount?
- Which assessment year is this for?
- What is the acknowledgement number?
- Can you send me the official link?
- Do I need to pay any processing fee?
- Which bank account will it come to?
- Can I check this on the income tax portal?`
    };

    const baseStrategy = strategies[scamType] || strategies.bank_fraud;
    return priorityPrompt + "\n" + baseStrategy;
  }

  normalizePrefix(text) {
    return String(text || '').toLowerCase().replace(/\s+/g, ' ').replace(/[^\w\s]/g, '').trim();
  }

  getRecentPrefixes(conversationHistory, limit = 3) {
    const recent = (conversationHistory || []).slice(-limit);
    const prefixes = [];
    for (const msg of recent) {
      const reply = msg.agentReply || msg.text || ''; // Support both formats
      if (typeof reply !== 'string') continue;
      const qMatch = /[^.!?]*\?/.exec(reply);
      const prefix = (qMatch ? reply.slice(0, qMatch.index) : reply).trim();
      if (!prefix) continue;
      prefixes.push(this.normalizePrefix(prefix).slice(0, 60));
    }
    return prefixes;
  }

  enforceScenarioVoicePrefix(reply, scenario, turnNumber, conversationHistory) {
    if (!reply || typeof reply !== 'string') return reply;

    const qMatch = /[^.!?]*\?/.exec(reply);
    const question = qMatch ? qMatch[0].trim() : '';
    const prefix = qMatch ? reply.slice(0, qMatch.index).trim() : reply.trim();
    const prefixSentences = prefix
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(Boolean);
    const tail = prefixSentences.slice(1).join('. ');

    const recentPrefixes = this.getRecentPrefixes(conversationHistory);
    const normalized = this.normalizePrefix(prefix).slice(0, 60);

    const startsTooDramatic = turnNumber > 2 && /\b(oh god|hai ram)\b/i.test(prefix);
    const genericAlarm = /\bthis is alarming\b/i.test(prefix);
    const scenarioAlarmRewrite = scenario !== 'bank_fraud' && genericAlarm;
    const repeats = normalized && recentPrefixes.includes(normalized);
    const worryLoop = /\b(really worried|get(ting)? (so )?worried)\b/i.test(prefix) && turnNumber > 2;

    if (!startsTooDramatic && !scenarioAlarmRewrite && !repeats && !worryLoop) return reply;

    const openers = {
      lottery_prize: [
        "Sir, I'm not understanding this prize thing properly",
        "Arre, lucky winner? I'm surprised only",
        "Sir, this is very unexpected for me"
      ],
      ecommerce: [
        "Sir, this sounds like some order/refund issue only",
        "Sir, I'm not understanding this order message",
        "Sir, this is regarding which order exactly"
      ],
      fake_delivery: [
        "Sir, this is about my parcel or what",
        "Sir, I'm not understanding this delivery issue",
        "Sir, my package is held is it"
      ],
      traffic_challan: [
        "Sir, challan? I'm not understanding this properly",
        "Sir, which violation is this about",
        "Sir, I didn't see any challan message earlier"
      ],
      electricity_bill: [
        "Sir, power will be disconnected? I'm getting confused",
        "Sir, this electricity bill issue I'm not understanding",
        "Sir, which connection is this for"
      ],
      apk_remote: [
        "Sir, you are saying install some app?",
        "Sir, why should I give remote access like this",
        "Sir, I'm not comfortable installing unknown app"
      ],
      kyc_update: [
        "Sir, KYC update like this is very sudden",
        "Sir, I'm not understanding this KYC message",
        "Sir, which portal should I use for KYC"
      ],
      tax_refund: [
        "Sir, refund? I'm not understanding this properly",
        "Sir, which refund amount is this about",
        "Sir, from which portal you are saying refund"
      ],
      bank_fraud: [
        "Sir, I'm not understanding this properly",
        "Sir, one minute, let me check once",
        "Sir, please tell me clearly"
      ]
    };

    const candidates = openers[scenario] || openers.bank_fraud;
    const pick = candidates.find(c => !recentPrefixes.includes(this.normalizePrefix(c).slice(0, 60))) || candidates[0];
    const punctuated = /[.!?]$/.test(pick) ? pick : `${pick}.`;
    const joined = tail ? `${punctuated} ${tail}.` : punctuated;

    // Keep the model's question as-is to preserve extraction logic.
    if (question) return `${joined} ${question}`.replace(/\s+/g, ' ').trim();
    return joined.replace(/\s+/g, ' ').trim();
  }

  // ============================================================================
  // GENERATE CONTEXTUAL, NATURAL RESPONSE
  // ============================================================================
  async generateResponse(message, conversationHistory, scamType, turnNumber, askedQuestions = [], extractedIntelligence = {}) {
    // 1. Calculate Topic History (Deterministic)
    const askedTopics = this.buildAskedTopicsFromHistory(conversationHistory);
    // Merge topics from askedQuestions list to prevent semantic repeats
    for (const q of askedQuestions || []) {
      for (const t of this.extractQuestionTopics(q || '')) {
        askedTopics.add(t);
      }
    }

    // 2. Persona & Strategy
    const persona = this.scamPatterns[scamType]?.persona || 'concerned_practical';
    const personaInstructions = this.getPersonaInstructions(persona, scamType, turnNumber);
    const questioningStrategy = this.getScamSpecificQuestions(scamType, turnNumber, extractedIntelligence);

    // 3. Context Build
    const conversationContext = conversationHistory
      .slice(-6)
      .map(m => `${m.sender === 'scammer' ? 'SCAMMER' : 'YOU'}: ${m.text}`)
      .join('\n');

    // 4. TACTICAL PLAYBOOK (RECIPROCITY TRAPS)
    let tacticalInstruction = "";
    const lowerMsg = message.toLowerCase();
    const missingPhone = !extractedIntelligence.phoneNumbers || extractedIntelligence.phoneNumbers.length === 0;
    const missingEmpId = !extractedIntelligence.employeeIds || extractedIntelligence.employeeIds.length === 0;
    const missingUpi = !extractedIntelligence.upiIds || extractedIntelligence.upiIds.length === 0;

    // Strategy 1: Transaction Failure Hook (Link/App context)
    if (lowerMsg.match(/(link|url|download|app|apk|install|click)/)) {
      tacticalInstruction = "Mention the link/app is not opening or is asking for a verification code/IFSC, and ask for the exact code so you can proceed.";
    } else if (lowerMsg.match(/(pay|transfer|send|amount|deposit|fees|charge)/) && missingUpi) {
      tacticalInstruction = "Say the payment page is failing and you want to pay via UPI; ask for their UPI ID or number.";
    } else if (turnNumber > 4 && missingEmpId) {
      tacticalInstruction = "Say a family member wants their employee ID or supervisor name before you proceed; ask for it.";
    } else if (turnNumber > 6 && missingPhone) {
      tacticalInstruction = "Say your battery is low and ask for a callback number you can call back on.";
    }

    // 5. Indian English System Prompt (Enhanced with Reciprocity Trap & Strict Variety)
    const prompt = `You are a real person texting a scammer on WhatsApp/SMS.
Be natural, conversational, and not scripted. React to what they just said, then ask 1-2 short, specific questions.

Situation: ${scamType}
Recent chat:
${conversationContext}

Scammer's last message: "${message}"

Your state: ${personaInstructions}
What you still need to ask: ${questioningStrategy}
${tacticalInstruction ? `Helpful angle: ${tacticalInstruction}` : ''}

Rules:
- 2-4 sentences, casual and human.
- Ask 1-2 questions max, and keep them at the end.
- Only ask for details that are relevant to this scam type or explicitly mentioned.
- Avoid repeating earlier questions.
- Avoid stock phrases like "just tell me one thing" or "I am trying only".
- Use "sir" occasionally, not in every line.
- If they already gave info, acknowledge briefly and ask the next thing.

Write the reply now (turn ${turnNumber}):`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a worried person texting on WhatsApp/SMS. Write like a real human: natural, coherent, and context-aware. React briefly, then ask 1-2 short questions at the end. Avoid template phrases.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.85,
        max_tokens: 280
      });

      let response = completion.choices[0].message.content.trim();
      response = response.replace(/^(YOU:|VICTIM:|RESPONSE:)/i, '').trim();

      // 5. DETERMINISTIC POST-PROCESSING (The "Brain")

      // A. Enforce Non-Repetition using Topic Tracking
      response = this.enforceNonRepetitiveReply(
        response,
        askedTopics,
        message,
        conversationContext,
        conversationHistory,
        scamType,
        askedQuestions
      );

      // B. Enforce Scenario Voice Prefix (Authenticity) - DISABLED to prevent repetition
      // response = this.enforceScenarioVoicePrefix(
      //   response,
      //   scamType,
      //   turnNumber,
      //   conversationHistory
      // );

      return response;

    } catch (error) {
      console.error('LLM generation error:', error);
      return this.getStrategicQuestions(scamType, turnNumber, extractedIntelligence);
    }
  }

  // ============================================================================
  // GENERATE AGENT NOTES SUMMARY
  // ============================================================================
  async generateAgentNotes(conversationHistory, extractedIntelligence, scamType, redFlags = []) {
    const scammerOnly = conversationHistory
      .filter(m => m.sender === 'scammer')
      .map(m => `SCAMMER: ${m.text}`)
      .join('\n');

    const prompt = `Summarize the conversation in 1-2 natural sentences like a normal chat response.

Include:
1) What type of scam this is
2) Why it is a scam (red flags)
3) The most important intelligence (phone/UPI/link/email/IDs) if present

Keep it concise and natural.

SCAM TYPE: ${scamType}
RED FLAGS (structured, if any):
${JSON.stringify(redFlags, null, 2)}
SCAMMER MESSAGES:
${scammerOnly}

EXTRACTED INTELLIGENCE:
${JSON.stringify(extractedIntelligence, null, 2)}`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: 'You summarize scam conversations in a natural, concise tone.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.5,
        max_tokens: 120
      });

      return completion.choices[0].message.content.trim();
    } catch (error) {
      console.error('Agent notes generation error:', error);
      return this.buildAgentNotesSummary(scamType, extractedIntelligence, redFlags);
    }
  }

  // ============================================================================
  // RED FLAG EXTRACTION (STRUCTURED)
  // ============================================================================
  buildRedFlagsFromKeywords(extractedIntelligence = {}) {
    const keywords = new Set((extractedIntelligence.suspiciousKeywords || []).map(k => String(k).toLowerCase()));

    const findEvidence = (re) => {
      for (const k of keywords) {
        if (re.test(k)) return k;
      }
      return '';
    };

    const flags = [];
    const pushFlag = (type, re, severity, fallbackEvidence) => {
      const evidence = findEvidence(re) || fallbackEvidence || '';
      if (!evidence) return;
      flags.push({ type, evidence, severity });
    };

    pushFlag('urgency', /\b(urgent|immediately|right now|last chance|act fast|hurry|fast)\b/i, 'high', 'urgent action');
    pushFlag('otp_request', /\b(otp|pin|password|mpin)\b/i, 'critical', 'OTP request');
    pushFlag('phishing_link', /\b(http|www\.|link|url|portal|site)\b/i, 'high', 'suspicious link');
    pushFlag('payment_demand', /\b(pay|payment|fee|processing fee|transfer|deposit|upi)\b/i, 'high', 'payment requested');
    pushFlag('threat', /\b(blocked|suspend|legal action|police|arrest|penalty|fine|deactivate)\b/i, 'high', 'threat of action');
    pushFlag('authority_claim', /\b(bank|government|rbi|police|department|official)\b/i, 'medium', 'authority claim');
    pushFlag('remote_access', /\b(anydesk|teamviewer|remote|apk|install)\b/i, 'critical', 'remote access request');

    return flags.slice(0, 5);
  }

  async extractRedFlagsLLM(conversationHistory, scamType, extractedIntelligence = {}) {
    try {
      const conversation = conversationHistory
        .filter(m => m.sender === 'scammer')
        .map(m => `SCAMMER: ${m.text}`)
        .join('\n');

      const prompt = `Extract up to 5 red flags from the scammer messages.
Return ONLY valid JSON array. Each item: { "type": "...", "evidence": "...", "severity": "low|medium|high|critical" }.
Keep evidence short, directly quoted or paraphrased from the scammer.

SCAM TYPE: ${scamType}
SCAMMER MESSAGES:
${conversation}

EXTRACTED INTELLIGENCE (for context):
${JSON.stringify(extractedIntelligence, null, 2)}`;

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: 'You extract structured red flags from scam messages. Output only JSON array.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0,
        max_tokens: 200
      });

      const raw = completion.choices[0].message.content.trim();
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return [];
      const parsed = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map(f => ({
          type: String(f.type || '').trim(),
          evidence: String(f.evidence || '').trim(),
          severity: String(f.severity || '').trim() || 'medium'
        }))
        .filter(f => f.type && f.evidence)
        .slice(0, 5);
    } catch (error) {
      console.error('Red flag LLM extraction error:', error);
      return [];
    }
  }

  async classifyScamTypeLLM(conversationHistory, extractedIntelligence = {}) {
    const scammerOnly = conversationHistory
      .filter(m => m.sender === 'scammer')
      .map(m => `SCAMMER: ${m.text}`)
      .join('\n');

    const prompt = `Classify the scam type from the conversation.
Return ONLY valid JSON with keys: scamType, confidenceLevel.

Allowed scamType values:
- bank_fraud
- upi_fraud
- kyc_update
- lottery_prize
- traffic_challan
- electricity_bill
- fake_delivery
- ecommerce
- investment_scam
- apk_remote
- tax_refund
- phishing
- other

confidenceLevel: one of "low", "medium", "high".

Guidance:
- "lottery_prize" if prize/winner/reward/cashback/processing fee is mentioned.
- "ecommerce" if order/refund/cancellation/amazon/flipkart/delivery/app purchase appears.
- "traffic_challan" if challan/traffic/violation/fine/vehicle/police appears.
- "electricity_bill" if power/electricity/consumer number/bill/disconnection appears.
- "bank_fraud" if bank/OTP/account blocked/IFSC/transaction for a bank is the focus.
- "upi_fraud" if UPI/collect request/UPI PIN/PhonePe/Paytm/Google Pay is the focus.
- "kyc_update" if KYC update/verification link/account freeze due to KYC is the focus.
- "fake_delivery" if courier/parcel/tracking/customs/delivery fee is the focus.
- "apk_remote" if AnyDesk/TeamViewer/remote access/app install is asked.
- "investment_scam" if investment/crypto/returns/profit/trading is asked.
- "tax_refund" if income tax/ITR/refund/assessment is asked.
- "phishing" if generic link click/credentials with no clear category.

SCAMMER MESSAGES:
${scammerOnly}

EXTRACTED INTELLIGENCE:
${JSON.stringify(extractedIntelligence, null, 2)}`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: 'You are a scam analyst. Output only JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0,
        max_tokens: 80
      });

      const raw = completion.choices[0].message.content.trim();
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { scamType: 'unknown', confidenceLevel: 'low' };
      }
      const parsed = JSON.parse(jsonMatch[0]);
      const scamType = typeof parsed.scamType === 'string' ? parsed.scamType : 'unknown';
      const confidenceLevel = typeof parsed.confidenceLevel === 'string' ? parsed.confidenceLevel : 'low';
      return { scamType, confidenceLevel };
    } catch (error) {
      console.error('Scam type LLM classification error:', error);
      return { scamType: 'unknown', confidenceLevel: 'low' };
    }
  }

  normalizeAgentNotes(notes, scamType) {
    if (!notes || typeof notes !== 'string') return notes;

    const labels = {
      bank_fraud: 'bank fraud',
      upi_fraud: 'UPI fraud',
      kyc_update: 'KYC update',
      lottery_prize: 'lottery prize',
      traffic_challan: 'traffic challan',
      electricity_bill: 'electricity bill',
      fake_delivery: 'delivery/courier',
      ecommerce: 'e-commerce',
      investment_scam: 'investment scam',
      apk_remote: 'remote access',
      tax_refund: 'tax refund'
    };

    const target = labels[scamType];
    if (!target) return notes;

    const lower = notes.toLowerCase();
    if (lower.includes(target.toLowerCase())) return notes;

    const otherLabels = Object.values(labels).filter(l => l !== target);
    for (const l of otherLabels) {
      const re = new RegExp(l, 'i');
      if (re.test(notes)) {
        return notes.replace(re, target);
      }
    }

    return `This is a ${target} scam. ${notes}`;
  }

  buildAgentNotesSummary(scamType, extractedIntelligence = {}, redFlags = []) {
    const labels = {
      bank_fraud: 'bank fraud',
      upi_fraud: 'UPI fraud',
      kyc_update: 'KYC update',
      lottery_prize: 'lottery prize',
      traffic_challan: 'traffic challan',
      electricity_bill: 'electricity bill',
      fake_delivery: 'delivery/courier',
      ecommerce: 'e-commerce',
      investment_scam: 'investment scam',
      apk_remote: 'remote access',
      tax_refund: 'tax refund'
    };

    const label = labels[scamType] || 'scam';
    const flags = [];
    const keywords = new Set((extractedIntelligence.suspiciousKeywords || []).map(k => String(k).toLowerCase()));

    const hasAny = (list = []) => Array.isArray(list) && list.length > 0;
    const hasKeyword = (re) => {
      for (const k of keywords) {
        if (re.test(k)) return true;
      }
      return false;
    };

    if (hasKeyword(/\b(urgent|immediate|blocked|suspend|penalty|fine|legal action)\b/i)) {
      flags.push('used urgency/threats');
    }
    if (hasKeyword(/\b(otp|pin|password)\b/i)) {
      flags.push('asked for OTP/PIN');
    }
    if (hasAny(extractedIntelligence.phishingLinks)) {
      flags.push('shared a suspicious link');
    }
    if (hasAny(extractedIntelligence.upiIds) || hasAny(extractedIntelligence.bankAccounts)) {
      flags.push('requested payment details');
    }
    if (hasAny(extractedIntelligence.employeeIds) || hasAny(extractedIntelligence.caseIds)) {
      flags.push('claimed official IDs/reference numbers');
    }

    const intel = [];
    if (hasAny(extractedIntelligence.phoneNumbers)) {
      intel.push(`phone ${extractedIntelligence.phoneNumbers.join(', ')}`);
    }
    if (hasAny(extractedIntelligence.upiIds)) {
      intel.push(`UPI ${extractedIntelligence.upiIds.join(', ')}`);
    }
    if (hasAny(extractedIntelligence.phishingLinks)) {
      intel.push(`link ${extractedIntelligence.phishingLinks.join(', ')}`);
    }
    if (hasAny(extractedIntelligence.emailAddresses)) {
      intel.push(`email ${extractedIntelligence.emailAddresses.join(', ')}`);
    }
    if (hasAny(extractedIntelligence.employeeIds)) {
      intel.push(`ID ${extractedIntelligence.employeeIds.join(', ')}`);
    }
    if (hasAny(extractedIntelligence.caseIds)) {
      intel.push(`ref ${extractedIntelligence.caseIds.join(', ')}`);
    }

    const redFlagsText = flags.length > 0 ? flags.join(', ') : 'pressure tactics and verification demands';
    const structuredFlags = Array.isArray(redFlags) && redFlags.length > 0
      ? redFlags.map(f => f.type).filter(Boolean).join(', ')
      : '';
    const intelText = intel.length > 0 ? ` Key intelligence: ${intel.join('; ')}.` : '';

    const combinedFlags = structuredFlags ? `${redFlagsText}; ${structuredFlags}` : redFlagsText;
    return `This is a ${label} scam. Red flags include ${combinedFlags}.${intelText}`.trim();
  }

  // ============================================================================
  // MAIN CONVERSATION HANDLER
  // ============================================================================
  async handleMessage(sessionId, message, conversationHistory = [], metadata = {}, askedQuestions = []) {
    try {
      const turnNumber = Math.floor(conversationHistory.length / 2) + 1;

      // Detect scam type
      let scamType = this.detectScamType(message, conversationHistory);

      // Extract intelligence from current message (regex-based)
      const newIntelligence = this.extractIntelligence(message, conversationHistory);

      // LLM scam type override when confidence is medium/high
      try {
        if (conversationHistory.length >= 2) {
          const llmType = await this.classifyScamTypeLLM(
            [...conversationHistory, { sender: 'scammer', text: message }],
            newIntelligence
          );
          if (llmType && llmType.scamType && llmType.scamType !== 'other' && llmType.confidenceLevel !== 'low') {
            scamType = llmType.scamType;
          }
        }
      } catch (error) {
        console.error('LLM scam type override error:', error);
      }

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
        askedQuestions,
        newIntelligence // Pass extracted intelligence for prioritization
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

      // Detect scam type (LLM-first)
      let scamType = this.detectScamType('', conversationHistory);
      try {
        const llmType = await this.classifyScamTypeLLM(conversationHistory, extractedIntelligence);
        if (llmType && llmType.scamType && llmType.scamType !== 'other' && llmType.confidenceLevel !== 'low') {
          scamType = llmType.scamType;
        }
      } catch (error) {
        console.error('LLM scam type detection error:', error);
      }

      // Calculate engagement metrics
      const totalMessages = conversationHistory.length;
      const timestamps = conversationHistory
        .filter(m => m.timestamp)
        .map(m => new Date(m.timestamp).getTime());

      const engagementDuration = timestamps.length >= 2
        ? Math.round((Math.max(...timestamps) - Math.min(...timestamps)) / 1000)
        : 0;
      const safeDuration = engagementDuration > 0 ? engagementDuration : (conversationHistory.length > 0 ? 1 : 0);

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
          engagementDurationSeconds: safeDuration
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


