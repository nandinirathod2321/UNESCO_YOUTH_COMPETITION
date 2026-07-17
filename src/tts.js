// src/tts.js
// Step 3 of the pipeline: Gujarati text-to-speech -> an mp3 voice-note file.
// Priority: Bhashini (if key) -> Google Translate TTS (free, no key) -> throw (caller caches).
//
// Google Translate TTS caps each request at ~200 chars, so long replies are split on
// sentence boundaries and the mp3 chunks are concatenated (same approach as the gTTS lib).
import fs from 'node:fs';
import path from 'node:path';
import { config, caps, withTimeout } from './config.js';
import * as bhashini from './bhashini.js';
import * as sarvam from './sarvam.js';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

function chunkText(text, max = 180) {
  const sentences = String(text)
    .split(/(?<=[।!?.\n])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const chunks = [];
  let cur = '';
  const push = () => {
    if (cur) chunks.push(cur);
    cur = '';
  };
  for (const s of sentences) {
    if (s.length > max) {
      push();
      let buf = '';
      for (const word of s.split(/\s+/)) {
        if ((buf + ' ' + word).trim().length > max) {
          if (buf) chunks.push(buf);
          buf = word;
        } else {
          buf = buf ? `${buf} ${word}` : word;
        }
      }
      cur = buf;
    } else if ((cur + ' ' + s).trim().length > max) {
      push();
      cur = s;
    } else {
      cur = cur ? `${cur} ${s}` : s;
    }
  }
  push();
  return chunks.length ? chunks : [String(text)];
}

async function googleTtsChunk(text) {
  const url =
    'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=gu' +
    `&q=${encodeURIComponent(text)}&total=1&idx=0&textlen=${text.length}`;
  const res = await withTimeout(
    fetch(url, { headers: { 'User-Agent': UA, Referer: 'https://translate.google.com/' } }),
    config.apiTimeoutMs,
    'Google TTS'
  );
  if (!res.ok) throw new Error(`Google TTS HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 200) throw new Error('Google TTS returned an empty/blocked response');
  return buf;
}

async function googleTts(text, outMp3Path) {
  fs.mkdirSync(path.dirname(outMp3Path), { recursive: true });
  const buffers = [];
  for (const c of chunkText(text)) {
    buffers.push(await googleTtsChunk(c));
  }
  fs.writeFileSync(outMp3Path, Buffer.concat(buffers));
  return outMp3Path;
}

// Synthesize text to an mp3 at outMp3Path. Returns { path, provider }. Throws if all fail.
// Ladder: Sarvam (preferred) → Bhashini → Google (free fallback).
export async function synthesizeToMp3(text, outMp3Path) {
  const errors = [];

  if (caps.sarvam) {
    try {
      await sarvam.synthesizeToMp3(text, outMp3Path);
      return { path: outMp3Path, provider: 'sarvam' };
    } catch (e) {
      errors.push(`sarvam: ${e.message}`);
      console.error('[TTS] Sarvam failed:', e.message);
    }
  }

  if (caps.bhashini) {
    try {
      await bhashini.synthesizeToMp3(text, outMp3Path);
      return { path: outMp3Path, provider: 'bhashini' };
    } catch (e) {
      errors.push(`bhashini: ${e.message}`);
      console.error('[TTS] Bhashini failed:', e.message);
    }
  }

  try {
    await googleTts(text, outMp3Path);
    return { path: outMp3Path, provider: 'google' };
  } catch (e) {
    errors.push(`google: ${e.message}`);
    console.error('[TTS] Google TTS failed:', e.message);
  }

  throw new Error(`TTS unavailable (${errors.join('; ')})`);
}
