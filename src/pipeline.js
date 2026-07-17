// src/pipeline.js
// THE SHARED CORE. Both interfaces (web UI + WhatsApp) call process() and nothing else.
//
// Input:  { sampleId }                         -> a scripted scenario picked in the web UI
//         { audioPath }                         -> a file on disk (web mic upload)
//         { audioBuffer, audioExt }             -> raw audio bytes (WhatsApp inbound)
// Output: a result bundle (see cache.buildBundle) with an added `providers` trace on live runs.
//
// Fallback ladder (never breaks on camera):
//   scripted sample + DEMO_MODE!=live  -> deterministic cached bundle (instant)
//   live run, any step fails           -> that step falls back to the sample's cache
//   non-scripted input, live fails      -> honest "unsure" safe bundle
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';
import * as asr from './asr.js';
import * as llm from './llm.js';
import * as tts from './tts.js';
import { getSample } from './samples.js';
import { formatPill } from './present.js';
import { sourceFor } from './sources.js';
import {
  buildBundle,
  fallbackBundle,
  matchSampleByAudio,
  inputAudioFile,
  CACHE_DIR,
} from './cache.js';
import { writeTemp, cleanup } from './audio.js';

// Run the real pipeline on an audio file. `sampleId` (if known) enables per-step cache fallback.
async function runLive(audioPath, { sampleId = null } = {}) {
  const sample = sampleId ? getSample(sampleId) : null;
  const providers = { asr: 'none', llm: 'none', tts: 'none' };

  // 1) ASR  (preprocess freeform/imported audio; scripted TTS input is already clean)
  let transcript;
  try {
    const a = await asr.transcribe(audioPath, { preprocess: !sampleId });
    transcript = a.text;
    providers.asr = a.provider;
  } catch (e) {
    if (!sample) throw e;
    transcript = sample.result.transcript;
    providers.asr = 'cache';
    console.error('[pipeline] ASR failed, using cached transcript:', e.message);
  }

  // 2) LLM
  let judged;
  try {
    judged = await llm.classify(transcript);
    providers.llm = 'groq';
  } catch (e) {
    if (!sample) throw e;
    const r = sample.result;
    judged = {
      verdict: r.verdict,
      category: r.category,
      tactic: r.tactic,
      reply_gujarati: r.reply_gujarati,
      confidence: r.confidence,
    };
    providers.llm = 'cache';
    console.error('[pipeline] LLM failed, using cached JSON:', e.message);
  }

  // 3) TTS
  const token = `${sampleId || 'rec'}-${Date.now()}`;
  const outPath = path.join(CACHE_DIR, `out-${token}.mp3`);
  let replyAudioUrl;
  try {
    const t = await tts.synthesizeToMp3(judged.reply_gujarati, outPath);
    providers.tts = t.provider;
    replyAudioUrl = `/media/out-${token}.mp3`;
  } catch (e) {
    if (!sample) throw e;
    replyAudioUrl = `/media/reply${sampleId}.mp3`;
    providers.tts = 'cache';
    console.error('[pipeline] TTS failed, using cached audio:', e.message);
  }

  return {
    transcript,
    verdict: judged.verdict,
    category: judged.category,
    tactic: judged.tactic,
    reply_gujarati: judged.reply_gujarati,
    confidence: judged.confidence,
    subtitle_en: sample ? sample.subtitle_en : '',
    pill: formatPill(judged.category, judged.tactic),
    citation: sourceFor({ sampleId, category: judged.category }),
    replyAudioUrl,
    inputAudioUrl: sampleId ? `/media/sample${sampleId}_input.mp3` : null,
    sampleId: sampleId || null,
    source: 'live',
    providers,
  };
}

export async function process({ sampleId = null, audioPath = null, audioBuffer = null, audioExt = 'ogg' } = {}) {
  const live = config.demoMode === 'live';

  // ── Scripted scenario picked in the web UI ──────────────────────────────
  if (sampleId) {
    const id = String(sampleId).toUpperCase();
    if (!getSample(id)) throw new Error(`Unknown sampleId: ${sampleId}`);
    if (!live) return buildBundle(id, { source: 'cache' });
    try {
      return await runLive(inputAudioFile(id), { sampleId: id });
    } catch (e) {
      console.error('[pipeline] live sample run failed, serving cache:', e.message);
      return buildBundle(id, { source: 'cache' });
    }
  }

  // ── Raw audio (web mic upload or WhatsApp inbound) ──────────────────────
  let tempCreated = null;
  if (!audioPath) {
    if (!audioBuffer) throw new Error('No input: provide sampleId, audioPath, or audioBuffer');
    audioPath = writeTemp(audioBuffer, audioExt);
    tempCreated = audioPath;
  }

  try {
    const buf = audioBuffer || fs.readFileSync(audioPath);
    const matchedId = matchSampleByAudio(buf); // exact forwarded demo file → deterministic
    if (matchedId && !live) return buildBundle(matchedId, { source: 'cache' });
    try {
      return await runLive(audioPath, { sampleId: matchedId });
    } catch (e) {
      console.error('[pipeline] live run failed, serving safe fallback:', e.message);
      return fallbackBundle();
    }
  } finally {
    if (tempCreated) cleanup(tempCreated);
  }
}
