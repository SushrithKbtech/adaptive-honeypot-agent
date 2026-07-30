// ============================================================================
// PHONE SIMULATION ORCHESTRATION
// Boot screen -> Home screen -> tap WhatsApp -> scripted conversation ->
// verdict banner + final report. Everything here is deterministic playback
// of the SCENARIOS data (scenarios.js) — no network calls, no cost.
// ============================================================================

const state = {
  scenario: SCENARIOS[0],
  runId: 0,
  stepIndex: 0,
  playing: false,
  booting: false,
  bootedOnce: false,
  seenIntel: new Set(),
  intelCount: 0,
  clockMinutes: 41 // fake WhatsApp timestamps, starts at 9:41
};

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const MIC_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4"/></svg>';
const SEND_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M3 20l18-8L3 4v6l12 2-12 2z"/></svg>';

/* ============================================================================
   SCAM PICKER MODAL — shown before the phone boots, so the visitor chooses
   which scam to watch instead of always seeing the same default one.
============================================================================ */
function renderPicker() {
  const grid = $("picker-grid");
  grid.innerHTML = "";
  SCENARIOS.forEach((sc) => {
    const btn = document.createElement("button");
    btn.className = "picker-option" + (sc.verdict === "safe" ? " is-safe" : "");
    btn.innerHTML = `
      <span class="picker-option__icon">${sc.icon}</span>
      <span>
        <span class="picker-option__label">${sc.label}</span>
        <span class="picker-option__teaser">${sc.teaser || ""}</span>
      </span>`;
    btn.addEventListener("click", () => choosePickerScenario(sc.id));
    grid.appendChild(btn);
  });
}

function openPicker() {
  const backdrop = $("picker-backdrop");
  backdrop.classList.remove("hidden");
  setTimeout(() => backdrop.classList.add("is-shown"), 20);
}

function closePicker() {
  const backdrop = $("picker-backdrop");
  backdrop.classList.remove("is-shown");
  setTimeout(() => backdrop.classList.add("hidden"), 250);
}

function choosePickerScenario(id) {
  closePicker();
  const scenario = SCENARIOS.find((s) => s.id === id) || SCENARIOS[0];
  state.scenario = scenario;
  setActiveTab(scenario.id);
  updateWaHeader();

  document.getElementById("simulation").scrollIntoView({ behavior: "smooth", block: "start" });

  // Force a full fresh boot for the chosen scenario, even if one already played.
  state.runId += 1;
  state.bootedOnce = false;
  state.booting = false;
  $("phone-notification").classList.add("hidden");
  $("phone-notification").classList.remove("is-shown", "is-pressed");
  runBootSequence();
}

/* ============================================================================
   SCENARIO TABS
============================================================================ */
function renderScenarioTabs() {
  const wrap = $("scenario-tabs");
  wrap.innerHTML = "";
  SCENARIOS.forEach((sc) => {
    const btn = document.createElement("button");
    btn.className = "scenario-tab" + (sc.id === state.scenario.id ? " is-active" : "");
    btn.dataset.id = sc.id;
    btn.innerHTML = `<span>${sc.icon}</span><span>${sc.label}</span>`;
    btn.addEventListener("click", () => switchScenario(sc.id));
    wrap.appendChild(btn);
  });
}

function setActiveTab(id) {
  document.querySelectorAll(".scenario-tab").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.id === id);
  });
}

function switchScenario(id) {
  if (state.scenario.id === id && state.bootedOnce) return;
  state.scenario = SCENARIOS.find((s) => s.id === id) || SCENARIOS[0];
  setActiveTab(state.scenario.id);
  updateWaHeader();
  if (!state.booting && state.bootedOnce) {
    startFreshConversation(true);
  }
}

function updateWaHeader() {
  $("wa-avatar").textContent = state.scenario.icon;
  $("wa-contact-name").textContent = state.scenario.contactName;
  $("wa-contact-sub").textContent = state.scenario.contactSub;
}

/* ============================================================================
   SCREEN SWITCHING
============================================================================ */
function showScreen(name) {
  document.querySelectorAll(".screen").forEach((el) => el.classList.remove("is-active"));
  $(`screen-${name}`).classList.add("is-active");
}

async function tapWhatsAppIcon() {
  const icon = $("wa-icon");
  const ripple = $("tap-ripple");
  icon.classList.add("is-pressed");
  ripple.classList.add("is-firing");
  await sleep(550);
  ripple.classList.remove("is-firing");
  await sleep(150);
  icon.classList.remove("is-pressed");
}

// Shows an incoming WhatsApp notification for the current scenario's opening
// scam message, then auto-simulates a tap on it to open the chat — mirrors
// how someone would actually encounter this (a notification, not a cold app open).
async function presentNotificationAndOpen(runId) {
  const notif = $("phone-notification");
  const opener = state.scenario.messages.find((m) => m.who === "scammer");
  $("notif-contact").textContent = state.scenario.contactName;
  $("notif-text").textContent = opener ? opener.text : "New message";

  notif.classList.remove("hidden");
  await sleep(30);
  if (runId !== state.runId) return;
  notif.classList.add("is-shown");

  await sleep(1500);
  if (runId !== state.runId) return;

  const ripple = $("notif-ripple");
  notif.classList.add("is-pressed");
  ripple.classList.add("is-firing");
  await sleep(450);
  ripple.classList.remove("is-firing");
  notif.classList.remove("is-pressed");
  notif.classList.remove("is-shown");
  await sleep(350);
  notif.classList.add("hidden");
}

async function runBootSequence() {
  if (state.booting) return;
  state.booting = true;
  const runId = state.runId;
  showScreen("boot");
  await sleep(1700);
  if (runId !== state.runId) { state.booting = false; return; }
  showScreen("home");
  await sleep(1600);
  if (runId !== state.runId) { state.booting = false; return; }
  await presentNotificationAndOpen(runId);
  if (runId !== state.runId) { state.booting = false; return; }
  showScreen("whatsapp");
  state.booting = false;
  state.bootedOnce = true;
  updateWaHeader();
  startFreshConversation(true);
}

/* ============================================================================
   CHAT RENDERING
============================================================================ */
function nextTimestamp() {
  state.clockMinutes += 1 + Math.floor(Math.random() * 2);
  const hour = 9 + Math.floor(state.clockMinutes / 60);
  const min = state.clockMinutes % 60;
  const h12 = ((hour - 1) % 12) + 1;
  const ampm = hour >= 12 && hour < 24 ? "PM" : "AM";
  return `${h12}:${String(min).padStart(2, "0")} ${ampm}`;
}

function scrollChatToBottom() {
  const body = $("sim-messages");
  body.scrollTop = body.scrollHeight;
}

function appendMessage(who, text) {
  const wrap = document.createElement("div");
  wrap.className = `msg msg--${who}`;
  const tick = who === "agent" ? '<span class="msg__tick">✓✓</span>' : "";
  wrap.innerHTML = `
    <div class="msg__bubble">
      <span class="msg__text"></span>
      <span class="msg__meta">${nextTimestamp()}${tick}</span>
    </div>`;
  wrap.querySelector(".msg__text").textContent = text;
  $("sim-messages").appendChild(wrap);
  scrollChatToBottom();
}

function appendTyping(who) {
  removeTyping();
  const wrap = document.createElement("div");
  wrap.id = "typing-indicator";
  wrap.className = `typing typing--${who}`;
  wrap.innerHTML = "<span></span><span></span><span></span>";
  $("sim-messages").appendChild(wrap);
  scrollChatToBottom();
}

function removeTyping() {
  const el = $("typing-indicator");
  if (el) el.remove();
}

async function typeIntoInputField(text, runId) {
  const textEl = $("wa-input-text");
  const sendIcon = $("wa-send-icon");
  textEl.textContent = "";
  sendIcon.innerHTML = SEND_SVG;
  const interval = Math.max(9, Math.min(32, 900 / Math.max(text.length, 1)));
  for (let i = 1; i <= text.length; i++) {
    if (runId !== state.runId) return false;
    textEl.textContent = text.slice(0, i);
    await sleep(interval);
  }
  await sleep(260);
  if (runId !== state.runId) return false;
  textEl.textContent = "";
  sendIcon.innerHTML = MIC_SVG;
  return true;
}

/* ============================================================================
   INTEL PANEL
============================================================================ */
function resetIntelPanel() {
  state.seenIntel = new Set();
  state.intelCount = 0;
  $("intel-list").innerHTML = '<p class="sim__intel-empty" id="intel-empty">Nothing extracted yet — keep the conversation running.</p>';
  $("intel-count").textContent = "0 items";
}

function revealIntel(item) {
  const key = `${item.type}:${item.value}`;
  if (state.seenIntel.has(key)) return;
  state.seenIntel.add(key);

  const empty = $("intel-empty");
  if (empty) empty.remove();

  const meta = INTEL_TYPE_META[item.type] || { label: item.label || item.type, icon: "🔎" };
  const chip = document.createElement("div");
  chip.className = "intel-chip";
  chip.innerHTML = `
    <span class="intel-chip__icon">${meta.icon}</span>
    <div>
      <div class="intel-chip__label">${item.label || meta.label}</div>
      <div class="intel-chip__value">${item.value}</div>
    </div>`;
  $("intel-list").appendChild(chip);

  state.intelCount += 1;
  $("intel-count").textContent = `${state.intelCount} item${state.intelCount === 1 ? "" : "s"}`;
}

/* ============================================================================
   FINAL REPORT + VERDICT BANNER
============================================================================ */
function severityClass(sev) {
  return `sev-${(sev || "medium").toLowerCase()}`;
}

function renderReport(scenario) {
  const report = scenario.finalReport;
  const box = $("sim-report");
  box.classList.toggle("is-safe", scenario.verdict === "safe");

  if (scenario.verdict === "safe") {
    box.innerHTML = `
      <span class="report-verdict-pill">✅ NOT A SCAM</span>
      <h3>Classification Report</h3>
      <div class="report-grid">
        <div class="report-cell"><div class="report-cell__label">Scam type</div><div class="report-cell__value">none</div></div>
        <div class="report-cell"><div class="report-cell__label">Risk score</div><div class="report-cell__value">${Math.round(report.confidenceLevel * 100)}%</div></div>
        <div class="report-cell"><div class="report-cell__label">Messages</div><div class="report-cell__value">${report.totalMessagesExchanged}</div></div>
        <div class="report-cell"><div class="report-cell__label">Duration</div><div class="report-cell__value">${report.engagementDurationSeconds}s</div></div>
      </div>
      <h4>Why it's safe</h4>
      <ul class="reasoning-list">
        ${report.verdictReasoning.map((r) => `<li class="reasoning-item">${r.note}</li>`).join("")}
      </ul>
      <h4>Agent Notes</h4>
      <p class="report-notes">${report.agentNotes}</p>
    `;
  } else {
    box.innerHTML = `
      <span class="report-verdict-pill">🚩 SCAM DETECTED</span>
      <h3>Final Report</h3>
      <div class="report-grid">
        <div class="report-cell"><div class="report-cell__label">Scam type</div><div class="report-cell__value">${report.scamType}</div></div>
        <div class="report-cell"><div class="report-cell__label">Confidence</div><div class="report-cell__value">${Math.round(report.confidenceLevel * 100)}%</div></div>
        <div class="report-cell"><div class="report-cell__label">Messages</div><div class="report-cell__value">${report.totalMessagesExchanged}</div></div>
        <div class="report-cell"><div class="report-cell__label">Duration</div><div class="report-cell__value">${report.engagementDurationSeconds}s</div></div>
      </div>
      <h4>Red Flags</h4>
      <ul class="report-flags">
        ${report.redFlags.map((f) => `<li class="report-flag ${severityClass(f.severity)}"><b>${f.type.replace(/_/g, " ")}</b> — ${f.evidence}</li>`).join("")}
      </ul>
      <h4>Agent Notes</h4>
      <p class="report-notes">${report.agentNotes}</p>
    `;
  }
  box.classList.remove("hidden");
}

function showVerdictBanner(scenario) {
  const banner = $("verdict-banner");
  const isSafe = scenario.verdict === "safe";
  banner.classList.toggle("is-safe", isSafe);
  $("verdict-icon").textContent = isSafe ? "✅" : "🚩";
  $("verdict-title").textContent = isSafe ? "LOOKS LEGITIMATE" : "SCAM DETECTED";
  $("verdict-sub").textContent = isSafe
    ? `no scam indicators · ${Math.round(scenario.finalReport.confidenceLevel * 100)}% risk score`
    : `${scenario.finalReport.scamType} · ${Math.round(scenario.finalReport.confidenceLevel * 100)}% confidence`;
  banner.classList.remove("hidden");
  setTimeout(() => banner.classList.add("is-shown"), 20);
}

function hideVerdictBanner() {
  const banner = $("verdict-banner");
  banner.classList.remove("is-shown");
  banner.classList.add("hidden");
}

/* ============================================================================
   CONVERSATION PLAYBACK
============================================================================ */
function updatePlayButton() {
  const btn = $("btn-play");
  if (state.stepIndex >= state.scenario.messages.length) {
    btn.innerHTML = "↺ Replay";
  } else {
    btn.innerHTML = state.playing ? "⏸ Pause" : "▶ Play";
  }
}

async function playOneMessage(msg, runId) {
  if (msg.who === "scammer") {
    appendTyping("scammer");
    await sleep(600 + Math.random() * 500);
    if (runId !== state.runId) return;
    removeTyping();
    appendMessage("scammer", msg.text);
    if (msg.reveal && msg.reveal.length) {
      for (const item of msg.reveal) {
        if (runId !== state.runId) return;
        revealIntel(item);
        await sleep(200);
      }
    }
    await sleep(450);
  } else {
    await sleep(350);
    if (runId !== state.runId) return;
    const ok = await typeIntoInputField(msg.text, runId);
    if (!ok || runId !== state.runId) return;
    appendMessage("agent", msg.text);
    await sleep(300);
  }
}

async function runConversation(runId) {
  const scenario = state.scenario;
  while (state.stepIndex < scenario.messages.length) {
    if (runId !== state.runId || !state.playing) return;
    const msg = scenario.messages[state.stepIndex];
    await playOneMessage(msg, runId);
    if (runId !== state.runId) return;
    state.stepIndex += 1;
    updatePlayButton();
    await sleep(200);
  }
  if (runId !== state.runId) return;
  state.playing = false;
  updatePlayButton();
  renderReport(scenario);
  showVerdictBanner(scenario);
}

function startFreshConversation(autoPlay) {
  state.runId += 1;
  const runId = state.runId;
  state.stepIndex = 0;
  state.playing = !!autoPlay;
  state.clockMinutes = 41;

  removeTyping();
  $("sim-messages").innerHTML = '<div class="wa-encryption-note">🔒 Messages are simulated for this demo — no live model calls</div>';
  resetIntelPanel();
  $("sim-report").classList.add("hidden");
  hideVerdictBanner();
  $("wa-input-text").textContent = "";
  $("wa-send-icon").innerHTML = MIC_SVG;
  updatePlayButton();

  if (autoPlay) runConversation(runId);
}

/* ============================================================================
   CONTROLS
============================================================================ */
function wireControls() {
  $("btn-play").addEventListener("click", () => {
    if (state.stepIndex >= state.scenario.messages.length) {
      startFreshConversation(true);
      return;
    }
    state.playing = !state.playing;
    updatePlayButton();
    if (state.playing) runConversation(state.runId);
  });

  $("btn-replay").addEventListener("click", () => startFreshConversation(true));

  $("btn-reboot").addEventListener("click", () => {
    state.runId += 1; // invalidate any in-flight conversation
    state.bootedOnce = false;
    state.booting = false;
    $("phone-notification").classList.add("hidden");
    $("phone-notification").classList.remove("is-shown", "is-pressed");
    runBootSequence();
  });

  // Optional manual fallback: tapping the WhatsApp icon directly on the
  // home screen also opens the chat, in case someone wants to skip waiting
  // for the notification.
  $("wa-icon").addEventListener("click", async () => {
    if (state.booting || !$("screen-home").classList.contains("is-active")) return;
    $("phone-notification").classList.add("hidden");
    $("phone-notification").classList.remove("is-shown", "is-pressed");
    await tapWhatsAppIcon();
    showScreen("whatsapp");
    state.bootedOnce = true;
    updateWaHeader();
    startFreshConversation(true);
  });

  // Hero CTA opens the scam picker first — the boot/notification/WhatsApp
  // sequence only starts once a scam type is actually chosen.
  $("btn-watch-sim").addEventListener("click", (e) => {
    e.preventDefault();
    openPicker();
  });

  $("picker-close").addEventListener("click", closePicker);
  $("picker-backdrop").addEventListener("click", (e) => {
    if (e.target.id === "picker-backdrop") closePicker();
  });
}

/* ============================================================================
   LIVE API STATUS BADGE (optional, zero-cost GET to /health)
============================================================================ */
async function checkApiStatus() {
  const dot = $("api-status-dot");
  const text = $("api-status-text");
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);
    const res = await fetch("https://honeypot-api-8r4t.onrender.com/health", { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      dot.classList.add("is-online");
      text.textContent = "Live backend running";
      return;
    }
    throw new Error("not ok");
  } catch (e) {
    dot.classList.add("is-offline");
    text.textContent = "Backend idle (cold start) — demo below is fully simulated";
  }
}

/* ============================================================================
   INIT
============================================================================ */
function initSimulationObserver() {
  const section = document.getElementById("simulation");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !state.bootedOnce && !state.booting) {
          openPicker();
          observer.disconnect();
        }
      });
    },
    { threshold: 0.4 }
  );
  observer.observe(section);
}

document.addEventListener("DOMContentLoaded", () => {
  renderScenarioTabs();
  renderPicker();
  updateWaHeader();
  wireControls();
  checkApiStatus();
  initSimulationObserver();
});
