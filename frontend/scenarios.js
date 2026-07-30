// ============================================================================
// SIMULATED SCAM CONVERSATIONS
// Scripted transcripts written in the same persona voice as the honeypot
// agent's system prompts (src/honeypotAgent.js in the finalguvi repo).
// Nothing here calls the live API — it's a deterministic, replayable demo
// of how the agent behaves for each scam type.
// ============================================================================

const SCENARIOS = [
  {
    id: "lottery_prize",
    label: "Lottery / Prize",
    icon: "🎉",
    persona: "excited_naive",
    personaLabel: "Excited but Overwhelmed",
    verdict: "scam",
    contactName: "KBC Lucky Draw",
    contactSub: "+91 92339 04471",
    messages: [
      { who: "scammer", text: "🎉 CONGRATULATIONS! Your number has been selected for KBC Lucky Draw 2026. You have WON ₹25,00,000! Reply YES to claim your prize before it expires." },
      { who: "agent", text: "Wait, really?? Me only? I never even entered any KBC lucky draw, how did my number get selected sir?" },
      { who: "scammer", text: "Yes maam, your number was picked randomly from Jio/Airtel users database. This is official, organized by Reliance Jio Rewards Division. To claim, you need to pay a small processing/tax fee of ₹4,999.",
        reveal: [{ type: "orgNames", label: "Org name", value: "Jio Rewards Division" }] },
      { who: "agent", text: "Oh wow, I am surprised only. Which company is this exactly, and can I get your employee ID or the official reference number for this lucky draw?" },
      { who: "scammer", text: "My employee ID is JR-4521. Reference number is KBC-2026-88213. Pay the fee to UPI ID kbc.rewards@ybl and the prize will be credited within 24 hours.",
        reveal: [
          { type: "employeeIds", label: "Employee ID", value: "JR-4521" },
          { type: "caseIds", label: "Reference #", value: "KBC-2026-88213" },
          { type: "upiIds", label: "UPI ID", value: "kbc.rewards@ybl" }
        ] },
      { who: "agent", text: "Okay, let me note that UPI down properly. If I need to call back for any issue, what number should I use?" },
      { who: "scammer", text: "You can call our helpline +91 98765 43210 for any queries. Please hurry, offer expires in 2 hours only.",
        reveal: [{ type: "phoneNumbers", label: "Callback #", value: "+91 98765 43210" }] },
      { who: "agent", text: "I'm trying to pay now but the UPI app is showing an error, not going through. Is there a bank account number I can transfer to directly instead?" },
      { who: "scammer", text: "No problem, transfer to account number 50100234567890, IFSC SBIN0001234, in the name of Jio Rewards Pvt Ltd.",
        reveal: [
          { type: "bankAccounts", label: "Bank account", value: "50100234567890" },
          { type: "ifscCodes", label: "IFSC", value: "SBIN0001234" }
        ] },
      { who: "agent", text: "One second, let me check with my brother before sending anything this big. Is there an official website where I can verify this lucky draw first?" },
      { who: "scammer", text: "Yes sir, check www.jio-lucky-rewards-claim.xyz/verify — enter your number there to confirm winner status.",
        reveal: [{ type: "phishingLinks", label: "Link", value: "jio-lucky-rewards-claim.xyz/verify" }] },
      { who: "agent", text: "Okay, I noted everything down. Let me check this website first before I send any payment, I'll message you back shortly." }
    ],
    finalReport: {
      scamType: "lottery_prize",
      confidenceLevel: 0.94,
      totalMessagesExchanged: 12,
      engagementDurationSeconds: 186,
      redFlags: [
        { type: "unsolicited_prize", evidence: "won ₹25,00,000 lottery without entering", severity: "high" },
        { type: "upfront_fee", evidence: "processing/tax fee ₹4,999 requested before payout", severity: "critical" },
        { type: "urgency_pressure", evidence: "offer expires in 2 hours only", severity: "medium" },
        { type: "unverified_domain", evidence: "jio-lucky-rewards-claim.xyz is not an official Jio/Reliance domain", severity: "high" },
        { type: "fake_employee_id", evidence: "JR-4521 could not be verified against any organization", severity: "medium" }
      ],
      agentNotes: "Classic lottery/prize scam impersonating Jio Rewards Division; extracted a UPI ID, bank account + IFSC, phone number, and a phishing verification link across 6 turns while withholding real payment."
    }
  },
  {
    id: "bank_fraud",
    label: "Bank Fraud / KYC",
    icon: "🏦",
    persona: "panicked_confused",
    personaLabel: "Panicked & Confused",
    verdict: "scam",
    contactName: "SBI Alerts",
    contactSub: "+91 98211 33452",
    messages: [
      { who: "scammer", text: "Dear customer, your SBI account will be BLOCKED within 2 hours due to incomplete KYC. Share the OTP sent to your Aadhaar-linked mobile immediately to avoid suspension." },
      { who: "agent", text: "Oh no, this is scary, I was not expecting any bank alert like this. Sir which branch is this regarding, and can you confirm my account will really be blocked?" },
      { who: "scammer", text: "Yes maam, this is from SBI KYC Verification Cell, Mumbai branch. Your account ending 4521 will be permanently frozen if not verified today. Share the OTP you just received.",
        reveal: [{ type: "orgNames", label: "Org name", value: "SBI KYC Verification Cell" }] },
      { who: "agent", text: "OTP is not coming only sir, let me check once. Can you tell me your employee ID so I can note it down properly?" },
      { who: "scammer", text: "My employee ID is SBI-KYC-7734. Please hurry maam, OTP is time sensitive, it will expire in 5 minutes.",
        reveal: [{ type: "employeeIds", label: "Employee ID", value: "SBI-KYC-7734" }] },
      { who: "agent", text: "I'm getting worried now. If I need to call back to confirm this is really from the bank, what is the official number I should use?" },
      { who: "scammer", text: "You can call our verification desk at 9123456780, that is the direct line.",
        reveal: [{ type: "phoneNumbers", label: "Callback #", value: "9123456780" }] },
      { who: "agent", text: "Okay, actually the OTP page on my phone is not opening properly. Is there a link I should use to update KYC directly?" },
      { who: "scammer", text: "Yes, use this secure link: sbi-ekyc-verify.in/update to complete it fast.",
        reveal: [{ type: "phishingLinks", label: "Link", value: "sbi-ekyc-verify.in/update" }] },
      { who: "agent", text: "Let me verify once before doing anything. Also, if there's any charge for this KYC update, which UPI ID should I use?" },
      { who: "scammer", text: "There is a small verification charge of ₹1 for account activation, pay to sbikyc.verify@oksbi to keep the process moving.",
        reveal: [
          { type: "upiIds", label: "UPI ID", value: "sbikyc.verify@oksbi" },
          { type: "amounts", label: "Amount", value: "₹1" }
        ] },
      { who: "agent", text: "This is not seeming correct honestly. Let me visit my branch directly and confirm with them before I do anything further." }
    ],
    finalReport: {
      scamType: "bank_fraud",
      confidenceLevel: 0.97,
      totalMessagesExchanged: 12,
      engagementDurationSeconds: 210,
      redFlags: [
        { type: "urgency_threat", evidence: "account will be blocked within 2 hours", severity: "critical" },
        { type: "otp_request", evidence: "asked to share OTP received on phone", severity: "critical" },
        { type: "phishing_link", evidence: "sbi-ekyc-verify.in is not an official SBI domain", severity: "high" },
        { type: "token_payment_request", evidence: "₹1 \"verification charge\" requested via personal UPI handle", severity: "high" },
        { type: "impersonation", evidence: "claims to be \"SBI KYC Verification Cell\" with an unverifiable employee ID", severity: "medium" }
      ],
      agentNotes: "Bank KYC/OTP phishing attempt impersonating SBI; scammer pushed for OTP disclosure, a phishing domain, and a token UPI payment, all declined while employee ID, phone, link and UPI were extracted."
    }
  },
  {
    id: "traffic_challan",
    label: "Traffic Challan",
    icon: "🚦",
    persona: "nervous_compliant",
    personaLabel: "Nervous & Compliant",
    verdict: "scam",
    contactName: "Traffic e-Challan",
    contactSub: "+91 90090 12873",
    messages: [
      { who: "scammer", text: "This is Delhi Traffic Police. An e-challan CH-2026-88341 has been issued against vehicle DL 04 AB 1234 for signal jump. Pay ₹1000 within 24 hours or license will be suspended." },
      { who: "agent", text: "Oh no, this is a shock. I did not expect any challan, sir which violation is this exactly for?" },
      { who: "scammer", text: "Signal jump recorded on camera at ITO junction on 25th July. If not paid, case goes to court and your license will be suspended." },
      { who: "agent", text: "Sir, I'm not understanding this properly, that's not even my usual route. Can you share your officer ID and which police station this is from?" },
      { who: "scammer", text: "My officer ID is DL-TP-5567, from ITO Traffic Station. Please pay quickly to avoid court summons.",
        reveal: [{ type: "employeeIds", label: "Officer ID", value: "DL-TP-5567" }] },
      { who: "agent", text: "Just a second, let me check this once. What is the official portal I should use to verify and pay this challan?" },
      { who: "scammer", text: "Use parivahan-echallan-pay.in to check and pay directly, faster than the government site.",
        reveal: [{ type: "phishingLinks", label: "Link", value: "parivahan-echallan-pay.in" }] },
      { who: "agent", text: "Okay, I'm trying to pay now but the portal is asking for a UPI ID to redirect to. Which UPI should I use directly?" },
      { who: "scammer", text: "Pay directly to trafficchallan.dl@ybl, ₹1000, and send a screenshot to this WhatsApp number 9988776655 for confirmation.",
        reveal: [
          { type: "upiIds", label: "UPI ID", value: "trafficchallan.dl@ybl" },
          { type: "phoneNumbers", label: "WhatsApp #", value: "9988776655" },
          { type: "amounts", label: "Amount", value: "₹1000" }
        ] },
      { who: "agent", text: "One small doubt, can I get a case or reference number for this so I can note it down before paying?" },
      { who: "scammer", text: "Reference number is REF-CH-99213, keep it safe.",
        reveal: [{ type: "caseIds", label: "Reference #", value: "REF-CH-99213" }] },
      { who: "agent", text: "Let me verify this on the official Parivahan website first before paying anything, I'll get back to you." }
    ],
    finalReport: {
      scamType: "traffic_challan",
      confidenceLevel: 0.93,
      totalMessagesExchanged: 12,
      engagementDurationSeconds: 198,
      redFlags: [
        { type: "unofficial_domain", evidence: "parivahan-echallan-pay.in mimics the real gov portal parivahan.gov.in", severity: "high" },
        { type: "legal_threat", evidence: "threatened court summons and license suspension", severity: "high" },
        { type: "personal_upi_request", evidence: "asked to pay the fine to a personal UPI handle instead of the official gateway", severity: "critical" },
        { type: "urgency_pressure", evidence: "pay within 24 hours to avoid escalation", severity: "medium" }
      ],
      agentNotes: "Fake traffic e-challan scam using a look-alike domain; extracted an officer ID, phishing link, UPI ID, callback number and a reference ID while stalling payment for verification."
    }
  },
  {
    id: "electricity_bill",
    label: "Electricity Bill",
    icon: "⚡",
    persona: "worried_obedient",
    personaLabel: "Worried & Obedient",
    verdict: "scam",
    contactName: "Electricity Board",
    contactSub: "+91 88031 55290",
    messages: [
      { who: "scammer", text: "Dear consumer, your electricity connection will be DISCONNECTED TONIGHT at 9:30 PM due to unpaid bill. Contact our officer immediately to avoid disconnection." },
      { who: "agent", text: "Oh no, this is worrying, I paid my bill recently. Sir which consumer number is this regarding?" },
      { who: "scammer", text: "Your consumer number shows as 204587690 in our records, with pending dues of ₹2,340. Immediate payment required to avoid disconnection tonight.",
        reveal: [{ type: "consumerNumbers", label: "Consumer #", value: "204587690" }] },
      { who: "agent", text: "Let me check once, that doesn't sound right to me. Can I get your employee ID and which office you're calling from?" },
      { who: "scammer", text: "I am Officer Ramesh, employee ID EB-3391, from the Central Billing Office.",
        reveal: [{ type: "employeeIds", label: "Employee ID", value: "EB-3391" }] },
      { who: "agent", text: "Okay sir, if I need to pay urgently, which UPI ID should I use?" },
      { who: "scammer", text: "Pay to ebofficepay@ybl immediately, ₹2,340, and I will confirm on call once received.",
        reveal: [
          { type: "upiIds", label: "UPI ID", value: "ebofficepay@ybl" },
          { type: "amounts", label: "Amount", value: "₹2,340" }
        ] },
      { who: "agent", text: "I'm trying to pay now but it's not going through. Is there a callback number in case the payment fails?" },
      { who: "scammer", text: "Call me directly on 8877665544 if there is any issue with the payment.",
        reveal: [{ type: "phoneNumbers", label: "Callback #", value: "8877665544" }] },
      { who: "agent", text: "Just to be safe, is there an official link or app where I can check my actual bill status?" },
      { who: "scammer", text: "Check quickpay-electricity-bill.in, enter your consumer number there to confirm the dues.",
        reveal: [{ type: "phishingLinks", label: "Link", value: "quickpay-electricity-bill.in" }] },
      { who: "agent", text: "Let me confirm this with the official board helpline first before I send this payment." }
    ],
    finalReport: {
      scamType: "electricity_bill",
      confidenceLevel: 0.91,
      totalMessagesExchanged: 12,
      engagementDurationSeconds: 175,
      redFlags: [
        { type: "disconnection_threat", evidence: "threatened same-night disconnection to force urgent payment", severity: "high" },
        { type: "personal_upi_request", evidence: "dues requested via a personal UPI handle instead of the discom portal", severity: "critical" },
        { type: "unofficial_domain", evidence: "quickpay-electricity-bill.in is not an official state discom domain", severity: "high" }
      ],
      agentNotes: "Electricity disconnection scam; obtained a fabricated consumer number, employee ID, UPI ID, phone number and a phishing bill-check link while the dues were never actually paid."
    }
  },
  {
    id: "fake_delivery",
    label: "Fake Delivery",
    icon: "📦",
    persona: "confused_curious",
    personaLabel: "Confused & Curious",
    verdict: "scam",
    contactName: "Amazon Delivery",
    contactSub: "+91 97042 66810",
    messages: [
      { who: "scammer", text: "Your parcel from Amazon could not be delivered due to incomplete address. Pay ₹49 redelivery fee within 24 hours or the parcel will be returned." },
      { who: "agent", text: "Oh, this is unexpected, I was not waiting for any parcel. What is the tracking number for this?" },
      { who: "scammer", text: "Tracking ID is AMZN7728819302IN. It's a package addressed to you, currently held at our facility.",
        reveal: [{ type: "trackingIds", label: "Tracking ID", value: "AMZN7728819302IN" }] },
      { who: "agent", text: "Sir, I'm not understanding this delivery issue, which courier company are you from exactly?" },
      { who: "scammer", text: "This is India Express Logistics, official Amazon delivery partner. My employee ID is IEL-2290.",
        reveal: [{ type: "employeeIds", label: "Employee ID", value: "IEL-2290" }] },
      { who: "agent", text: "Okay, I'm trying to pay the redelivery fee, which UPI ID should I use?" },
      { who: "scammer", text: "Pay to iel.redelivery@ybl, ₹49, and share the screenshot on WhatsApp 9090909090 to confirm.",
        reveal: [
          { type: "upiIds", label: "UPI ID", value: "iel.redelivery@ybl" },
          { type: "phoneNumbers", label: "WhatsApp #", value: "9090909090" },
          { type: "amounts", label: "Amount", value: "₹49" }
        ] },
      { who: "agent", text: "One minute, let me check on the official Amazon app first — is there a link where I can track this myself?" },
      { who: "scammer", text: "Check the status at amaz-redelivery-track.com using your tracking ID.",
        reveal: [{ type: "phishingLinks", label: "Link", value: "amaz-redelivery-track.com" }] },
      { who: "agent", text: "Just checking, can I get an order ID as well so I can match this with my Amazon orders?" },
      { who: "scammer", text: "Order ID is 408-8827193-2201. Please hurry, otherwise the parcel gets returned to sender today.",
        reveal: [{ type: "orderIds", label: "Order ID", value: "408-8827193-2201" }] },
      { who: "agent", text: "Let me check this against my actual Amazon orders page first before paying anything." }
    ],
    finalReport: {
      scamType: "fake_delivery",
      confidenceLevel: 0.89,
      totalMessagesExchanged: 12,
      engagementDurationSeconds: 165,
      redFlags: [
        { type: "unofficial_domain", evidence: "amaz-redelivery-track.com is not an amazon.in domain", severity: "high" },
        { type: "small_fee_trap", evidence: "small ₹49 fee used to lower suspicion while harvesting payment info", severity: "medium" },
        { type: "urgency_pressure", evidence: "parcel will be returned today if not paid immediately", severity: "medium" }
      ],
      agentNotes: "Fake redelivery-fee scam impersonating an Amazon courier partner; extracted a tracking ID, employee ID, UPI ID, phone number, phishing link and an order ID without paying the requested fee."
    }
  },
  {
    id: "investment_scam",
    label: "Investment / Crypto",
    icon: "📈",
    persona: "interested_skeptical",
    personaLabel: "Interested but Skeptical",
    verdict: "scam",
    contactName: "QuantumGrow Advisor",
    contactSub: "+91 77129 40098",
    messages: [
      { who: "scammer", text: "Hi! I'm from QuantumGrow Trading. Our AI trading bot gives guaranteed 15% daily returns on crypto. Just deposit ₹10,000 to start and double it in a week!" },
      { who: "agent", text: "Oh interesting, I have not heard of QuantumGrow before. Which company runs this, and is it SEBI registered?" },
      { who: "scammer", text: "We are registered under QuantumGrow Fintech Pvt Ltd, operating from Singapore, fully compliant with international crypto regulations.",
        reveal: [{ type: "orgNames", label: "Org name", value: "QuantumGrow Fintech Pvt Ltd" }] },
      { who: "agent", text: "That sounds promising honestly, but let me be careful. Can you share your employee ID or a company reference so I can look into it?" },
      { who: "scammer", text: "Sure, my advisor ID is QG-ADV-1187. You can also check our reviews on our official Telegram group.",
        reveal: [{ type: "employeeIds", label: "Advisor ID", value: "QG-ADV-1187" }] },
      { who: "agent", text: "Okay, if I want to deposit the ₹10,000, which UPI ID or account should I use?" },
      { who: "scammer", text: "Deposit to quantumgrow.invest@ybl, or transfer to account 34567891234 IFSC HDFC0002211 for larger amounts.",
        reveal: [
          { type: "upiIds", label: "UPI ID", value: "quantumgrow.invest@ybl" },
          { type: "bankAccounts", label: "Bank account", value: "34567891234" },
          { type: "ifscCodes", label: "IFSC", value: "HDFC0002211" }
        ] },
      { who: "agent", text: "One thing though, is there an official website where I can see the trading dashboard and past returns?" },
      { who: "scammer", text: "Yes, register at quantumgrow-tradingapp.co and login with your phone number to see your dashboard.",
        reveal: [{ type: "phishingLinks", label: "Link", value: "quantumgrow-tradingapp.co" }] },
      { who: "agent", text: "Let me confirm one more thing — if I need to reach you or the support team, what number should I call?" },
      { who: "scammer", text: "Call our relationship manager directly on 7766554433 for any withdrawal or deposit help.",
        reveal: [{ type: "phoneNumbers", label: "Callback #", value: "7766554433" }] },
      { who: "agent", text: "Alright, let me research this a bit more and check with a friend who trades before I send anything this big." }
    ],
    finalReport: {
      scamType: "investment_scam",
      confidenceLevel: 0.9,
      totalMessagesExchanged: 12,
      engagementDurationSeconds: 172,
      redFlags: [
        { type: "guaranteed_returns", evidence: "promised guaranteed 15% daily returns, doubling money in a week", severity: "critical" },
        { type: "unregistered_entity", evidence: "\"SEBI registered\" claim could not be verified; entity claims foreign incorporation", severity: "high" },
        { type: "unofficial_domain", evidence: "quantumgrow-tradingapp.co is an unverified domain", severity: "high" },
        { type: "personal_account_deposit", evidence: "large deposits routed to a personal-looking UPI handle and bank account", severity: "critical" }
      ],
      agentNotes: "Crypto/trading investment scam promising guaranteed unrealistic returns; extracted a UPI ID, bank account + IFSC, phishing dashboard link, advisor ID and phone number without depositing funds."
    }
  },
  {
    id: "genuine_message",
    label: "Genuine Message ✅",
    icon: "📬",
    persona: "none",
    personaLabel: "No engagement needed",
    verdict: "safe",
    contactName: "Amazon",
    contactSub: "Official Business Account",
    messages: [
      { who: "scammer", text: "Your order #408-7723910-5541 (USB-C Charging Cable, 1 item) was delivered today at 2:14 PM. Thank you for shopping with us — tap to rate your experience." },
      { who: "agent", text: "Thanks, got it! Delivery guy was quick this time 🙂" }
    ],
    finalReport: {
      scamType: "none",
      confidenceLevel: 0.04,
      totalMessagesExchanged: 2,
      engagementDurationSeconds: 6,
      verdictReasoning: [
        { type: "no_urgency", note: "No countdowns, threats, or \"act immediately\" language anywhere in the message." },
        { type: "no_sensitive_request", note: "Never asks for OTP, PIN, UPI ID, bank details, or any payment at all." },
        { type: "no_external_link", note: "No link, APK, or unofficial domain — nothing to click or install." },
        { type: "consistent_pattern", note: "Order-number format and phrasing matches genuine Amazon delivery notifications the user already recognizes." }
      ],
      agentNotes: "Routine post-delivery notification with zero manipulation markers — classified as legitimate and closed without any bait or follow-up questions."
    }
  }
];

const INTEL_TYPE_ORDER = [
  "phoneNumbers", "upiIds", "bankAccounts", "ifscCodes", "phishingLinks",
  "emailAddresses", "employeeIds", "caseIds", "orderIds", "trackingIds",
  "consumerNumbers", "amounts", "orgNames"
];

const INTEL_TYPE_META = {
  phoneNumbers: { label: "Phone / Callback", icon: "📞" },
  upiIds: { label: "UPI ID", icon: "💸" },
  bankAccounts: { label: "Bank Account", icon: "🏦" },
  ifscCodes: { label: "IFSC Code", icon: "🔢" },
  phishingLinks: { label: "Phishing Link", icon: "🔗" },
  emailAddresses: { label: "Email", icon: "✉️" },
  employeeIds: { label: "Employee/Officer ID", icon: "🪪" },
  caseIds: { label: "Case / Reference #", icon: "🗂️" },
  orderIds: { label: "Order ID", icon: "📦" },
  trackingIds: { label: "Tracking ID", icon: "🚚" },
  consumerNumbers: { label: "Consumer #", icon: "🔌" },
  amounts: { label: "Amount Requested", icon: "₹" },
  orgNames: { label: "Claimed Organization", icon: "🏢" }
};
