from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Dict, List, Tuple


@dataclass
class DetectionResult:
    scam_type: str
    confidence: float
    matched_keywords: List[str]


class HoneypotAgent:
    def __init__(self) -> None:
        self._scam_keywords: Dict[str, List[str]] = {
            "kyc_update": ["kyc", "update kyc", "suspended", "bank account", "verify"],
            "lottery_prize": ["lottery", "winner", "jackpot", "prize", "claim"],
            "job_offer": ["job", "offer", "hr", "interview", "salary"],
            "electricity_bill": ["electricity", "power", "disconnected", "bill", "payment due"],
            "traffic_challan": ["challan", "traffic", "fine", "penalty"],
            "upi_payment": ["upi", "collect request", "pay", "scan", "qr"],
        }

    def detect_scam(self, text: str) -> DetectionResult:
        text_lc = text.lower()
        best_type = "unknown"
        best_hits: List[str] = []

        for scam_type, keywords in self._scam_keywords.items():
            hits = [kw for kw in keywords if kw in text_lc]
            if len(hits) > len(best_hits):
                best_hits = hits
                best_type = scam_type

        confidence = 0.2 if best_type == "unknown" else min(0.9, 0.2 + 0.15 * len(best_hits))
        return DetectionResult(scam_type=best_type, confidence=confidence, matched_keywords=best_hits)

    def extract_intel(self, text: str) -> Dict[str, List[str]]:
        upi_pattern = r"\b[a-zA-Z0-9._-]+@[a-zA-Z]{2,}\b"
        phone_pattern = r"\b(?:\+?91[-\s]?)?[6-9]\d{9}\b"
        bank_pattern = r"\b(?:ifsc|account|acct|bank)\s*[:#-]?\s*[A-Za-z0-9]{4,}\b"

        return {
            "upi_ids": re.findall(upi_pattern, text),
            "phone_numbers": re.findall(phone_pattern, text),
            "bank_markers": re.findall(bank_pattern, text, flags=re.IGNORECASE),
        }

    def craft_response(self, text: str, scam_type: str, turn: int) -> str:
        reaction = self._reaction_for_scam(scam_type)
        bridge = self._bridge_question(scam_type, turn)
        return f"{reaction} {bridge}".strip()

    def _reaction_for_scam(self, scam_type: str) -> str:
        reactions = {
            "kyc_update": "Oh no, I just updated my KYC last month.",
            "lottery_prize": "Wait, I won something?",
            "job_offer": "That sounds promising, I really need work.",
            "electricity_bill": "This is a shock, I paid my bill already.",
            "traffic_challan": "That is surprising, I do not drive much.",
            "upi_payment": "Hmm, the payment is failing on my end.",
            "unknown": "I am a bit confused, but I want to resolve this.",
        }
        return reactions.get(scam_type, reactions["unknown"])

    def _bridge_question(self, scam_type: str, turn: int) -> str:
        bridges: Dict[str, List[str]] = {
            "kyc_update": [
                "Which bank is this for and what is the reference number?",
                "Can you confirm the last 4 digits of the account you see?",
            ],
            "lottery_prize": [
                "Which company is running the lottery and what is the claim ID?",
                "Is there a helpline number I can call to verify this?",
            ],
            "job_offer": [
                "Which company is this and can you share the HR contact?",
                "Is there an official email I can reply to for verification?",
            ],
            "electricity_bill": [
                "Can you share the consumer number and the bill reference?",
                "Which office issued this notice?",
            ],
            "traffic_challan": [
                "What is the challan number and vehicle number listed?",
                "Can you share the payment portal name?",
            ],
            "upi_payment": [
                "Can you send the exact UPI ID again?",
                "Is there an alternate UPI ID or bank account if the app fails?",
            ],
            "unknown": [
                "Can you share a reference ID so I can check?",
                "Who should I contact to verify this?",
            ],
        }

        options = bridges.get(scam_type, bridges["unknown"])
        return options[turn % len(options)]