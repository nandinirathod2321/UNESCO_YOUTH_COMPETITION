# Truth-Anchor 🛡️

**Fact-checks forwarded WhatsApp Gujarati voice notes and replies with a vernacular (Gujarati)
voice note + a media-literacy lesson.** Built for elderly, semi-literate users in rural Gujarat —
it doesn't just judge a message, it *teaches the manipulation tactic* so the user spots the next
one themselves (prebunking).

This is a **hackathon demo**, not production. It runs as a single local project you start and
record. Two interfaces share **one** pipeline:

1. **WhatsApp-style Web UI** — a reliable, demo-safe recording/playback surface (never fails on
   camera).
2. **Real WhatsApp** via `whatsapp-web.js` — a real forwarded voice note on a real phone triggers
   a real voice-note reply (the "it actually works" proof shot).

---

## How it works (the shared pipeline)

```
Web UI  ─┐
         ├─►  src/pipeline.js  ─►  1. ASR (speech→text, Gujarati)
WhatsApp ─┘                        2. LLM  (classify + write reply, returns JSON)
                                   3. TTS  (text→Gujarati voice note)
                                   → reply audio + caption + verdict pill
```

| Step | Provider (priority order) | Notes |
|------|---------------------------|-------|
| **ASR** | Bhashini → **Groq Whisper** (`whisper-large-v3`) → cached transcript | Works today with just the Groq key. Freeform audio is silence-trimmed + normalized first. |
| **LLM** | **Groq** (`llama-3.3-70b-versatile`, JSON mode) → cached JSON | Fact-check prompt in **`prompt.txt`**; conversational persona in **`chat-prompt.txt`** (both editable). |
| **TTS** | **Sarvam AI** (`bulbul`) → Bhashini → **Google Translate TTS** (free) → cached audio | Sarvam gives natural Gujarati; Google is the zero-key fallback. |

Verdicts are grounded with real sources from **`src/sources.js`** (WHO / Cancer Research UK / Cyber-Crime I4C / PIB Fact Check) shown as a tappable "Source" chip.

### Also included
- **Conversational chatbot** (`POST /api/chat`): type or speak to Truth-Anchor for multi-turn
  media-literacy help; replies in your language with a small English gloss (optional 🔊 voice reply).
- **Import / drag-drop any audio** (mp3/m4a/ogg/wav/aac) → runs the live pipeline.
- **Record mode** (`/?record`): phone bezel, hidden chrome, hotkeys (`r` reset · `1/2/3` replay A/B/C · `b` bezel).

### Demo-safe fallback (never breaks on camera)
The 3 scripted scenarios (A/B/C) are cached on disk (transcript + JSON + audio). At runtime the
app tries the live pipeline; if **any** API call fails or times out, it silently serves the cached
result. Failures are logged to the console; the user-facing output stays smooth. Controlled by
`DEMO_MODE` (see below).

---

## 1. Prerequisites

- **Node.js 20+** (tested on v22)
- **Internet** (for Groq and the free Google TTS fallback)
- A phone with WhatsApp (only for the real-WhatsApp interface)

`ffmpeg` is **bundled** (`ffmpeg-static`) — no system install needed.

## 2. Install

```bash
npm install
```

## 3. Keys & `.env`

Copy the example and fill in your key(s):

```bash
cp .env.example .env
```

| Variable | Required? | Where to get it |
|----------|-----------|-----------------|
| `GROQ_API_KEY` | **Yes** | https://console.groq.com/keys (free) — powers ASR + LLM. |
| `GROQ_MODEL` | no (has default) | Chat model, default `llama-3.3-70b-versatile`. |
| `GROQ_WHISPER_MODEL` | no (has default) | ASR model, default `whisper-large-v3`. |
| `SARVAM_API_KEY` | optional (preferred voice) | https://dashboard.sarvam.ai — natural Gujarati TTS. `SARVAM_SPEAKER` (default `anushka`), `SARVAM_MODEL` (default `bulbul:v2`). |
| `DEMO_MODE` | no (default `cache`) | `cache` = scripted scenarios always serve the deterministic cached bundle (filming-safe). `live` = force the real pipeline for A/B/C too, with fallback to cache. |
| `LIVE_GROUNDING` | no (default `off`) | `on` also tries a quick web lookup to cite a current source for freeform claims (timeout-guarded, never fabricates). |
| `BHASHINI_USER_ID`, `BHASHINI_ULCA_API_KEY` | optional | https://bhashini.gov.in (free for PoC). Leave blank to skip. |
| `PORT` | no (default `3000`) | Web UI port. |

**Human-voice cached replies (optional, most natural):** drop a hand-recorded Gujarati file named
`cache/replyA_human.mp3` (or `.ogg/.wav/.m4a`; same for `B`/`C`) and it's used as that scenario's
cached reply audio — deterministic and human.

> Mic-recorded / non-scripted input **always** runs the live pipeline, regardless of `DEMO_MODE`.

## 4. Run the Web UI

```bash
npm start
```

Prints:

```
Web UI:        http://localhost:3000
API endpoint:  POST http://localhost:3000/api/process
```

On first run it auto-generates the demo audio into `cache/` (needs internet once). The web UI is
a faithful multi-screen WhatsApp clone:

1. It opens on your **chat list** — three unknown-number chats (each with a spam voice note) plus
   Truth-Anchor, મમ્મી, and a family group.
2. Open an unknown-number chat → you see the spam voice note ("Forwarded many times").
3. **Long-press** the voice note (press-and-hold on touch, or right-click on desktop) → the
   selection bar appears → tap **Forward** (→).
4. In **"Forward to…"** pick **Truth-Anchor** → **Send**.
5. Truth-Anchor replies with a playable Gujarati voice note + fact-check card (verdict pill +
   English subtitle). You can long-press that reply and **forward it onward** to family — sharing
   the correction.

You can also open the Truth-Anchor chat and tap the green **mic** to fact-check your own recording.

To (re)generate the cached demo assets manually:

```bash
npm run seed
```

## 5. Run the real WhatsApp interface

```bash
npm run whatsapp
```

1. A **QR code** prints in the terminal.
2. On your phone: **WhatsApp → Settings → Linked devices → Link a device**, and scan it.
3. Once you see `Truth-Anchor is ONLINE`, **forward (or send) a Gujarati voice note** to that
   number from another phone.
4. Truth-Anchor replies with a **voice note** + a **text** message (verdict + lesson + tactic
   line).

**Tip for a deterministic proof shot:** save one of the seeded files in `cache/` (e.g.
`sampleA_input.mp3`) to a phone and forward *that exact file* — the app recognises it by content
hash and serves the scripted bundle. Speaking freely also works (live ASR + LLM).

### About this WhatsApp approach
- Uses `whatsapp-web.js` (WhatsApp Web automation, QR-linked to a real number). **No Twilio, no
  ngrok, no business verification, and no "only joined numbers" sandbox limit** — you can message
  any contact.
- ⚠️ **Caveat:** automating a personal WhatsApp account is against WhatsApp's Terms of Service and
  carries a (small, but real) ban risk. Fine for a one-off hackathon demo on a spare number; not
  for production.
- The session is stored locally in `.wwebjs_auth/` (gitignored). Delete it to log out.
- **Post-hackathon (not built):** a production, any-recipient WhatsApp sender needs the official
  WhatsApp Business Platform (e.g. a Meta-approved Twilio sender + business verification). Out of
  scope here.

---

## The 3 demo scenarios

| | Input (Gujarati voice note) | Verdict | Pill |
|---|---|---|---|
| **A · Scam** | "…અકસ્માત થયો છે… જલ્દી ₹40,000 મોકલ… કોઈને કહેતો નહીં…" | `scam` | 🛡️ amber — tactic: urgency + secrecy |
| **B · Health myth** | "લીંબુ-પાણી પીવાથી કેન્સર મટી જાય છે, દવા બંધ કરો…" | `false` (health) | ✓ green "verified" + `PIB Fact Check` |
| **C · Unsure** | "આવતા મહિનેથી પેન્શનના નિયમો બદલાઈ રહ્યા છે…" (vague rumour) | `unsure` | neutral grey — no verdict claim |

Edit the wording/verdicts in `src/samples.js`, then `npm run seed` to refresh the audio.

---

## How to record the demo

1. **Web UI shot:** `npm start`, open `http://localhost:3000` in a mobile-sized window (or Chrome
   DevTools device mode, 390px). From the chat list, open the **+91 98765 43210** chat →
   long-press (or right-click) the spam voice note → **Forward** → **Truth-Anchor** → **Send**.
   Watch the ticks turn blue, "typing…", then the reply voice note + fact-check card animate in;
   tap play to hear it. Repeat with the other two unknown numbers for the health and unsure cases,
   and forward a reply to the family group to show "sharing the correction."
2. **Real WhatsApp shot:** `npm run whatsapp`, link the QR, forward a voice note from a second
   phone, and film the reply landing in real WhatsApp.

With `DEMO_MODE=cache` (default) the scripted scenarios are instant and identical every take. Set
`DEMO_MODE=live` in `.env` to show the genuinely-live pipeline (Groq Whisper + Groq LLM + Google
TTS) — slower, non-deterministic, but "really real".

---

## Project structure

```
server.js            Express: web UI + POST /api/process + /media static
prompt.txt           LLM system prompt (editable, commented)
src/
  pipeline.js        THE shared core (both interfaces call this)
  asr.js             ASR:  Bhashini → Groq Whisper
  llm.js             LLM:  Groq (JSON)
  tts.js             TTS:  Bhashini → Google Translate TTS
  bhashini.js        ULCA pipeline-config + compute (optional)
  cache.js           deterministic scripted bundles + audio matching
  samples.js         the 3 scenarios (input text + canonical result)
  present.js         verdict pill + WhatsApp text composition
  audio.js           ffmpeg helpers (mp3 ↔ ogg/opus, wav)
  whatsapp.js        whatsapp-web.js client → shared pipeline
scripts/seed.js      generate the 3 cached demo bundles
public/              WhatsApp-style web UI (index.html, styles.css, app.js)
cache/               generated audio + JSON (gitignored)
```

---

## Troubleshooting

- **`EADDRINUSE :::3000`** — port busy. Stop the other process or set `PORT` in `.env`.
- **No audio / seed fails** — you're offline. Google TTS needs internet; connect and rerun
  `npm run seed`.
- **LLM/ASR errors in console but the demo still works** — that's the fallback doing its job
  (cache mode). Add/verify `GROQ_API_KEY` to exercise the live path.
- **WhatsApp QR won't scan / keeps refreshing** — delete `.wwebjs_auth/` and rerun
  `npm run whatsapp`.

## Out of scope

Production WhatsApp Business sender / Meta verification, deployment, accounts, database, auth,
analytics, arbitrary-input hardening. This demo builds only what makes the 3 scripted scenarios
work flawlessly and look real on both interfaces.
