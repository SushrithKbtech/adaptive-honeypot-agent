const test = require("node:test");
const assert = require("node:assert/strict");

const AdaptiveHoneypotAgent = require("../src/honeypotAgent");

test("detectScamType identifies lottery_prize messages", () => {
  const agent = new AdaptiveHoneypotAgent("sk-test");
  const scamType = agent.detectScamType(
    "Congratulations! You won 25 lakh in lucky draw. Pay processing fee now.",
    []
  );

  assert.equal(scamType, "lottery_prize");
});

test("extractIntelligence captures phone, UPI, and links", () => {
  const agent = new AdaptiveHoneypotAgent("sk-test");
  const message =
    "Call +91-9876543210 and pay via winner.claim@upi. Use https://fake-prize-site.com/claim now.";

  const intel = agent.extractIntelligence(message, []);

  assert.ok(Array.isArray(intel.phoneNumbers));
  assert.ok(Array.isArray(intel.upiIds));
  assert.ok(Array.isArray(intel.phishingLinks));

  assert.ok(intel.phoneNumbers.length > 0);
  assert.ok(intel.upiIds.length > 0);
  assert.ok(intel.phishingLinks.length > 0);
});
