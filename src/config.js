// src/config.js
// Central config. Loads .env once and exposes typed values + capability flags.
import 'dotenv/config';

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),

  // Demo mode: 'cache' (deterministic scripted bundles, filming-safe) or 'live' (force pipeline).
  demoMode: (process.env.DEMO_MODE || 'cache').toLowerCase(),

  groq: {
    apiKey: process.env.GROQ_API_KEY || '',
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    whisperModel: process.env.GROQ_WHISPER_MODEL || 'whisper-large-v3',
  },

  sarvam: {
    apiKey: process.env.SARVAM_API_KEY || '',
    model: process.env.SARVAM_MODEL || 'bulbul:v2',
    speaker: process.env.SARVAM_SPEAKER || 'anushka',
  },

  bhashini: {
    userId: process.env.BHASHINI_USER_ID || '',
    ulcaApiKey: process.env.BHASHINI_ULCA_API_KEY || '',
    pipelineId: process.env.BHASHINI_PIPELINE_ID || '64392f96daac500b55c543cd',
  },

  apiTimeoutMs: parseInt(process.env.API_TIMEOUT_MS || '8000', 10),
  liveGrounding: (process.env.LIVE_GROUNDING || 'off').toLowerCase() === 'on',
};

// Capability flags — which live providers are usable given the keys on hand.
export const caps = {
  groq: Boolean(config.groq.apiKey),
  sarvam: Boolean(config.sarvam.apiKey),
  bhashini: Boolean(config.bhashini.userId && config.bhashini.ulcaApiKey),
};

// Small helper: run a promise with a timeout, rejecting if it takes too long.
export function withTimeout(promise, ms, label = 'operation') {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}
