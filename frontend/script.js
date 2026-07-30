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

// Dismissing the picker without choosing a scenario (the ✕ or backdrop)
// must not leave the phone stuck on the boot screen forever — its spinner
// runs via plain CSS the instant it's visible, with or without JS ever
// having kicked off runBootSequence(). So "unlock" straight to the home
// screen instead, letting the user explore the phone manually.
function unlockToHomeIfNeeded() {
  if (state.bootedOnce || state.booting) return;
  state.bootedOnce = true;
  showScreen("home");
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
   REAL CLOCK — the status bar and home screen show the visitor's actual
   local time/date, refreshed every few seconds, like a real phone.
============================================================================ */
function updateRealClock() {
  const now = new Date();
  let h = now.getHours() % 12;
  if (h === 0) h = 12;
  const m = String(now.getMinutes()).padStart(2, "0");
  const time = `${h}:${m}`;
  document.querySelectorAll(".status-bar__time").forEach((el) => { el.textContent = time; });

  const clockEl = document.querySelector(".home__clock");
  if (clockEl) clockEl.textContent = time;
  const dateEl = document.querySelector(".home__date");
  if (dateEl) {
    dateEl.textContent = now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
  }
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

// True when the phone's own toggles say it has connectivity — WhatsApp
// delivery ticks and live replies key off this, like the real app.
function isOnline() {
  const get = (key) => appState.settings.find((s) => s.key === key);
  return get("wifi").on && !get("airplane").on;
}

function appendMessage(who, text) {
  const wrap = document.createElement("div");
  wrap.className = `msg msg--${who}`;
  // Offline sends show WhatsApp's pending clock instead of ticks until
  // connectivity comes back (deliverPendingMessages upgrades them).
  const tick = who === "agent"
    ? (isOnline()
      ? '<span class="msg__tick">✓✓</span>'
      : '<span class="msg__tick msg__tick--pending" title="Waiting for network">🕓</span>')
    : "";
  wrap.innerHTML = `
    <div class="msg__bubble">
      <span class="msg__text"></span>
      <span class="msg__meta">${nextTimestamp()}${tick}</span>
    </div>`;
  wrap.querySelector(".msg__text").textContent = text;
  $("sim-messages").appendChild(wrap);
  scrollChatToBottom();
}

// Called when connectivity is restored: pending clocks become ticks, and if
// the user had sent live messages into the void, one queued reply arrives.
function deliverPendingMessages() {
  const pending = document.querySelectorAll(".msg__tick--pending");
  if (pending.length === 0) return;
  pending.forEach((el) => {
    el.textContent = "✓✓";
    el.classList.remove("msg__tick--pending");
    el.removeAttribute("title");
  });
  if ($("wa-inputbar").classList.contains("is-live")) {
    setTimeout(() => replyToLiveMessage(), 600);
  }
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

  // Auto-dismiss after 5s — but only if this same conversation is still the
  // active one (guards against a stale timeout hiding a newer banner).
  const runIdAtShow = state.runId;
  setTimeout(() => {
    if (state.runId === runIdAtShow) hideVerdictBanner();
  }, 5000);
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

// Agent lines carry a few phrasing variants so replays don't feel identical;
// scammer lines stay fixed since their exact wording drives the reveal data.
function pickMessageText(msg) {
  if (msg.variants && msg.variants.length) {
    return msg.variants[Math.floor(Math.random() * msg.variants.length)];
  }
  return msg.text;
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
    const text = pickMessageText(msg);
    await sleep(350);
    if (runId !== state.runId) return;
    const ok = await typeIntoInputField(text, runId);
    if (!ok || runId !== state.runId) return;
    appendMessage("agent", text);
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
  enableLiveChat();
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
  disableLiveChat();
  updatePlayButton();

  if (autoPlay) runConversation(runId);
}

// ---- Free typing in WhatsApp once the scripted conversation has finished ----
function enableLiveChat() {
  const bar = $("wa-inputbar");
  bar.classList.add("is-live");
  const input = $("wa-live-input");
  input.value = "";
  input.focus();
}

function disableLiveChat() {
  $("wa-inputbar").classList.remove("is-live");
  $("wa-live-input").value = "";
}

function sendLiveMessage() {
  const input = $("wa-live-input");
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  appendMessage("agent", text);
  replyToLiveMessage();
}

async function replyToLiveMessage() {
  // No network, no reply — the message just sits there with its pending
  // clock until connectivity returns (see deliverPendingMessages).
  if (!isOnline()) return;
  const runId = state.runId;
  appendTyping("scammer");
  await sleep(900 + Math.random() * 700);
  if (runId !== state.runId) return;
  removeTyping();
  const scenario = state.scenario;
  const pool = scenario.verdict === "safe"
    ? ["Thanks for letting us know!", "Noted, have a great day!", "Appreciate the quick reply 🙂"]
    : [
        "Sir please hurry, this offer is time sensitive.",
        "Waiting for your confirmation sir, please complete it soon.",
        "Any update on the payment sir?",
        "Sir are you still there? Please respond quickly.",
        "This will lapse soon, please don't delay further."
      ];
  appendMessage("scammer", pool[Math.floor(Math.random() * pool.length)]);
}

/* ============================================================================
   MINI-APPS — the rest of the home screen actually does something once the
   phone is on. All state here is in-memory only, reset on full reboot.
============================================================================ */
const appState = {
  settings: [
    { key: "wifi", icon: "📶", label: "Wi-Fi", on: true },
    { key: "bt", icon: "🔵", label: "Bluetooth", on: false },
    { key: "airplane", icon: "✈️", label: "Airplane Mode", on: false },
    { key: "notif", icon: "🔔", label: "Notifications", on: true },
    { key: "dark", icon: "🌙", label: "Dark Mode", on: true }
  ],
  cameraShots: 0,
  mailViewingDetail: false,
  waOpened: new Set(),
  game: { order: [], index: 0, score: 0, answered: false }
};

function goHome() {
  showScreen("home");
}

function goToWhatsAppList() {
  renderWhatsAppChatList();
  showScreen("whatsapp-list");
}

function wireAppNavigation() {
  document.querySelectorAll(".app-back[data-back]").forEach((btn) => {
    btn.addEventListener("click", goHome);
  });
  $("wa-back-btn").addEventListener("click", goToWhatsAppList);

  $("icon-phone").addEventListener("click", () => {
    renderCallLog();
    showScreen("phone");
  });
  $("icon-camera").addEventListener("click", () => showScreen("camera"));
  $("icon-settings").addEventListener("click", () => {
    renderSettings();
    showScreen("settings");
  });
  $("icon-gallery").addEventListener("click", () => {
    renderGallery();
    showScreen("gallery");
  });
  $("icon-mail").addEventListener("click", () => {
    appState.mailViewingDetail = false;
    renderMailList();
    showScreen("mail");
  });
  $("icon-game").addEventListener("click", () => {
    startGame();
    showScreen("game");
  });

  $("camera-shutter").addEventListener("click", captureCameraShot);

  $("mail-back-btn").addEventListener("click", () => {
    if (appState.mailViewingDetail) {
      appState.mailViewingDetail = false;
      renderMailList();
    } else {
      goHome();
    }
  });

  $("game-btn-legit").addEventListener("click", () => answerGame(false));
  $("game-btn-scam").addEventListener("click", () => answerGame(true));
  $("game-next").addEventListener("click", nextGameQuestion);
  $("game-replay").addEventListener("click", startGame);

  // Live chat (only active once the scripted conversation has finished)
  $("wa-live-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendLiveMessage();
  });
  $("wa-send-icon").addEventListener("click", () => {
    if ($("wa-inputbar").classList.contains("is-live")) sendLiveMessage();
  });
}

// ---- WhatsApp chat list: multiple contacts, like a real inbox ----
function renderWhatsAppChatList() {
  const list = $("wa-chat-list");
  list.innerHTML = "";
  SCENARIOS.forEach((sc) => {
    const opener = sc.messages.find((m) => m.who === "scammer");
    const row = document.createElement("div");
    row.className = "wa-chat-list__item";
    const unread = appState.waOpened.has(sc.id) ? "" : '<span class="wa-chat-list__unread"></span>';
    row.innerHTML = `
      <div class="wa-chat-list__avatar">${sc.icon}</div>
      <div class="wa-chat-list__info">
        <div class="wa-chat-list__name">${sc.contactName}</div>
        <div class="wa-chat-list__preview">${opener ? opener.text : ""}</div>
      </div>
      <div class="wa-chat-list__meta">
        <span class="wa-chat-list__time">${sc.verdict === "safe" ? "9:41" : "9:4" + (SCENARIOS.indexOf(sc) % 9)}</span>
        ${unread}
      </div>`;
    row.addEventListener("click", () => openWhatsAppChat(sc.id));
    list.appendChild(row);
  });
}

// Opening a chat from the WhatsApp list is "explore freely" mode — it does
// NOT auto-play the scripted scenario. It just opens the thread and hands
// control straight to the user, who can type whatever they want. (The full
// scripted walkthrough is what the hero picker / notification flow is for.)
function openWhatsAppChat(id) {
  const scenario = SCENARIOS.find((s) => s.id === id) || SCENARIOS[0];
  appState.waOpened.add(id);
  state.scenario = scenario;
  setActiveTab(scenario.id);
  updateWaHeader();
  showScreen("whatsapp");
  startFreshConversation(false);
  enableLiveChat();
}

// ---- Phone: call log ----
function renderCallLog() {
  const log = $("call-log");
  log.innerHTML = "";
  SCENARIOS.filter((s) => s.verdict === "scam").forEach((sc, i) => {
    const row = document.createElement("div");
    row.className = "call-log__item";
    row.innerHTML = `
      <div class="call-log__avatar">${sc.icon}</div>
      <div class="call-log__info">
        <div class="call-log__name">${sc.contactName}</div>
        <div class="call-log__meta">Missed call · ${sc.contactSub}</div>
      </div>
      <div class="call-log__time">${9 + i}:0${i}${i % 2 ? " PM" : " AM"}</div>`;
    row.addEventListener("click", () => startCall(sc.id));
    log.appendChild(row);
  });
}

/* ============================================================================
   VOICE CALL — the scammer's lines are spoken aloud via the browser's
   speechSynthesis (TTS); your replies come in through SpeechRecognition
   (the mic) where the browser supports it, with a typed box as fallback.
   Everything is local to the browser — nothing is recorded or uploaded.
============================================================================ */
const call = {
  active: false,
  scenario: null,
  lineIndex: 0,
  timerId: null,
  seconds: 0,
  recognition: null,
  recognizing: false
};

const SpeechRecognitionCtor =
  window.SpeechRecognition || window.webkitSpeechRecognition || null;

function speak(text) {
  if (!("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.02;
    utter.pitch = 0.95;
    const inVoice = window.speechSynthesis
      .getVoices()
      .find((v) => /en-IN|hi-IN/i.test(v.lang));
    if (inVoice) utter.voice = inVoice;
    window.speechSynthesis.speak(utter);
  } catch (e) {
    /* speech is a nice-to-have; never let it break the call UI */
  }
}

function addCallLine(who, text) {
  const el = document.createElement("div");
  el.className = `call-line call-line--${who}`;
  el.innerHTML = `<span class="call-line__who">${who === "them" ? "Scammer" : "You"}</span>`;
  el.appendChild(document.createTextNode(text));
  $("call-transcript").appendChild(el);
  $("call-transcript").scrollTop = $("call-transcript").scrollHeight;
}

// The scammer's spoken script: reuse the scenario's own scammer lines so the
// call matches what that scam actually says over chat.
function scammerCallLines(scenario) {
  return scenario.messages.filter((m) => m.who === "scammer").map((m) => m.text);
}

async function startCall(scenarioId) {
  const scenario = SCENARIOS.find((s) => s.id === scenarioId) || SCENARIOS[0];

  // Tear down any call already in flight, otherwise its 1s timer keeps
  // running alongside the new one and the duration races ahead.
  if (call.timerId) clearInterval(call.timerId);
  call.timerId = null;
  stopListening();
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();

  const callId = (call.id || 0) + 1;
  call.id = callId;
  call.active = true;
  call.scenario = scenario;
  call.lineIndex = 0;
  call.seconds = 0;

  $("call-avatar").textContent = scenario.icon;
  $("call-name").textContent = scenario.contactName;
  $("call-status").textContent = "calling…";
  $("call-transcript").innerHTML = "";
  $("call-listening").classList.add("hidden");
  $("call-typed").classList.toggle("hidden", !!SpeechRecognitionCtor);
  showScreen("call");

  await sleep(1600);
  // Bail if the call was ended, or superseded by a newer one, while ringing.
  if (!call.active || call.id !== callId) return;

  $("call-status").textContent = "00:00";
  call.timerId = setInterval(() => {
    if (call.id !== callId) return;
    call.seconds += 1;
    const m = String(Math.floor(call.seconds / 60)).padStart(2, "0");
    const s = String(call.seconds % 60).padStart(2, "0");
    $("call-status").textContent = `${m}:${s}`;
  }, 1000);

  speakNextScammerLine();
}

function speakNextScammerLine() {
  if (!call.active) return;
  const lines = scammerCallLines(call.scenario);
  const line = lines[call.lineIndex % lines.length];
  call.lineIndex += 1;
  addCallLine("them", line);
  speak(line);
}

function endCall() {
  call.active = false;
  if (call.timerId) clearInterval(call.timerId);
  call.timerId = null;
  stopListening();
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  renderCallLog();
  showScreen("phone");
}

function handleUserSpoke(text) {
  if (!call.active || !text.trim()) return;
  addCallLine("you", text.trim());
  setTimeout(() => speakNextScammerLine(), 900);
}

function startListening() {
  if (!SpeechRecognitionCtor || call.recognizing) return;
  const rec = new SpeechRecognitionCtor();
  rec.lang = "en-IN";
  rec.interimResults = false;
  rec.maxAlternatives = 1;

  rec.onresult = (e) => {
    const said = e.results[0][0].transcript;
    handleUserSpoke(said);
  };
  rec.onerror = () => {
    // Mic blocked or unavailable — fall back to the typed box so the call
    // is still usable instead of silently doing nothing.
    $("call-typed").classList.remove("hidden");
  };
  rec.onend = () => {
    call.recognizing = false;
    $("call-listening").classList.add("hidden");
    $("call-mic").classList.remove("is-recording");
  };

  call.recognition = rec;
  call.recognizing = true;
  $("call-listening").classList.remove("hidden");
  $("call-mic").classList.add("is-recording");
  try {
    rec.start();
  } catch (e) {
    call.recognizing = false;
  }
}

function stopListening() {
  if (call.recognition && call.recognizing) {
    try { call.recognition.stop(); } catch (e) { /* already stopped */ }
  }
  call.recognizing = false;
  $("call-listening").classList.add("hidden");
  $("call-mic").classList.remove("is-recording");
}

function wireCallControls() {
  $("call-end").addEventListener("click", endCall);
  $("call-mic").addEventListener("click", () => {
    if (!SpeechRecognitionCtor) {
      $("call-typed").classList.remove("hidden");
      $("call-typed-input").focus();
      return;
    }
    if (call.recognizing) stopListening();
    else startListening();
  });
  $("call-typed-input").addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const val = e.currentTarget.value;
    e.currentTarget.value = "";
    handleUserSpoke(val);
  });
}

// ---- Camera ----
function captureCameraShot() {
  const flash = $("camera-flash");
  flash.classList.add("is-firing");
  setTimeout(() => flash.classList.remove("is-firing"), 400);

  appState.cameraShots += 1;
  const strip = $("camera-strip");
  const thumb = document.createElement("div");
  thumb.className = "camera-thumb";
  const hues = ["#2dd4bf", "#fb7185", "#fbbf24", "#818cf8", "#f472b6"];
  thumb.style.background = hues[appState.cameraShots % hues.length];
  thumb.textContent = "📸";
  strip.appendChild(thumb);
  while (strip.children.length > 8) strip.removeChild(strip.firstChild);
}

// ---- Settings ----
function renderSettings() {
  const list = $("settings-list");
  list.innerHTML = "";
  appState.settings.forEach((row) => {
    const el = document.createElement("div");
    el.className = "settings-row";
    el.innerHTML = `
      <span class="settings-row__icon">${row.icon}</span>
      <span class="settings-row__label">${row.label}</span>
      <button class="settings-toggle${row.on ? " is-on" : ""}" aria-label="${row.label}"></button>`;
    el.querySelector(".settings-toggle").addEventListener("click", () => {
      row.on = !row.on;
      applySettingChange(row);
    });
    list.appendChild(el);
  });
}

// ---- Shared toggle state: Settings rows + Control Center tiles both read
// and write the same appState.settings, so either surface stays in sync.
function applySettingChange(row) {
  if (row.key === "dark") {
    $("phone").classList.toggle("is-light", !row.on);
  }
  if ((row.key === "wifi" || row.key === "airplane") && isOnline()) {
    deliverPendingMessages();
  }
  updateStatusBars();
  updateConnectivityBanner();
  renderSettings();
  renderControlCenter();
}

// A thin "waiting for network" strip in the chat, like WhatsApp shows.
function updateConnectivityBanner() {
  const banner = $("wa-offline-banner");
  if (!banner) return;
  banner.classList.toggle("hidden", isOnline());
}

function statusBarIconsHTML() {
  const on = {};
  appState.settings.forEach((s) => { on[s.key] = s.on; });
  if (on.airplane) return "✈️ 🔋";
  const parts = [];
  if (on.wifi) parts.push("📶");
  parts.push("📡");
  if (on.bt) parts.push("🔵");
  parts.push("🔋");
  return parts.join(" ");
}

function updateStatusBars() {
  const html = statusBarIconsHTML();
  document.querySelectorAll(".status-bar__icons").forEach((el) => { el.textContent = html; });
}

// ---- Control Center: pull down from the top of any screen ----
function renderControlCenter() {
  const grid = $("control-center-grid");
  grid.innerHTML = "";
  appState.settings.forEach((row) => {
    const tile = document.createElement("div");
    tile.className = "cc-tile" + (row.on ? " is-on" : "");
    tile.innerHTML = `<span class="cc-tile__icon">${row.icon}</span><span class="cc-tile__label">${row.label}</span>`;
    tile.addEventListener("click", () => {
      row.on = !row.on;
      applySettingChange(row);
    });
    grid.appendChild(tile);
  });
}

function wireControlCenterDrag() {
  const zone = $("drag-zone");
  const cc = $("control-center");
  let dragging = false;
  let startY = 0;
  let isOpen = false;

  const openCC = () => {
    cc.classList.remove("is-dragging", "hidden");
    cc.style.transform = "";
    cc.classList.add("is-open");
    isOpen = true;
  };
  const closeCC = () => {
    cc.classList.remove("is-dragging");
    cc.style.transform = "";
    cc.classList.remove("is-open");
    isOpen = false;
  };

  zone.addEventListener("pointerdown", (e) => {
    dragging = true;
    startY = e.clientY;
    cc.classList.remove("hidden");
    cc.classList.add("is-dragging");
    zone.setPointerCapture(e.pointerId);
  });
  zone.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dy = e.clientY - startY;
    const height = cc.offsetHeight || 220;
    const progress = Math.max(0, Math.min(1, dy / height));
    cc.style.transform = `translateY(${-100 + progress * 100}%)`;
  });
  const endDrag = (e) => {
    if (!dragging) return;
    dragging = false;
    const dy = e.clientY - startY;
    const height = cc.offsetHeight || 220;
    if (Math.abs(dy) < 6) {
      // Treat as a simple tap on the status bar — just toggle it.
      if (isOpen) closeCC(); else openCC();
      return;
    }
    if (dy > height * 0.35) openCC(); else closeCC();
  };
  zone.addEventListener("pointerup", endDrag);
  zone.addEventListener("pointercancel", endDrag);

  // Tapping the open panel's background/handle (not a tile) closes it again.
  cc.addEventListener("click", (e) => {
    if (e.target === cc || e.target.classList.contains("control-center__handle")) closeCC();
  });
}

// ---- Gallery: case files pulled straight from the scenario data ----
function renderGallery() {
  const grid = $("gallery-grid");
  grid.innerHTML = "";
  SCENARIOS.forEach((sc) => {
    const card = document.createElement("div");
    card.className = "gallery-card";
    card.innerHTML = `
      <span class="gallery-card__icon">${sc.icon}</span>
      <span class="gallery-card__label">${sc.label}</span>
      <span class="gallery-card__teaser">${sc.teaser || ""}</span>
      <span class="gallery-card__badge ${sc.verdict}">${sc.verdict === "scam" ? "🚩 flagged" : "✅ clean"}</span>`;
    grid.appendChild(card);
  });
}

// ---- Mail ----
function renderMailList() {
  $("mail-header-title").textContent = "Spam Folder";
  $("mail-detail").classList.add("hidden");
  const list = $("mail-list");
  list.classList.remove("hidden");
  list.innerHTML = "";
  MAIL_ITEMS.forEach((item, i) => {
    const row = document.createElement("div");
    row.className = "mail-item";
    row.innerHTML = `
      <div class="mail-item__top">
        <span class="mail-item__from">${item.from}</span>
        <span class="mail-item__dot ${item.flag}"></span>
      </div>
      <div class="mail-item__subject">${item.subject}</div>
      <div class="mail-item__preview">${item.preview}</div>`;
    row.addEventListener("click", () => openMailItem(i));
    list.appendChild(row);
  });
}

function openMailItem(index) {
  const item = MAIL_ITEMS[index];
  appState.mailViewingDetail = true;
  $("mail-header-title").textContent = item.from;
  $("mail-list").classList.add("hidden");
  const detail = $("mail-detail");
  detail.classList.remove("hidden");
  detail.innerHTML = `
    <span class="mail-detail__flag ${item.flag}">${item.flag === "scam" ? "🚩 likely scam" : "✅ looks legitimate"}</span>
    <div class="mail-detail__subject">${item.subject}</div>
    <div class="mail-detail__from">From: ${item.from}</div>
    <div class="mail-detail__body">${item.body}</div>`;
}

// ---- Scam Spotter game ----
function shuffledIndices(n) {
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function startGame() {
  appState.game.order = shuffledIndices(GAME_QUESTIONS.length);
  appState.game.index = 0;
  appState.game.score = 0;
  appState.game.answered = false;
  $("game-final").classList.add("hidden");
  $("game-body").classList.remove("hidden");
  renderGameQuestion();
}

function renderGameQuestion() {
  const { order, index } = appState.game;
  const q = GAME_QUESTIONS[order[index]];
  appState.game.answered = false;
  $("game-progress").textContent = `Round ${index + 1} / ${order.length}`;
  $("game-score").textContent = `Score: ${appState.game.score}`;
  $("game-card").textContent = q.text;
  $("game-feedback").classList.add("hidden");
  $("game-next").classList.add("hidden");
  $("game-buttons").classList.remove("hidden");
  $("game-btn-legit").disabled = false;
  $("game-btn-scam").disabled = false;
}

function answerGame(guessedScam) {
  if (appState.game.answered) return;
  appState.game.answered = true;
  const { order, index } = appState.game;
  const q = GAME_QUESTIONS[order[index]];
  const correct = guessedScam === q.isScam;
  if (correct) appState.game.score += 1;

  $("game-btn-legit").disabled = true;
  $("game-btn-scam").disabled = true;
  $("game-score").textContent = `Score: ${appState.game.score}`;

  const feedback = $("game-feedback");
  feedback.classList.remove("hidden", "is-correct", "is-wrong");
  feedback.classList.add(correct ? "is-correct" : "is-wrong");
  const verdictLabel = q.isScam ? "This was a scam." : "This was legitimate.";
  feedback.textContent = `${correct ? "✅ Correct!" : "❌ Not quite."} ${verdictLabel} ${q.explain}`;

  $("game-next").classList.remove("hidden");
}

function nextGameQuestion() {
  appState.game.index += 1;
  if (appState.game.index >= appState.game.order.length) {
    showGameFinal();
    return;
  }
  renderGameQuestion();
}

function showGameFinal() {
  $("game-body").classList.add("hidden");
  const final = $("game-final");
  final.classList.remove("hidden");
  const total = appState.game.order.length;
  const score = appState.game.score;
  $("game-final-score").textContent = `${score} / ${total}`;
  let msg = "Not bad — a few more rounds and you'll spot every one.";
  if (score === total) msg = "Perfect score! You'd make a great honeypot yourself.";
  else if (score >= total * 0.7) msg = "Sharp eyes — you caught most of them.";
  else if (score <= total * 0.3) msg = "These scams are sneaky — that's exactly why the agent exists.";
  $("game-final-msg").textContent = msg;
}

/* ============================================================================
   CONTROLS
============================================================================ */
function wireControls() {
  $("btn-play").addEventListener("click", () => {
    if (state.stepIndex >= state.scenario.messages.length) {
      // Finished — offer the picker so the user can pick what to watch next
      // (possibly a different scam type) rather than just repeating this one.
      openPicker();
      return;
    }
    state.playing = !state.playing;
    updatePlayButton();
    if (state.playing) runConversation(state.runId);
  });

  $("btn-replay").addEventListener("click", () => openPicker());

  $("btn-reboot").addEventListener("click", () => {
    state.runId += 1; // invalidate any in-flight conversation
    state.bootedOnce = false;
    state.booting = false;
    $("phone-notification").classList.add("hidden");
    $("phone-notification").classList.remove("is-shown", "is-pressed");
    runBootSequence();
  });

  // Manually tapping the WhatsApp icon on the home screen opens the chat
  // list (like a real app), letting you pick which contact to open —
  // separate from the auto-boot notification flow, which opens a specific
  // conversation directly since that's what tapping a notification would do.
  $("wa-icon").addEventListener("click", async () => {
    if (state.booting || !$("screen-home").classList.contains("is-active")) return;
    $("phone-notification").classList.add("hidden");
    $("phone-notification").classList.remove("is-shown", "is-pressed");
    await tapWhatsAppIcon();
    state.bootedOnce = true;
    goToWhatsAppList();
  });

  // Hero CTA opens the scam picker first — the boot/notification/WhatsApp
  // sequence only starts once a scam type is actually chosen.
  $("btn-watch-sim").addEventListener("click", (e) => {
    e.preventDefault();
    openPicker();
  });

  $("picker-close").addEventListener("click", () => {
    closePicker();
    unlockToHomeIfNeeded();
  });
  $("picker-backdrop").addEventListener("click", (e) => {
    if (e.target.id === "picker-backdrop") {
      closePicker();
      unlockToHomeIfNeeded();
    }
  });
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
  wireAppNavigation();
  wireControlCenterDrag();
  wireCallControls();
  renderControlCenter();
  updateStatusBars();
  updateConnectivityBanner();
  updateRealClock();
  setInterval(updateRealClock, 15000);
  initSimulationObserver();
});
