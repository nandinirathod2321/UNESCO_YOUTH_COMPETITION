// src/llm.js
// Step 2 of the pipeline: classify the transcript + write the Gujarati reply, via Groq.
// Returns parsed JSON: { verdict, category, tactic, reply_gujarati, confidence }.
import Groq from 'groq-sdk';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config, caps, withTimeout } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROMPT_PATH = path.join(__dirname, '..', 'prompt.txt');
const CHAT_PROMPT_PATH = path.join(__dirname, '..', 'chat-prompt.txt');

let _client = null;
function client() {
  if (!caps.groq) throw new Error('GROQ_API_KEY not set');
  if (!_client) _client = new Groq({ apiKey: config.groq.apiKey });
  return _client;
}

// Load a prompt file, stripping "#" comment lines. Re-read each call so edits take effect live.
function loadPrompt(p) {
  return fs
    .readFileSync(p, 'utf8')
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('#'))
    .join('\n')
    .trim();
}
const systemPrompt = () => loadPrompt(PROMPT_PATH);
const chatSystemPrompt = () => loadPrompt(CHAT_PROMPT_PATH);

function safeParseJson(text) {
  // Strip accidental markdown fences, then parse.
  const cleaned = String(text)
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
  return JSON.parse(cleaned);
}

const ALLOWED_CATEGORY = new Set(['scam', 'health', 'claim', 'unsure']);
const ALLOWED_VERDICT = new Set(['false', 'scam', 'unsure']);

// Normalize/validate the model output into the canonical shape.
function normalize(obj) {
  const category = ALLOWED_CATEGORY.has(obj.category) ? obj.category : 'unsure';
  const verdict = ALLOWED_VERDICT.has(obj.verdict) ? obj.verdict : 'unsure';
  return {
    verdict,
    category,
    tactic: String(obj.tactic || '').trim(),
    reply_gujarati: String(obj.reply_gujarati || '').trim(),
    confidence: ['high', 'medium', 'low'].includes(obj.confidence) ? obj.confidence : 'low',
  };
}

// Classify a transcript. Throws on any failure (caller decides fallback).
export async function classify(transcript) {
  const resp = await withTimeout(
    client().chat.completions.create({
      model: config.groq.model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt() },
        { role: 'user', content: `Forwarded WhatsApp message transcript:\n"""${transcript}"""` },
      ],
    }),
    config.apiTimeoutMs,
    'Groq LLM'
  );

  const content = resp?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Groq LLM returned empty content');
  const parsed = normalize(safeParseJson(content));
  if (!parsed.reply_gujarati) throw new Error('Groq LLM returned no reply_gujarati');
  return parsed;
}

// Conversational chat (Part D). Multi-turn: pass recent { role, content } history.
// Returns { reply, subtitle_en }. Does NOT touch the fact-check contract above.
export async function converseChat(message, history = []) {
  const messages = [{ role: 'system', content: chatSystemPrompt() }];
  for (const h of (Array.isArray(history) ? history : []).slice(-8)) {
    if (!h || !h.content) continue;
    const role = h.role === 'assistant' || h.role === 'bot' ? 'assistant' : 'user';
    messages.push({ role, content: String(h.content).slice(0, 1200) });
  }
  messages.push({ role: 'user', content: String(message).slice(0, 2000) });

  const resp = await withTimeout(
    client().chat.completions.create({
      model: config.groq.model,
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages,
    }),
    config.apiTimeoutMs,
    'Groq chat'
  );
  const content = resp?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Groq chat returned empty content');
  const parsed = safeParseJson(content);
  const reply = String(parsed.reply || '').trim();
  if (!reply) throw new Error('Groq chat returned no reply');
  return { reply, subtitle_en: String(parsed.subtitle_en || '').trim() };
}
