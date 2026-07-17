// src/asr.js
// Step 1 of the pipeline: Gujarati speech-to-text.
// Priority: Bhashini (if key) -> Groq Whisper (works with the Groq key) -> throw (caller caches).
import fs from 'node:fs';
import Groq from 'groq-sdk';
import { config, caps, withTimeout } from './config.js';
import * as bhashini from './bhashini.js';
import { preprocessForAsr, tmpPath, cleanup } from './audio.js';

let _client = null;
function groq() {
  if (!caps.groq) throw new Error('GROQ_API_KEY not set');
  if (!_client) _client = new Groq({ apiKey: config.groq.apiKey });
  return _client;
}

async function groqWhisper(audioPath) {
  const resp = await withTimeout(
    groq().audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      model: config.groq.whisperModel,
      language: 'gu',
      response_format: 'json',
      temperature: 0,
    }),
    config.apiTimeoutMs,
    'Groq Whisper'
  );
  const text = resp?.text;
  if (!text || !text.trim()) throw new Error('Groq Whisper returned no text');
  return text.trim();
}

// Best-effort: trim silence + normalize before ASR (helps freeform/imported audio).
async function maybePreprocess(audioPath) {
  const out = tmpPath('wav');
  try {
    await preprocessForAsr(audioPath, out);
    return { path: out, temp: out };
  } catch (e) {
    console.error('[ASR] preprocess skipped:', e.message);
    return { path: audioPath, temp: null };
  }
}

// Transcribe an audio file. Returns { text, provider }. Throws if no provider succeeds.
// opts.preprocess = true for freeform/imported audio (scripted TTS input is already clean).
export async function transcribe(audioPath, opts = {}) {
  const errors = [];
  let work = { path: audioPath, temp: null };
  if (opts.preprocess) work = await maybePreprocess(audioPath);

  try {
    if (caps.bhashini) {
      try {
        return { text: await bhashini.transcribe(work.path), provider: 'bhashini' };
      } catch (e) {
        errors.push(`bhashini: ${e.message}`);
        console.error('[ASR] Bhashini failed:', e.message);
      }
    }
    if (caps.groq) {
      try {
        return { text: await groqWhisper(work.path), provider: 'groq-whisper' };
      } catch (e) {
        errors.push(`groq-whisper: ${e.message}`);
        console.error('[ASR] Groq Whisper failed:', e.message);
      }
    }
    throw new Error(`ASR unavailable (${errors.join('; ') || 'no provider configured'})`);
  } finally {
    if (work.temp) cleanup(work.temp);
  }
}
