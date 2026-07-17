# Showcasing Truth-Anchor on GitHub Codespaces 🚀

Runs the **full app** (mic recording + chatbot + scripted A/B/C) in the cloud on the free
Codespaces tier — no card, using the GitHub account you already have. You get a public
`https://…app.github.dev` URL to share.

> **Not a 24/7 host.** A Codespace sleeps after 30 minutes idle and you click to wake it. The
> environment and URL persist across sleeps. Free personal quota is 120 core-hours/month.

---

## 1. Launch the Codespace

On the repo page (**github.com/nandinirathod2321/UNESCO_YOUTH_COMPETITION**):

**Code** ▸ **Codespaces** tab ▸ **Create codespace on main**

It builds the container and runs `npm install` automatically (~1–2 min). The
`.devcontainer/devcontainer.json` skips puppeteer's ~700 MB Chrome download, so install stays fast.

## 2. Start the server

In the Codespace terminal:

```bash
npm start
```

A toast pops up — **Open in Browser**. That's your app. The scripted A/B/C flow works immediately
(the seeded `cache/` assets are committed, so it boots without any API calls).

## 3. Make the URL public (so others can open it)

By default the forwarded port is **private** — only you, logged into GitHub, can open it. To share
with judges:

**Ports** tab (next to the terminal) ▸ right-click the **3000** row ▸ **Port Visibility** ▸ **Public**

Copy the URL in the **Forwarded Address** column — that's the link anyone can open, no login.

> Or from the terminal: `gh codespace ports visibility 3000:public -c $CODESPACE_NAME`

## 4. (Optional) Enable mic recording + chatbot

The scripted demo needs no keys. The live pipeline (recording your own voice, the chatbot) needs a
Groq key. Add it once as a Codespaces secret so it's never in the repo:

**github.com ▸ your Settings ▸ Codespaces ▸ Secrets ▸ New secret**
- Name: `GROQ_API_KEY`, value: your key from [console.groq.com/keys](https://console.groq.com/keys)
- Repository access: this repo

For the natural Gujarati voice, add `SARVAM_API_KEY` the same way. Then **rebuild** the Codespace
(or stop/start it) so the secrets load, and `npm start` again.

Without keys, mic recordings fall back to the honest "unsure" card and the chatbot returns a polite
"try again later" — the scripted A/B/C demo is unaffected.

---

## Notes

- **Billing:** the Codespace runs on the free quota of *your* account (whoever clicks Create), not
  the repo owner's.
- **Stopping:** **Codespaces** page (github.com/codespaces) ▸ **⋯** ▸ **Stop** to save quota. It
  resumes with the same files and URL.
- **ffmpeg** is bundled (`ffmpeg-static`) — nothing to install in the container.
