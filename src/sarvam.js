// src/sarvam.js
// Sarvam AI text-to-speech (bulbul) — natural Gujarati voice. OPTIONAL: only used when
// SARVAM_API_KEY is set. Preferred over Google TTS in the ladder (see tts.js).
//
// API: POST https://api.sarvam.ai/text-to-speech
//   headers: { api-subscription-key: <key> }
//   body:    { inputs:[text], target_language_code:'gu-IN', speaker, model, speech_sample_rate }
//   returns: { audios: ['<base64 wav>'] }
import fs from 'node:fs';
import { config, withTimeout } from './config.js';
import { toMp3, concatAudiosToMp3, writeTemp, cleanup } from './audio.js';

const ENDPOINT = 'https://api.sarvam.ai/text-to-speech';
const MAX_CHARS = 450; // Sarvam caps each input at 500 chars

function chunkText(text, max = MAX_CHARS) {
  const sentences = String(text)
    .split(/(?<=[।!?.\n])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const chunks = [];
  let cur = '';
  for (const s of sentences) {
    if ((cur + ' ' + s).trim().length > max) {
      if (cur) chunks.push(cur);
      cur = s.length > max ? s.slice(0, max) : s;
    } else {
      cur = cur ? `${cur} ${s}` : s;
    }
  }
  if (cur) chunks.push(cur);
  return chunks.length ? chunks : [String(text).slice(0, max)];
}

async function ttsChunk(text) {
  const res = await withTimeout(
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-subscription-key': config.sarvam.apiKey },
      body: JSON.stringify({
        inputs: [text],
        target_language_code: 'gu-IN',
        speaker: config.sarvam.speaker,
        model: config.sarvam.model,
        pitch: 0,
        pace: 1.0,
        loudness: 1.0,
        speech_sample_rate: 22050,
        enable_preprocessing: true,
      }),
    }),
    config.apiTimeoutMs,
    'Sarvam TTS'
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Sarvam TTS HTTP ${res.status} ${detail.slice(0, 120)}`);
  }
  const data = await res.json();
  const b64 = data?.audios?.[0];
  if (!b64) throw new Error('Sarvam TTS returned no audio');
  return Buffer.from(b64, 'base64'); // wav bytes
}

// Synthesize Gujarati text to an mp3 file. Returns outMp3Path.
export async function synthesizeToMp3(text, outMp3Path) {
  const chunks = chunkText(text);
  const wavs = [];
  try {
    for (const c of chunks) wavs.push(writeTemp(await ttsChunk(c), 'wav'));
    if (wavs.length === 1) await toMp3(wavs[0], outMp3Path);
    else await concatAudiosToMp3(wavs, outMp3Path);
    return outMp3Path;
  } finally {
    cleanup(...wavs);
  }
}
