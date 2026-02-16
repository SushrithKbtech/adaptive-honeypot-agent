from __future__ import annotations

import os
from typing import Any, Dict

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

from honeypot_agent import HoneypotAgent

load_dotenv()

app = FastAPI(title="Honeypot API", version="1.0.0")
agent = HoneypotAgent()

_sessions: Dict[str, Dict[str, Any]] = {}


class MessagePayload(BaseModel):
    text: str = Field(..., min_length=1)


class HoneypotRequest(BaseModel):
    sessionId: str = Field(..., min_length=1)
    message: MessagePayload


class HoneypotResponse(BaseModel):
    sessionId: str
    scamType: str
    confidence: float
    response: str
    intel: Dict[str, Any]
    turn: int


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/honeypot", response_model=HoneypotResponse)
def honeypot(payload: HoneypotRequest, x_api_key: str | None = Header(default=None)) -> HoneypotResponse:
    expected_key = os.getenv("API_KEY")
    if expected_key and x_api_key != expected_key:
        raise HTTPException(status_code=401, detail="Invalid API key")

    session = _sessions.setdefault(payload.sessionId, {"turn": 0})
    session["turn"] += 1
    turn = session["turn"]

    detection = agent.detect_scam(payload.message.text)
    intel = agent.extract_intel(payload.message.text)
    response_text = agent.craft_response(payload.message.text, detection.scam_type, turn)

    return HoneypotResponse(
        sessionId=payload.sessionId,
        scamType=detection.scam_type,
        confidence=detection.confidence,
        response=response_text,
        intel=intel,
        turn=turn,
    )