# Truth-Anchor — Design Spec

**Date:** 2026-07-16
**Status:** Approved (pending user review of this doc)
**Type:** Hackathon demo (NOT production). Single local project, run + record.

---

## 1. Goal

A demo that fact-checks forwarded WhatsApp **Gujarati voice notes** and replies with a
**vernacular Gujarati voice note + a media-literacy lesson** (prebunking — teach the tactic so
the user spots the next scam themselves).

Two interfaces share **one** core pipeline:

1. **WhatsApp-style Web UI** — a reliable, demo-safe recording/playback surface for the pitch
   video. Never fails on camera.
2. **Real WhatsApp** via `whatsapp-web.js` (QR-login a real number) — the "it actually works"
   proof shot: a real forward on a real phone triggers a real voice-note reply.

**Non-goals:** no database, no auth, no accounts, no arbitrary-input hardening, no deployment,
no production WhatsApp Business sender / Meta verification. Simplicity first. Build ONLY what
makes the 3 scripted demos flawless on both interfaces.

---

## 2. Stack (all decided)

| Concern | Choice | Notes |
|---|---|---|
| Backend | **Node + Express** | Node v22.17.0 installed. One `npm start`. |
| LLM | **Groq** (OpenAI-compatible) | Key provided by user. Model `llama-3.3-70b-versatile` (configurable via `GROQ_MODEL`). JSON mode. |
| ASR | **Groq Whisper** `whisper-large-v3` (`language=gu`) | Works TODAY with the same Groq key. Bhashini ULCA path also coded for when a key exists. |
| TTS | **Bhashini ULCA** (if key) → **Google Translate TTS** (`tl=gu`, no key) → cached | Google TTS gives real Gujarati audio today with zero paid keys. |
| Real WhatsApp | **`whatsapp-web.js`** (QR login) | Replaces Twilio. Real number, real forwarded voice notes, real voice-note replies. No creds, no ngrok, no sandbox limit. `ffmpeg-static` bundled for mp3→ogg/opus voice-note conversion (no system install). |
| Web UI | plain HTML/CSS/JS, mobile 390px | Pixel-accurate WhatsApp. |
| Secrets | `.env` (gitignored) + `.env.example` | Groq key written into `.env` locally so the demo runs out of the box. |

**Why not Twilio / not full OpenWA:** user has no Twilio creds and the Sandbox only messages
"joined" numbers. `whatsapp-web.js` (OpenWA's default engine) needs neither, works today, and
messages any contact. Running the *whole* OpenWA gateway (Docker + Postgres + Redis + S3)
violates the "no database, simplicity" constraint, so we use only its underlying library in a
small module.

---

## 3. Architecture

```
public/  (WhatsApp-style web UI, 390px)  ─┐
                                          ├──►  src/pipeline.js  ──►  result bundle
src/whatsapp.js  (whatsapp-web.js client) ─┘         │
                                                     │  tries live, degrades gracefully
                              ┌──────────────────────┼───────────────────────┐
                          src/asr.js             src/llm.js              src/tts.js
                        (Bhashini | Groq Whisper) (Groq JSON)     (Bhashini | Google TTS)
                                                     │
                                                 src/cache.js  ◄── deterministic scripted
                                                 src/samples.js    bundles A / B / C
```

- **`src/pipeline.js`** — the ONE shared core. Single entry point:
  `process({ sampleId? , audioBuffer? , audioMime? , source }) → ResultBundle`.
  Both callers use it; neither knows about the others.
- **`src/samples.js`** — static metadata for scenarios A/B/C: id, input Gujarati text, canonical
  JSON, English subtitle, audio content hash (for Twilio-style/inbound matching).
- **`src/cache.js`** — loads seeded bundles from `cache/`; matches an inbound audio buffer to a
  scripted sample by content hash; returns a fully-coherent cached bundle.
- **`src/asr.js` / `src/llm.js` / `src/tts.js`** — one provider concern each, each timeout-wrapped
  and independently testable.
- **`server.js`** — Express: serves `public/`, exposes `POST /api/process`, statically serves
  generated audio at `/media/*`, and on start prints the local URL (`http://localhost:3000`) and
  the `POST /api/process` path. (No inbound webhook — WhatsApp is QR-based, run separately via
  `npm run whatsapp`; there is nothing for an external service to POST to.)

### ResultBundle (the shared contract)

```json
{
  "transcript": "…gujarati…",
  "verdict": "false|scam|unsure",
  "category": "scam|health|claim|unsure",
  "tactic": "…short gujarati…",
  "reply_gujarati": "…spoken reply…",
  "confidence": "high|medium|low",
  "caption": "…verdict + lesson caption text…",
  "subtitle_en": "…~13px grey English gloss…",
  "replyAudioUrl": "/media/replyA.mp3",
  "source": "live|cache"
}
```

`caption` and `subtitle_en` live in the **app/cache layer**, not in the LLM JSON, so `prompt.txt`
stays **verbatim** as written (its JSON schema is unchanged). For scripted samples they come from
`samples.js`; for live non-scripted input, `caption` is derived from the verdict/category and
`subtitle_en` is a short auto-gloss (or omitted).

---

## 4. The layered fallback (the "never breaks on camera" core)

**Scripted samples (A/B/C) default to the cached bundle** — instant, deterministic, matches the
expected-behaviour table exactly. This is the filming-safe default.

A `DEMO_MODE=live` env flag forces the real pipeline, which degrades step-by-step; the same
degradation is what a genuine mic-recorded / non-scripted input always uses:

1. **ASR:** Bhashini (if key) → **Groq Whisper** → cached transcript (scripted only)
2. **LLM:** **Groq** live → cached JSON (scripted only)
3. **TTS:** Bhashini (if key) → **Google TTS** → cached reply audio (scripted only)

If the whole thing throws for a recognised scripted sample, return that sample's cached bundle as
a coherent unit (transcript + JSON + audio all matching). Non-scripted input that can't be
processed returns an honest `unsure` safe reply. **Every failure is `console.error`-logged; the
user-facing output stays smooth.** Each external call is timeout-wrapped (~8 s default).

This applies to **both** the web UI and the WhatsApp path.

---

## 5. Seeding (`npm run seed`; auto-runs on start if `cache/` is empty)

For each scenario A/B/C, generate and write to `cache/`:
- the **input voice note** (`sampleA_input.mp3`) — so the web UI picker has real audio to "send"
  and play — synthesized from the input Gujarati text;
- the **cached reply voice note** (`replyA.mp3`) — synthesized from `reply_gujarati`;
- the **cached bundle JSON** (`sampleA.json`) — the canonical ResultBundle.

Audio is produced via **Bhashini TTS if a key exists, else Google Translate TTS** (`tl=gu`, no
key). The canonical JSON is authored to match the expected-behaviour table (below), so the filmed
scenarios are deterministic and correct regardless of live-API weather. Groq is genuinely
exercised for `DEMO_MODE=live` runs and for mic/non-scripted input.

Generated audio + `cache/*.json` are **gitignored** (regenerable in one command) to keep the
shared team repo clean.

---

## 6. The 3 scripted scenarios (canonical content)

### A — SCAM (0:12)
- **Input (given, verbatim):** "બેટા, હું હોસ્પિટલમાં છું, અકસ્માત થયો છે. કોઈને કહેતો નહીં, જલ્દી ₹40,000 આ નંબર પર મોકલ. ફોન કપાઈ રહ્યો છે..."
- **Canonical JSON:** `verdict=scam, category=scam, tactic="ઉતાવળ અને ગુપ્તતા (તાત્કાલિક પૈસા માંગવા, કોઈને ન કહેવાનું દબાણ)", confidence=high`
- **reply_gujarati:** warns it's likely a scam, names the urgency+secrecy tactic in plain words,
  ends with the safe action: hang up and call a family member before sending money.
- **subtitle_en:** "Likely a scam — creates panic + secrecy to rush you into paying. Before sending money, hang up and call your family directly to verify."
- **Pill:** muted-amber "🛡️ છેતરપિંડીની યુક્તિ: {tactic}"

### B — HEALTH MYTH
- **Input (Gujarati, authored):** "સાંભળ્યું છે કે રોજ સવારે ખાલી પેટે લીંબુ અને ગરમ પાણી પીવાથી કેન્સર મટી જાય છે. દવા બંધ કરીને આ ઉપાય કરો, ડોક્ટરની જરૂર નથી."
  (≈ "lemon + hot water every morning cures cancer; stop your medicine, no doctor needed")
- **Canonical JSON:** `verdict=false, category=health, tactic="ચમત્કારિક ઈલાજનો ખોટો દાવો (દવા બંધ કરાવવાનું જોખમી સૂચન)", confidence=high`
- **reply_gujarati:** false; lemon water doesn't cure cancer; never stop prescribed medicine on a
  forward; ask your doctor.
- **subtitle_en:** "False — lemon water does not cure cancer. Never stop prescribed medicine on a forwarded message; ask your doctor."
- **Pill:** soft-green "✓ વિશ્વસનીય સ્રોતથી ચકાસ્યું" + grey chip "PIB Fact Check"

### C — UNSURE
- **Input (Gujarati, authored):** "સાંભળ્યું છે કે આવતા મહિનેથી પેન્શનના નિયમો બદલાઈ રહ્યા છે, બધા સાવધાન રહેજો."
  (≈ vague unsourced rumour: "pension rules changing next month")
- **Canonical JSON:** `verdict=unsure, category=unsure, tactic="અધૂરી અને અસ્પષ્ટ માહિતી (સ્રોત વગરની અફવા)", confidence=low`
- **reply_gujarati:** honest deferral — can't responsibly judge; message is vague/unverifiable;
  check with an official office / bank / trusted family member; don't trust rumours.
- **subtitle_en:** "Not sure — the message is vague and unverifiable. Check with an official source or a trusted family member before believing or forwarding."
- **Pill:** neutral grey, no verdict claim.

---

## 7. Web UI (`public/`, plain HTML/CSS/JS, mobile 390px)

Pixel-accurate WhatsApp:
- Wallpaper `#ECE5DD`; outgoing bubbles `#DCF8C6` (right, tail, timestamp, blue read-ticks);
  incoming white bubbles (left, tail, timestamp).
- Top bar: avatar + "Truth-Anchor" + green verified check + "online" + call/video icons.
- "Today" divider. Bottom input row with green mic button.
- **Audio bubbles are the hero:** big play button, real waveform, duration label, and they
  **actually play**.
- Trigger a message by picking sample **A/B/C** (attachment-style picker) **or** mic-record
  (MediaRecorder). Sends `sampleId` or the recorded blob to `POST /api/process`.
- Renders the reply as: an **incoming AUDIO bubble** (plays the TTS) + a **white caption bubble**
  (`reply_gujarati`) + a **~13px grey English subtitle** line + the **category pill**:
  - scam → muted-amber pill (tactic)
  - health/claim → soft-green verified pill + grey "PIB Fact Check" chip
  - unsure → neutral grey pill, no verdict claim.

---

## 8. Real WhatsApp (`src/whatsapp.js`, `whatsapp-web.js`)

- QR login (terminal QR via `qrcode-terminal`), `LocalAuth` session folder (no DB).
- On inbound message with audio/voice-note media: `downloadMedia()` → buffer → **shared pipeline**
  → reply with (a) the generated Gujarati voice note (`MessageMedia`, `sendAudioAsVoice: true`,
  converted to ogg/opus via `ffmpeg-static`) and (b) a text message: verdict + lesson caption +
  the tactic/verified line.
- Inbound audio matched to a scripted sample by content hash → coherent cached bundle on any
  failure (same layered fallback as the web UI).
- Run separately (`npm run whatsapp`) so the web UI demo doesn't require a QR scan.

---

## 9. `prompt.txt`

Its own editable, `#`-commented file. **Starts with the user's exact system prompt, verbatim**,
including the JSON schema `{ verdict, category, tactic, reply_gujarati, confidence }`. Comments at
the top explain it's editable and how it's used. The `caption`/`subtitle_en` fields are added by
the app layer, NOT the prompt, so the prompt stays exactly as specified.

---

## 10. Files

```
UNESCO_YOUTH_COMPETITION/
  package.json
  .env                      # real keys (gitignored) — Groq key placed here
  .env.example              # placeholders
  .gitignore                # node_modules, .env, cache/*.mp3, cache/*.json, .wwebjs_auth/
  prompt.txt                # verbatim system prompt (+ # comments)
  README.md
  server.js                 # Express: web UI + /api/process + /media + prints URL
  src/
    pipeline.js             # SHARED core
    asr.js                  # Bhashini | Groq Whisper
    llm.js                  # Groq JSON
    tts.js                  # Bhashini | Google TTS
    bhashini.js             # ULCA pipeline-config + compute (ASR + TTS) — coded, key-gated
    cache.js                # load/serve/match scripted bundles
    samples.js              # A/B/C metadata + canonical JSON + subtitles + hashes
    whatsapp.js             # whatsapp-web.js client → shared pipeline
    audio.js                # ffmpeg-static helpers (mp3 → ogg/opus), duration
  scripts/
    seed.js                 # generate 3 input + 3 reply audios + cached JSON
  public/
    index.html
    styles.css
    app.js
  cache/                    # generated (gitignored): sampleA.json, sampleA_input.mp3, replyA.mp3, …
```

---

## 11. Run / deliverables

- `npm install && npm start` → auto-seeds if `cache/` empty, prints `http://localhost:3000` and
  the `POST /api/process` path. `npm run whatsapp` boots the QR WhatsApp client (prints the QR to
  scan). No webhook / ngrok needed.
- **README** covers: Groq key, Bhashini/ULCA keys (optional, bhashini.gov.in — free PoC),
  `whatsapp-web.js` QR setup + the ToS/ban caveat for personal-number automation, `.env`, install,
  run, `DEMO_MODE`, and **how to record the demo** on both interfaces. Notes that a production
  any-recipient WhatsApp sender needs a Meta-approved Business API — marked **post-hackathon, not
  built**.
- `prompt.txt` as its own file. The 3 sample audios + cached replies (via `npm run seed`).
- Clear `console.error` logging; scripted demos bulletproof on both interfaces.

---

## 12. Git

Build inside `UNESCO_YOUTH_COMPETITION` but **do not commit or push** (including to the team's
`main`) unless the user asks — they control the first commit / branch on the shared repo.

---

## 13. Testable-today vs later

- ✅ **Today (Groq key only):** both interfaces; all 3 scripted demos with real Gujarati audio that
  plays; **live Groq Whisper ASR + live Groq LLM** for mic/non-scripted input; Google-TTS voice
  replies.
- 🔑 **Add Bhashini key:** real Bhashini ASR/TTS live path.
- 🔑 **WhatsApp:** works today via QR (no key) — just scan on first `npm run whatsapp`.

---

## 14. Out of scope

Production WhatsApp Business sender / Meta verification, deployment, accounts, analytics,
arbitrary-input hardening. Only the 3 scripted demos, flawless and real-looking on both interfaces.
