// scripts/seed.js
// Generate the 3 scripted demo bundles into cache/:
//   sample<ID>_input.mp3  — the "forwarded" Gujarati voice note (web UI picker plays this)
//   reply<ID>.mp3         — the cached Gujarati reply voice note
//   sample<ID>.json       — the canonical result bundle (transcript + LLM JSON + presentation)
//
// Audio is synthesized via Bhashini TTS if a key is set, else free Google Translate TTS.
// Run directly to (re)generate everything:  npm run seed
// Imported by server.js as ensureSeed() to fill only what's missing on startup.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { SAMPLES, SAMPLE_IDS } from '../src/samples.js';
import * as tts from '../src/tts.js';
import {
  CACHE_DIR,
  buildBundle,
  bundleFile,
  inputAudioFile,
  replyAudioFile,
  cacheReady,
} from '../src/cache.js';

function ensureDir() {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

async function seedOne(id, { force }) {
  const sample = SAMPLES[id];
  const inputPath = inputAudioFile(id);
  const replyPath = replyAudioFile(id);

  if (force || !fs.existsSync(inputPath)) {
    console.log(`[seed] ${id}: synthesizing input voice note…`);
    const r = await tts.synthesizeToMp3(sample.inputText, inputPath);
    console.log(`[seed] ${id}: input audio via ${r.provider}`);
  }

  if (force || !fs.existsSync(replyPath)) {
    console.log(`[seed] ${id}: synthesizing reply voice note…`);
    const r = await tts.synthesizeToMp3(sample.result.reply_gujarati, replyPath);
    console.log(`[seed] ${id}: reply audio via ${r.provider}`);
  }

  // Always (re)write the canonical bundle JSON — it's cheap and keeps it in sync with samples.js.
  fs.writeFileSync(bundleFile(id), JSON.stringify(buildBundle(id), null, 2));
}

export async function seed({ force = false } = {}) {
  ensureDir();
  for (const id of SAMPLE_IDS) {
    try {
      await seedOne(id, { force });
    } catch (e) {
      console.error(`[seed] ${id}: FAILED — ${e.message}`);
    }
  }
}

// Called on server startup: only generate if the cache isn't already complete.
export async function ensureSeed() {
  if (cacheReady()) return;
  console.log('[seed] cache incomplete — generating demo audio (needs internet once)…');
  await seed({ force: false });
  if (cacheReady()) console.log('[seed] demo cache ready.');
  else console.error('[seed] cache still incomplete — check network / API keys.');
}

// Run directly: force a full regenerate.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  seed({ force: true })
    .then(() => console.log('[seed] done.'))
    .catch((e) => {
      console.error('[seed] fatal:', e);
      process.exit(1);
    });
}
