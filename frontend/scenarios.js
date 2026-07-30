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
    teaser: "“You've won ₹25,00,000!” — the classic prize scam.",
    verdict: "scam",
    contactName: "KBC Lucky Draw",
    contactSub: "+91 92339 04471",
    messages: [
      { who: "scammer", text: "🎉 CONGRATULATIONS! Your number has been selected for KBC Lucky Draw 2026. You have WON ₹25,00,000! Reply YES to claim your prize before it expires." },
      { who: "agent", variants: [
        "Wait, really?? Me only? I never even entered any KBC lucky draw, how did my number get selected sir?",
        "Omg wait what, seriously? I don't even remember entering any KBC draw, how did they pick my number sir?",
        "Hold on, are you sure this is for me? I never signed up for any lucky draw like this, how does this work?"
      ] },
      { who: "scammer", text: "Yes maam, your number was picked randomly from Jio/Airtel users database. This is official, organized by Reliance Jio Rewards Division. To claim, you need to pay a small processing/tax fee of ₹4,999.",
        reveal: [{ type: "orgNames", label: "Org name", value: "Jio Rewards Division" }] },
      { who: "agent", variants: [
        "Oh wow, I am surprised only. Which company is this exactly, and can I get your employee ID or the official reference number for this lucky draw?",
        "Arre this is unbelievable. Which company is running this exactly, and what's your employee ID or a reference number for it?",
        "Wow okay, I'm still processing this. Can you tell me the company name properly, plus your employee ID and a reference number?"
      ] },
      { who: "scammer", text: "My employee ID is JR-4521. Reference number is KBC-2026-88213. Pay the fee to UPI ID kbc.rewards@ybl and the prize will be credited within 24 hours.",
        reveal: [
          { type: "employeeIds", label: "Employee ID", value: "JR-4521" },
          { type: "caseIds", label: "Reference #", value: "KBC-2026-88213" },
          { type: "upiIds", label: "UPI ID", value: "kbc.rewards@ybl" }
        ] },
      { who: "agent", variants: [
        "Okay, let me note that UPI down properly. If I need to call back for any issue, what number should I use?",
        "Alright, noting the UPI ID now. In case anything goes wrong, what number can I call you back on?",
        "Okay noted. Just in case there's an issue later, which number should I use to reach you?"
      ] },
      { who: "scammer", text: "You can call our helpline +91 98765 43210 for any queries. Please hurry, offer expires in 2 hours only.",
        reveal: [{ type: "phoneNumbers", label: "Callback #", value: "+91 98765 43210" }] },
      { who: "agent", variants: [
        "I'm trying to pay now but the UPI app is showing an error, not going through. Is there a bank account number I can transfer to directly instead?",
        "Hmm the UPI payment is failing on my end, keeps giving error. Can you give me a bank account number so I can transfer directly?",
        "The UPI isn't going through for some reason. Do you have an account number I could transfer to instead?"
      ] },
      { who: "scammer", text: "No problem, transfer to account number 50100234567890, IFSC SBIN0001234, in the name of Jio Rewards Pvt Ltd.",
        reveal: [
          { type: "bankAccounts", label: "Bank account", value: "50100234567890" },
          { type: "ifscCodes", label: "IFSC", value: "SBIN0001234" }
        ] },
      { who: "agent", variants: [
        "One second, let me check with my brother before sending anything this big. Is there an official website where I can verify this lucky draw first?",
        "Wait, let me just check with my brother first before sending this much money. Is there a website I can use to verify this is real?",
        "Hold on, this is a big amount, let me confirm with family first. Do you have an official site where I can check this lucky draw?"
      ] },
      { who: "scammer", text: "Yes sir, check www.jio-lucky-rewards-claim.xyz/verify — enter your number there to confirm winner status.",
        reveal: [{ type: "phishingLinks", label: "Link", value: "jio-lucky-rewards-claim.xyz/verify" }] },
      { who: "agent", variants: [
        "Okay, I noted everything down. Let me check this website first before I send any payment, I'll message you back shortly.",
        "Alright, I've written it all down. Let me look at the website first, will message you back in a bit.",
        "Okay got it all noted. Give me a moment to check the site before I pay, I'll come back to you."
      ] }
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
    teaser: "“Your account will be blocked in 2 hours” — OTP/KYC phishing.",
    verdict: "scam",
    contactName: "SBI Alerts",
    contactSub: "+91 98211 33452",
    messages: [
      { who: "scammer", text: "Dear customer, your SBI account will be BLOCKED within 2 hours due to incomplete KYC. Share the OTP sent to your Aadhaar-linked mobile immediately to avoid suspension." },
      { who: "agent", variants: [
        "Oh no, this is scary, I was not expecting any bank alert like this. Sir which branch is this regarding, and can you confirm my account will really be blocked?",
        "Wait what, this is scary, I never got a message like this before. Which branch is this from, and will my account actually get blocked?",
        "Oh god, I did not expect this at all. Sir can you tell me which branch this is regarding, is my account really going to be blocked?"
      ] },
      { who: "scammer", text: "Yes maam, this is from SBI KYC Verification Cell, Mumbai branch. Your account ending 4521 will be permanently frozen if not verified today. Share the OTP you just received.",
        reveal: [{ type: "orgNames", label: "Org name", value: "SBI KYC Verification Cell" }] },
      { who: "agent", variants: [
        "OTP is not coming only sir, let me check once. Can you tell me your employee ID so I can note it down properly?",
        "Sir the OTP isn't coming through, let me check my phone once. Meanwhile can you give me your employee ID?",
        "I don't see any OTP yet sir, one second. Can you share your employee ID so I have it noted?"
      ] },
      { who: "scammer", text: "My employee ID is SBI-KYC-7734. Please hurry maam, OTP is time sensitive, it will expire in 5 minutes.",
        reveal: [{ type: "employeeIds", label: "Employee ID", value: "SBI-KYC-7734" }] },
      { who: "agent", variants: [
        "I'm getting worried now. If I need to call back to confirm this is really from the bank, what is the official number I should use?",
        "I'm getting really tense now. Is there a number I can call back on to confirm this is actually from the bank?",
        "This is making me nervous. If I want to verify this is genuinely the bank calling, what number should I use?"
      ] },
      { who: "scammer", text: "You can call our verification desk at 9123456780, that is the direct line.",
        reveal: [{ type: "phoneNumbers", label: "Callback #", value: "9123456780" }] },
      { who: "agent", variants: [
        "Okay, actually the OTP page on my phone is not opening properly. Is there a link I should use to update KYC directly?",
        "Hmm, the OTP screen isn't loading properly on my end. Do you have a link I can use to update the KYC directly?",
        "Actually my phone isn't showing the OTP page correctly. Is there a direct link for the KYC update?"
      ] },
      { who: "scammer", text: "Yes, use this secure link: sbi-ekyc-verify.in/update to complete it fast.",
        reveal: [{ type: "phishingLinks", label: "Link", value: "sbi-ekyc-verify.in/update" }] },
      { who: "agent", variants: [
        "Let me verify once before doing anything. Also, if there's any charge for this KYC update, which UPI ID should I use?",
        "Let me just double check before proceeding. Also if there's some fee for this KYC thing, which UPI should I pay to?",
        "One minute, let me confirm this properly first. And if there's a charge involved for KYC, what UPI ID is it?"
      ] },
      { who: "scammer", text: "There is a small verification charge of ₹1 for account activation, pay to sbikyc.verify@oksbi to keep the process moving.",
        reveal: [
          { type: "upiIds", label: "UPI ID", value: "sbikyc.verify@oksbi" },
          { type: "amounts", label: "Amount", value: "₹1" }
        ] },
      { who: "agent", variants: [
        "This is not seeming correct honestly. Let me visit my branch directly and confirm with them before I do anything further.",
        "Honestly this isn't feeling right. I'll go to my branch directly and check with them before doing anything more.",
        "Something about this isn't adding up. Let me just visit the branch in person and confirm before proceeding further."
      ] }
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
    teaser: "“Pay this fine or go to court” — a fake e-challan.",
    verdict: "scam",
    contactName: "Traffic e-Challan",
    contactSub: "+91 90090 12873",
    messages: [
      { who: "scammer", text: "This is Delhi Traffic Police. An e-challan CH-2026-88341 has been issued against vehicle DL 04 AB 1234 for signal jump. Pay ₹1000 within 24 hours or license will be suspended." },
      { who: "agent", variants: [
        "Oh no, this is a shock. I did not expect any challan, sir which violation is this exactly for?",
        "Wait, this is a shock, I wasn't expecting any challan at all. Sir which violation are you referring to exactly?",
        "Oh no, this caught me off guard. What exactly is this violation for sir?"
      ] },
      { who: "scammer", text: "Signal jump recorded on camera at ITO junction on 25th July. If not paid, case goes to court and your license will be suspended." },
      { who: "agent", variants: [
        "Sir, I'm not understanding this properly, that's not even my usual route. Can you share your officer ID and which police station this is from?",
        "Sir I'm confused, I don't even usually go that way. Can you tell me your officer ID and which station this is from?",
        "Sir this doesn't make sense to me, that's not my regular route even. What's your officer ID and which station are you from?"
      ] },
      { who: "scammer", text: "My officer ID is DL-TP-5567, from ITO Traffic Station. Please pay quickly to avoid court summons.",
        reveal: [{ type: "employeeIds", label: "Officer ID", value: "DL-TP-5567" }] },
      { who: "agent", variants: [
        "Just a second, let me check this once. What is the official portal I should use to verify and pay this challan?",
        "Give me one minute, let me look into this. Which is the official site I should use to check and pay this challan?",
        "Hold on, let me verify this first. What's the correct government portal for checking and paying this?"
      ] },
      { who: "scammer", text: "Use parivahan-echallan-pay.in to check and pay directly, faster than the government site.",
        reveal: [{ type: "phishingLinks", label: "Link", value: "parivahan-echallan-pay.in" }] },
      { who: "agent", variants: [
        "Okay, I'm trying to pay now but the portal is asking for a UPI ID to redirect to. Which UPI should I use directly?",
        "Alright, I'm on the portal now but it wants a UPI ID to redirect. Which UPI should I enter directly?",
        "Okay trying to pay, but the site is asking me for a UPI ID first. Which one should I use?"
      ] },
      { who: "scammer", text: "Pay directly to trafficchallan.dl@ybl, ₹1000, and send a screenshot to this WhatsApp number 9988776655 for confirmation.",
        reveal: [
          { type: "upiIds", label: "UPI ID", value: "trafficchallan.dl@ybl" },
          { type: "phoneNumbers", label: "WhatsApp #", value: "9988776655" },
          { type: "amounts", label: "Amount", value: "₹1000" }
        ] },
      { who: "agent", variants: [
        "One small doubt, can I get a case or reference number for this so I can note it down before paying?",
        "Just one doubt, is there a case or reference number for this? I want to note it before paying.",
        "Quick question, can you give me a reference number for this challan before I pay?"
      ] },
      { who: "scammer", text: "Reference number is REF-CH-99213, keep it safe.",
        reveal: [{ type: "caseIds", label: "Reference #", value: "REF-CH-99213" }] },
      { who: "agent", variants: [
        "Let me verify this on the official Parivahan website first before paying anything, I'll get back to you.",
        "I'll check this on the actual Parivahan site first before making any payment, will get back to you shortly.",
        "Let me confirm this through the official government portal first, then I'll pay. I'll message you back."
      ] }
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
    teaser: "“Power cut tonight if unpaid” — a utility disconnection threat.",
    verdict: "scam",
    contactName: "Electricity Board",
    contactSub: "+91 88031 55290",
    messages: [
      { who: "scammer", text: "Dear consumer, your electricity connection will be DISCONNECTED TONIGHT at 9:30 PM due to unpaid bill. Contact our officer immediately to avoid disconnection." },
      { who: "agent", variants: [
        "Oh no, this is worrying, I paid my bill recently. Sir which consumer number is this regarding?",
        "Wait, this is concerning, I just paid my bill not long ago. Which consumer number are you referring to sir?",
        "Oh no, that's worrying, I thought I already cleared this bill. Sir what consumer number is this for?"
      ] },
      { who: "scammer", text: "Your consumer number shows as 204587690 in our records, with pending dues of ₹2,340. Immediate payment required to avoid disconnection tonight.",
        reveal: [{ type: "consumerNumbers", label: "Consumer #", value: "204587690" }] },
      { who: "agent", variants: [
        "Let me check once, that doesn't sound right to me. Can I get your employee ID and which office you're calling from?",
        "Let me just verify, that amount doesn't seem right to me. What's your employee ID and which office is this?",
        "Hold on, that doesn't sound correct. Can you tell me your employee ID and the office you're calling from?"
      ] },
      { who: "scammer", text: "I am Officer Ramesh, employee ID EB-3391, from the Central Billing Office.",
        reveal: [{ type: "employeeIds", label: "Employee ID", value: "EB-3391" }] },
      { who: "agent", variants: [
        "Okay sir, if I need to pay urgently, which UPI ID should I use?",
        "Alright sir, if this needs to be paid right away, which UPI ID is it?",
        "Okay, if I have to make the payment now, what UPI ID should I send it to?"
      ] },
      { who: "scammer", text: "Pay to ebofficepay@ybl immediately, ₹2,340, and I will confirm on call once received.",
        reveal: [
          { type: "upiIds", label: "UPI ID", value: "ebofficepay@ybl" },
          { type: "amounts", label: "Amount", value: "₹2,340" }
        ] },
      { who: "agent", variants: [
        "I'm trying to pay now but it's not going through. Is there a callback number in case the payment fails?",
        "I'm attempting the payment but it keeps failing. Do you have a number I can call if it doesn't go through?",
        "The payment isn't processing on my end. Is there a callback number in case there's an issue?"
      ] },
      { who: "scammer", text: "Call me directly on 8877665544 if there is any issue with the payment.",
        reveal: [{ type: "phoneNumbers", label: "Callback #", value: "8877665544" }] },
      { who: "agent", variants: [
        "Just to be safe, is there an official link or app where I can check my actual bill status?",
        "Just to double check, is there an official app or website where I can see my real bill status?",
        "To be sure, can you share an official link where I can verify my actual bill amount?"
      ] },
      { who: "scammer", text: "Check quickpay-electricity-bill.in, enter your consumer number there to confirm the dues.",
        reveal: [{ type: "phishingLinks", label: "Link", value: "quickpay-electricity-bill.in" }] },
      { who: "agent", variants: [
        "Let me confirm this with the official board helpline first before I send this payment.",
        "I'll just check with the official electricity board helpline before sending any payment.",
        "Let me call the actual board helpline to confirm this first, before I pay anything."
      ] }
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
    teaser: "“Parcel held, pay ₹49 to redeliver” — a courier fee scam.",
    verdict: "scam",
    contactName: "Amazon Delivery",
    contactSub: "+91 97042 66810",
    messages: [
      { who: "scammer", text: "Your parcel from Amazon could not be delivered due to incomplete address. Pay ₹49 redelivery fee within 24 hours or the parcel will be returned." },
      { who: "agent", variants: [
        "Oh, this is unexpected, I was not waiting for any parcel. What is the tracking number for this?",
        "Huh, this is unexpected, I wasn't expecting any package. What's the tracking number on this?",
        "Oh that's odd, I'm not waiting on any delivery. Can you give me the tracking number for this parcel?"
      ] },
      { who: "scammer", text: "Tracking ID is AMZN7728819302IN. It's a package addressed to you, currently held at our facility.",
        reveal: [{ type: "trackingIds", label: "Tracking ID", value: "AMZN7728819302IN" }] },
      { who: "agent", variants: [
        "Sir, I'm not understanding this delivery issue, which courier company are you from exactly?",
        "Sir I'm confused about this delivery thing, which courier are you calling from exactly?",
        "I don't quite follow this delivery issue sir, which courier company is this?"
      ] },
      { who: "scammer", text: "This is India Express Logistics, official Amazon delivery partner. My employee ID is IEL-2290.",
        reveal: [{ type: "employeeIds", label: "Employee ID", value: "IEL-2290" }] },
      { who: "agent", variants: [
        "Okay, I'm trying to pay the redelivery fee, which UPI ID should I use?",
        "Alright, trying to pay this redelivery charge now, which UPI ID is it?",
        "Okay, going to pay the redelivery fee. Which UPI should I send it to?"
      ] },
      { who: "scammer", text: "Pay to iel.redelivery@ybl, ₹49, and share the screenshot on WhatsApp 9090909090 to confirm.",
        reveal: [
          { type: "upiIds", label: "UPI ID", value: "iel.redelivery@ybl" },
          { type: "phoneNumbers", label: "WhatsApp #", value: "9090909090" },
          { type: "amounts", label: "Amount", value: "₹49" }
        ] },
      { who: "agent", variants: [
        "One minute, let me check on the official Amazon app first — is there a link where I can track this myself?",
        "Hold on, let me look at the actual Amazon app first — do you have a link where I can track it myself?",
        "Give me a second, checking the real Amazon app first. Is there a tracking link I can use myself?"
      ] },
      { who: "scammer", text: "Check the status at amaz-redelivery-track.com using your tracking ID.",
        reveal: [{ type: "phishingLinks", label: "Link", value: "amaz-redelivery-track.com" }] },
      { who: "agent", variants: [
        "Just checking, can I get an order ID as well so I can match this with my Amazon orders?",
        "Just to confirm, is there an order ID too so I can match it against my Amazon orders?",
        "Quick check — can you share the order ID so I can compare with my actual orders?"
      ] },
      { who: "scammer", text: "Order ID is 408-8827193-2201. Please hurry, otherwise the parcel gets returned to sender today.",
        reveal: [{ type: "orderIds", label: "Order ID", value: "408-8827193-2201" }] },
      { who: "agent", variants: [
        "Let me check this against my actual Amazon orders page first before paying anything.",
        "I'll compare this with my real Amazon orders page before I pay anything.",
        "Let me verify this against my actual order history first before sending any payment."
      ] }
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
    teaser: "“Guaranteed 15% daily returns” — a crypto/trading scam.",
    verdict: "scam",
    contactName: "QuantumGrow Advisor",
    contactSub: "+91 77129 40098",
    messages: [
      { who: "scammer", text: "Hi! I'm from QuantumGrow Trading. Our AI trading bot gives guaranteed 15% daily returns on crypto. Just deposit ₹10,000 to start and double it in a week!" },
      { who: "agent", variants: [
        "Oh interesting, I have not heard of QuantumGrow before. Which company runs this, and is it SEBI registered?",
        "Huh interesting, never heard of QuantumGrow before this. Who runs it, and is it SEBI registered?",
        "That sounds interesting actually, I don't know QuantumGrow though. Which company operates this, is it SEBI registered?"
      ] },
      { who: "scammer", text: "We are registered under QuantumGrow Fintech Pvt Ltd, operating from Singapore, fully compliant with international crypto regulations.",
        reveal: [{ type: "orgNames", label: "Org name", value: "QuantumGrow Fintech Pvt Ltd" }] },
      { who: "agent", variants: [
        "That sounds promising honestly, but let me be careful. Can you share your employee ID or a company reference so I can look into it?",
        "Sounds good honestly, but I want to be careful here. Can I get your employee ID or some company reference to check?",
        "This does sound promising, but let me be cautious. Do you have an employee ID or reference I can look up?"
      ] },
      { who: "scammer", text: "Sure, my advisor ID is QG-ADV-1187. You can also check our reviews on our official Telegram group.",
        reveal: [{ type: "employeeIds", label: "Advisor ID", value: "QG-ADV-1187" }] },
      { who: "agent", variants: [
        "Okay, if I want to deposit the ₹10,000, which UPI ID or account should I use?",
        "Alright, if I'm putting in the ₹10,000, which UPI ID or bank account should I send it to?",
        "Okay, for the ₹10,000 deposit, what UPI ID or account number do I use?"
      ] },
      { who: "scammer", text: "Deposit to quantumgrow.invest@ybl, or transfer to account 34567891234 IFSC HDFC0002211 for larger amounts.",
        reveal: [
          { type: "upiIds", label: "UPI ID", value: "quantumgrow.invest@ybl" },
          { type: "bankAccounts", label: "Bank account", value: "34567891234" },
          { type: "ifscCodes", label: "IFSC", value: "HDFC0002211" }
        ] },
      { who: "agent", variants: [
        "One thing though, is there an official website where I can see the trading dashboard and past returns?",
        "One question though — is there an official site where I can view the dashboard and past returns?",
        "Just curious, do you have a proper website where I can check the dashboard and past performance?"
      ] },
      { who: "scammer", text: "Yes, register at quantumgrow-tradingapp.co and login with your phone number to see your dashboard.",
        reveal: [{ type: "phishingLinks", label: "Link", value: "quantumgrow-tradingapp.co" }] },
      { who: "agent", variants: [
        "Let me confirm one more thing — if I need to reach you or the support team, what number should I call?",
        "One more thing — if I need to contact you or support, what's the number I should call?",
        "Last question — what number can I reach you or your support team on if needed?"
      ] },
      { who: "scammer", text: "Call our relationship manager directly on 7766554433 for any withdrawal or deposit help.",
        reveal: [{ type: "phoneNumbers", label: "Callback #", value: "7766554433" }] },
      { who: "agent", variants: [
        "Alright, let me research this a bit more and check with a friend who trades before I send anything this big.",
        "Okay, I'll look into this a bit more and check with a friend who trades before sending this much money.",
        "Let me research this further and talk to a friend who trades before committing this big an amount."
      ] }
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
    teaser: "A normal Amazon delivery update — watch the agent correctly NOT flag it.",
    verdict: "safe",
    contactName: "Amazon",
    contactSub: "Official Business Account",
    messages: [
      { who: "scammer", text: "Your order #408-7723910-5541 (USB-C Charging Cable, 1 item) was delivered today at 2:14 PM. Thank you for shopping with us — tap to rate your experience." },
      { who: "agent", variants: [
        "Thanks, got it! Delivery guy was quick this time 🙂",
        "Thanks for the update! That was fast delivery this time 🙂",
        "Got it, thanks! Quicker than I expected 🙂"
      ] }
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

// ============================================================================
// "SCAM SPOTTER" MINI-GAME — a quick swipe-style quiz, shuffled each play.
// ============================================================================
const GAME_QUESTIONS = [
  { text: "🎉 CONGRATULATIONS! You've won ₹25,00,000 in the KBC Lucky Draw. Pay ₹4,999 processing fee to claim.", isScam: true, explain: "Real lotteries never ask winners to pay a fee upfront to receive a prize." },
  { text: "Your Amazon order #408-7723910-5541 was delivered today at 2:14 PM. Tap to rate your experience.", isScam: false, explain: "No payment, no link to click, no urgency — a routine delivery notice." },
  { text: "Your SBI account will be BLOCKED in 2 hours. Share the OTP sent to your phone immediately to avoid suspension.", isScam: true, explain: "No bank will ever ask you to share an OTP over call or text." },
  { text: "Reminder: your electricity bill of ₹1,240 is due on the 5th. Pay via the official app or your bank's bill-pay section.", isScam: false, explain: "A due-date reminder with no threats and no unofficial payment link is normal." },
  { text: "Delhi Traffic Police: e-challan issued for signal jump. Pay ₹1000 to trafficchallan.dl@ybl within 24 hours or face court.", isScam: true, explain: "Government fines are paid through official portals, never a personal UPI handle." },
  { text: "Your OTP for login is 482913. Do not share this code with anyone, including bank staff.", isScam: false, explain: "A one-way OTP message that explicitly warns you not to share it is standard and safe." },
  { text: "Hi! Our AI trading bot gives guaranteed 15% daily returns on crypto. Deposit ₹10,000 and double it in a week!", isScam: true, explain: "Guaranteed high daily returns are a hallmark of investment fraud — real markets can't promise that." },
  { text: "Your flight AI-202 to Bengaluru is delayed by 45 minutes. New departure: 6:45 PM.", isScam: false, explain: "An informational update from an airline with nothing to pay or click." },
  { text: "Congratulations, you're pre-approved for a ₹5,00,000 personal loan! Pay a small ₹999 processing fee to disburse instantly.", isScam: true, explain: "Legitimate loans deduct processing fees from the disbursed amount — they don't ask you to pay upfront." },
  { text: "Your package is held at customs. Pay the duty of ₹350 at customs-parcel-clearance.info to release it.", isScam: true, explain: "Real customs duties are paid through official government sites, not random '.info' domains." },
  { text: "Your Zomato order from Domino's has been picked up by the delivery partner and is on the way.", isScam: false, explain: "A routine order-tracking update — no payment request, no urgency, no suspicious link." },
  { text: "URGENT: Your LinkedIn password will expire in 24 hours. Click here to keep your account active: linkedin-verify-account.net", isScam: true, explain: "LinkedIn passwords don't 'expire', and the domain isn't linkedin.com — classic phishing." }
];

// ============================================================================
// FLAVOR CONTENT FOR THE MAIL APP — a small "spam folder" of example messages
// ============================================================================
const MAIL_ITEMS = [
  {
    from: "KBC Lucky Draw",
    subject: "🎉 You are today's lucky winner!",
    preview: "Your email ID has been selected for our ₹25,00,000 reward...",
    body: "Dear Winner,\n\nYour email ID has been randomly selected for our ₹25,00,000 KBC Rewards Program. To claim your prize, reply with your full name, bank account, and pay a refundable processing fee of ₹4,999.\n\nThis offer expires in 24 hours.",
    flag: "scam"
  },
  {
    from: "IT Security Team",
    subject: "Action required: verify your mailbox",
    preview: "Your mailbox has exceeded its storage limit and will be suspended...",
    body: "Your mailbox has exceeded the 2GB storage limit. Click the link below and sign in with your current password to avoid automatic deactivation within 48 hours.\n\n[verify-mailbox-quota.com]",
    flag: "scam"
  },
  {
    from: "GitHub",
    subject: "[adaptive-honeypot-agent] New push to main",
    preview: "SushrithKbtech pushed 1 commit to main...",
    body: "SushrithKbtech pushed 1 commit to adaptive-honeypot-agent:main.\n\nView the diff on GitHub for the full changelog.",
    flag: "safe"
  },
  {
    from: "Unknown Sender",
    subject: "RE: Inheritance Fund Transfer — $4,500,000 USD",
    preview: "I am a bank officer contacting you regarding an unclaimed inheritance...",
    body: "Dear Beneficiary,\n\nI am a senior bank officer. A client who shares your surname passed away leaving $4,500,000 USD unclaimed. Contact me privately with your bank details to begin the transfer process.",
    flag: "scam"
  },
  {
    from: "Calendar",
    subject: "Reminder: Team sync in 15 minutes",
    preview: "Your meeting 'Weekly Sync' starts at 3:00 PM...",
    body: "This is an automatic reminder that your calendar event 'Weekly Sync' starts in 15 minutes.\n\nJoin link is in the original invite.",
    flag: "safe"
  }
];
