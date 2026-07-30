# Adaptive Honeypot Agent — Live Showcase (Frontend)

A dark, phone-mockup showcase site for this repo's honeypot API — an LLM-powered agent that
detects scam messages, keeps scammers engaged in natural conversation, and extracts actionable
intelligence (phone numbers, UPI IDs, bank accounts, phishing links, and more).

This folder is the **frontend**; the API itself lives in [`../src`](../src) at the repo root.

## What this is

This site is a **fully static, self-contained demo** — no build step, no backend, no API keys.
It simulates the phone experience end to end:

1. A phone boots up.
2. A WhatsApp notification arrives with an incoming scam message.
3. The notification is auto-tapped, opening the chat.
4. The scripted conversation plays out turn by turn, with a typing indicator and a
   composing-in-progress input field, exactly like the real thing.
5. Extracted intelligence (phone numbers, UPI IDs, links, IDs…) appears live in a side panel.
6. A final verdict banner and report explain **why** the message was (or wasn't) flagged as a scam.

Six scam types are scripted (lottery, bank/KYC, traffic challan, electricity bill, fake delivery,
investment/crypto) plus one genuine, non-scam message — to show the agent isn't just paranoid
about everything, it reasons about *why* something is or isn't a scam.

All dialogue is written in the same persona voice as the actual honeypot agent's system prompts
(see [`../src/honeypotAgent.js`](../src/honeypotAgent.js)) — nothing here calls a live model, so
there's no cost and it always works.

## Running locally

Just serve the folder statically, e.g.:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Deploying

This is a zero-config static site (`index.html`, `style.css`, `script.js`, `scenarios.js`) —
no build step required. Since it lives in a subfolder of the main repo, set the deployment's
**Root Directory** to `frontend`:

- **Vercel**: Project Settings → Build & Development Settings → Root Directory → `frontend`.
- **Netlify**: Site settings → Build & deploy → Base directory → `frontend`.
- **GitHub Pages**: point the Pages source at the `frontend` folder on the `main` branch.

The backend (`../src`) is unaffected — it keeps deploying from the repo root (e.g. Railway),
so both frontend and backend auto-deploy independently from the same repo and branch.

## Files

- `index.html` — page structure (hero, how-it-works, phone simulation, architecture, tech stack)
- `style.css` — dark cyber theme + phone/WhatsApp mockup styling
- `scenarios.js` — scripted conversation data per scam type
- `script.js` — boot sequence, notification, chat playback, intel panel, verdict/report rendering
