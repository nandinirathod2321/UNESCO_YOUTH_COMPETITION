// server.js
// Express app: serves the WhatsApp-style web UI and the /api/process endpoint.
// Both the web UI and this endpoint call the ONE shared pipeline (src/pipeline.js).
import express from 'express';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config, caps } from './src/config.js';
import { process as runPipeline } from './src/pipeline.js';
import { CACHE_DIR } from './src/cache.js';
import { cleanup } from './src/audio.js';
import * as asr from './src/asr.js';
import * as tts from './src/tts.js';
import { converseChat } from './src/llm.js';
import { ensureSeed } from './scripts/seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const MIME_EXT = {
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mp4': 'mp4',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
};

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    const ext = MIME_EXT[file.mimetype] || 'webm';
    cb(null, `rec-${Date.now()}.${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/media', express.static(CACHE_DIR)); // generated audio (reply/input/out-*.mp3)

// The one endpoint the web UI calls. Accepts either a sampleId (scripted A/B/C) or a mic recording.
app.post('/api/process', upload.single('audio'), async (req, res) => {
  const uploaded = req.file?.path || null;
  try {
    let result;
    if (uploaded) {
      result = await runPipeline({ audioPath: uploaded });
    } else if (req.body?.sampleId) {
      result = await runPipeline({ sampleId: req.body.sampleId });
    } else {
      return res.status(400).json({ error: 'Provide sampleId or an audio file.' });
    }
    res.json(result);
  } catch (e) {
    console.error('[api] /api/process failed:', e);
    res.status(500).json({ error: 'Processing failed.' });
  } finally {
    if (uploaded) cleanup(uploaded);
  }
});

// Conversational chatbot (Part D). Text skips ASR; a voice message is transcribed first.
// Body: { message, history?: [{role,content}], voice?: "true" } OR multipart audio (+ history/voice fields).
app.post('/api/chat', upload.single('audio'), async (req, res) => {
  const uploaded = req.file?.path || null;
  try {
    let message = req.body?.message;
    let history = req.body?.history;
    if (typeof history === 'string') {
      try {
        history = JSON.parse(history);
      } catch {
        history = [];
      }
    }
    if (!Array.isArray(history)) history = [];

    let transcript = null;
    if (uploaded) {
      const a = await asr.transcribe(uploaded, { preprocess: true }).catch((e) => {
        console.error('[chat] ASR failed:', e.message);
        return null;
      });
      transcript = a?.text || '';
      message = transcript;
    }
    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: 'Empty message.' });
    }

    const wantVoice = req.body?.voice === 'true' || req.body?.voice === true;

    let out;
    try {
      out = await converseChat(message, history);
    } catch (e) {
      console.error('[chat] LLM failed:', e.message);
      out = {
        reply: 'માફ કરશો, અત્યારે જવાબ આપી શકતો નથી. કૃપા કરીને થોડી વાર પછી ફરી પ્રયત્ન કરો.',
        subtitle_en: 'Sorry, I could not answer just now. Please try again in a moment.',
      };
    }

    const result = { reply: out.reply, subtitle_en: out.subtitle_en, transcript, source: 'live' };

    if (wantVoice && out.reply) {
      try {
        const token = `chat-${Date.now()}`;
        const outPath = path.join(CACHE_DIR, `${token}.mp3`);
        const t = await tts.synthesizeToMp3(out.reply, outPath);
        result.replyAudioUrl = `/media/${token}.mp3`;
        result.ttsProvider = t.provider;
      } catch (e) {
        console.error('[chat] TTS failed:', e.message);
      }
    }
    res.json(result);
  } catch (e) {
    console.error('[api] /api/chat failed:', e);
    res.status(500).json({ error: 'Chat failed.' });
  } finally {
    if (uploaded) cleanup(uploaded);
  }
});

app.get('/api/health', (_req, res) =>
  res.json({ ok: true, demoMode: config.demoMode, caps })
);

async function main() {
  await ensureSeed(); // generate the demo cache if missing
  app.listen(config.port, () => {
    const url = `http://localhost:${config.port}`;
    console.log('\n──────────────────────────────────────────────');
    console.log('  Truth-Anchor demo is running');
    console.log(`  Web UI:        ${url}`);
    console.log(`  API endpoint:  POST ${url}/api/process`);
    console.log(`  Health:        ${url}/api/health`);
    console.log(`  DEMO_MODE=${config.demoMode}  |  Groq=${caps.groq ? 'on' : 'off'}  Bhashini=${caps.bhashini ? 'on' : 'off'}`);
    console.log('  Real WhatsApp: run `npm run whatsapp` (QR login)');
    console.log('──────────────────────────────────────────────\n');
  });
}

main();
