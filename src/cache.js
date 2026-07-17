// src/cache.js
// Deterministic cached bundles for the 3 scripted scenarios (the "never breaks on camera" core).
// Builds a full result bundle from samples.js (source of truth) + present.js + the seeded audio.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSample, SAMPLE_IDS } from './samples.js';
import { formatPill } from './present.js';
import { sourceFor } from './sources.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const CACHE_DIR = path.join(__dirname, '..', 'cache');

export const replyAudioFile = (id) => path.join(CACHE_DIR, `reply${id}.mp3`);
export const inputAudioFile = (id) => path.join(CACHE_DIR, `sample${id}_input.mp3`);
export const bundleFile = (id) => path.join(CACHE_DIR, `sample${id}.json`);

// Optional hand-recorded "human voice" reply for a scenario: drop cache/reply<ID>_human.<ext>
// (mp3/ogg/wav/m4a) and it is used as the cached reply audio (most natural + deterministic).
const HUMAN_EXTS = ['mp3', 'ogg', 'wav', 'm4a'];
export function humanReplyUrl(id) {
  for (const ext of HUMAN_EXTS) {
    if (fs.existsSync(path.join(CACHE_DIR, `reply${id}_human.${ext}`))) {
      return `/media/reply${id}_human.${ext}`;
    }
  }
  return null;
}

// Build the full result bundle for a scripted sample id.
// reply_gujarati doubles as the web caption-bubble text; pill/subtitle drive the UI + WhatsApp text.
export function buildBundle(id, { source = 'cache' } = {}) {
  const s = getSample(id);
  if (!s) return null;
  const r = s.result;
  return {
    transcript: r.transcript,
    verdict: r.verdict,
    category: r.category,
    tactic: r.tactic,
    reply_gujarati: r.reply_gujarati,
    confidence: r.confidence,
    subtitle_en: s.subtitle_en,
    pill: formatPill(r.category, r.tactic),
    citation: sourceFor({ sampleId: id, category: r.category }),
    replyAudioUrl: humanReplyUrl(id) || `/media/reply${id}.mp3`,
    inputAudioUrl: `/media/sample${id}_input.mp3`,
    sampleId: id,
    source, // "cache" | "live" — origin, NOT the citation (see `citation` above)
  };
}

// True once every scripted sample has its seeded input + reply audio on disk.
export function cacheReady() {
  return SAMPLE_IDS.every(
    (id) => fs.existsSync(replyAudioFile(id)) && fs.existsSync(inputAudioFile(id))
  );
}

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

// Match inbound audio bytes to a scripted sample by content hash. This succeeds when the user
// forwards the exact seeded demo file (deterministic proof shot); a fresh recording won't match
// and the caller runs the live pipeline instead.
export function matchSampleByAudio(buffer) {
  const target = sha256(buffer);
  for (const id of SAMPLE_IDS) {
    const f = inputAudioFile(id);
    if (fs.existsSync(f) && sha256(fs.readFileSync(f)) === target) return id;
  }
  return null;
}

// Safe, honest fallback when the live pipeline fails and nothing matched: the "unsure" bundle
// (real audio, no false verdict claim). Coherent and never leaves the user without a reply.
export function fallbackBundle() {
  return buildBundle('C', { source: 'cache' });
}
