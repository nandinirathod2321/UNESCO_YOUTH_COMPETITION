# Deploying Truth-Anchor to Zeabur 🚀

Puts the **WhatsApp-style web UI** on a public HTTPS URL so judges can open the demo on their own
phone instead of watching a screen recording. Takes about five minutes.

> **The real-WhatsApp interface (`npm run whatsapp`) stays on your laptop.** It links a phone by
> scanning a QR code printed in the terminal and keeps the login session in `.wwebjs_auth/` on
> disk — neither survives a cloud deploy. Deploy the web UI; run the WhatsApp shot locally.

---

## What you get

| | Deployed web UI | Local `npm run whatsapp` |
|---|---|---|
| Forward a spam voice note → Gujarati reply (scenarios A/B/C) | ✅ | ✅ |
| Record your own voice note → live fact-check | ✅ (needs `GROQ_API_KEY`) | ✅ |
| Chatbot (type or speak) | ✅ (needs `GROQ_API_KEY`) | — |
| A real forwarded voice note on a real phone | ❌ | ✅ |

---

## 1. Push to GitHub

Zeabur deploys from a Git repo, so the code has to be on GitHub first. Nothing here is committed
yet — `git status` shows every file as untracked.

```bash
git add .
git commit -m "Truth-Anchor demo"
git push -u origin main
```

Two things worth checking before you push:

- **`.env` must not go up.** It's already in `.gitignore` — confirm with `git status --short` that
  `.env` is absent from the staged list. Real keys go in Zeabur's dashboard (step 3), never in Git.
- **`cache/` *should* go up.** The seeded `.mp3` and `.json` files are deliberately committed
  (only runtime scratch files like `cache/chat-*.mp3` are ignored). This is what lets the deployed
  app boot instantly with zero API calls — see [Why the deploy boots cold](#why-the-deploy-boots-cold).

## 2. Create the service

1. Go to **[dash.zeabur.com](https://dash.zeabur.com)** → **Create Project** (pick a region near
   your judges — Singapore/Mumbai for an India demo).
2. **Add Service** → **Git** → authorize GitHub → pick the `UNESCO_YOUTH_COMPETITION` repo.
3. Zeabur detects Node.js and builds it. No build settings to fill in — `zbpack.json` (committed)
   already pins the start command:

   ```json
   { "start_command": "npm start" }
   ```

   The Node version comes from `"engines": { "node": ">=20" }` in `package.json`. There is no build
   step — the app is plain ESM plus a static `public/` folder, so Zeabur just runs `npm install`
   and starts the server.

## 3. Set the environment variables

**Variables** tab → add these, then redeploy. `.env` is *not* deployed; this tab replaces it.

| Variable | Set it to | Why |
|----------|-----------|-----|
| `GROQ_API_KEY` | your key from [console.groq.com/keys](https://console.groq.com/keys) | Powers live ASR + LLM. Without it, only the scripted A/B/C flow works — see below. |
| `PUPPETEER_SKIP_DOWNLOAD` | `true` | **Set this before the first deploy.** See [The Chromium trap](#the-chromium-trap). |
| `DEMO_MODE` | `cache` | Scenarios A/B/C always serve the deterministic seeded bundle. Leave as `cache` for a public demo. |
| `SARVAM_API_KEY` | optional | Natural Gujarati TTS from [dashboard.sarvam.ai](https://dashboard.sarvam.ai). Without it, TTS falls back to free Google Translate TTS. |
| `LIVE_GROUNDING` | optional, `off` | `on` adds a timeout-guarded web lookup to cite a current source for freeform claims. |
| `PORT` | **don't set it** | Zeabur injects `PORT` itself (`8080` for Git services) and `src/config.js` already reads `process.env.PORT`. Hardcoding it will break routing. |

`BHASHINI_USER_ID` / `BHASHINI_ULCA_API_KEY` are optional and safe to leave unset — ASR falls back
to Groq Whisper and TTS to Google.

## 4. Expose it

**Networking** tab → **Generate Domain** → pick a subdomain (e.g. `truth-anchor.zeabur.app`).
HTTPS is automatic, which matters: **the browser mic only works on HTTPS or localhost**, so the
record button would be dead on a bare IP.

## 5. Verify

```bash
curl https://<your-domain>.zeabur.app/api/health
```

```json
{ "ok": true, "demoMode": "cache", "caps": { "groq": true, "sarvam": false, "bhashini": false } }
```

`caps` is the honest read on which live providers your keys actually unlocked — if `groq` is
`false`, the key didn't land. Then open the URL on a phone and run the real flow: chat list →
open **+91 98765 43210** → long-press the spam voice note → **Forward** → **Truth-Anchor** →
**Send**.

---

## The Chromium trap

The single most likely reason your first build fails or crawls.

`whatsapp-web.js` hard-pins `puppeteer@24.38.0`, whose `postinstall` script downloads two full
Chrome builds (`chrome` + `chrome-headless-shell`). The deployed server **never uses them** —
`server.js` doesn't import `src/whatsapp.js` — but `npm install` doesn't know that and downloads
them anyway.

The cost is easy to underestimate, because **none of it lands in `node_modules`**. That directory
is 164 MB and `node_modules/puppeteer` is a 141 KB wrapper; the browsers go to a separate
`~/.cache/puppeteer`, which works out to roughly **700 MB on disk per install** once extracted
(measured on this machine — Zeabur pulls the linux64 build, same order of magnitude). So your
image is carrying about 700 MB for a feature the server can't run.

Setting `PUPPETEER_SKIP_DOWNLOAD=true` in the Variables tab (step 3) skips it entirely. If your
build log still shows Chrome downloading, the variable didn't reach the build step — worth fixing
rather than shrugging at, since ~700 MB of unused browser is a real candidate for a build timeout
or an out-of-memory kill on a small builder.

> **Don't fix this with a committed `.npmrc`.** It would skip the Chromium download on *everyone's*
> machine, and the next person to clone the repo would find `npm run whatsapp` broken with
> "Could not find Chrome" right before the demo. Keep the skip on the deploy side only.

## Why the deploy boots cold

`server.js` calls `ensureSeed()` on startup, which regenerates the three demo voice notes via TTS
if they're missing — that needs internet and takes a while. Because the seeded files in `cache/`
are committed, `cacheReady()` returns true and the whole step is skipped. **This is why the deploy
starts fast and why A/B/C sound identical everywhere.**

If you ever regenerate them (`npm run seed`), commit the changed `.mp3`s or your deployed audio
drifts from local.

## What works with no keys at all

Worth knowing, because it's what happens when a key expires mid-judging:

- **Scenarios A/B/C** — perfect. Served from the committed cache; zero API calls.
- **Mic recording** — still replies, but the live pipeline throws without Groq and the fallback
  serves the honest "unsure" card (scenario C's bundle) every time. It looks like the app works
  but always hedges.
- **Chatbot** — replies with the Gujarati "sorry, try again later" apology.

So: the forwarded-voice-note demo is bulletproof without keys; the interactive parts are the ones
that need `GROQ_API_KEY` to be real.

## Storage is ephemeral — and that's fine

Zeabur's filesystem resets on every redeploy. Nothing durable lives there:

- `uploads/` — mic recordings, deleted right after processing (`cleanup()` in the `finally` block).
- `cache/chat-*.mp3`, `cache/out-*.mp3` — generated TTS replies, regenerated per request.

No volume needed. The one consequence: a reply audio URL from before a redeploy 404s afterwards.
Harmless for a demo — reload and re-send.

---

## Troubleshooting

- **Build times out or OOMs** → the Chromium download. Set `PUPPETEER_SKIP_DOWNLOAD=true` and
  redeploy.
- **Domain loads but nothing responds** → something set `PORT` explicitly. Delete the variable and
  let Zeabur inject it.
- **Mic button does nothing on a phone** → you're on `http://`. Use the generated `.zeabur.app`
  domain; browsers block `getUserMedia` on insecure origins.
- **`/api/health` shows `"groq": false`** → the key never reached the runtime. Re-check the
  Variables tab for a stray quote or trailing space, then redeploy (variables apply on restart).
- **Reply is always the "unsure" grey card** → same thing: Groq isn't authenticating, so every live
  run falls through to `fallbackBundle()`. Check the runtime logs for `[pipeline] ... failed`.
- **Voice notes 404 after a redeploy** → expected; see the ephemeral-storage note above.
