// src/bhashini.js
// Bhashini / ULCA Indic ASR + TTS via the two-step pipeline (config -> compute).
// OPTIONAL: only used when BHASHINI_USER_ID + BHASHINI_ULCA_API_KEY are set. Without a key
// the pipeline falls back to Groq Whisper (ASR) and Google Translate TTS (TTS).
//
// Flow (per https://bhashini.gitbook.io/bhashini-apis):
//   1) POST getModelsPipeline  -> serviceId per task + inference endpoint + inference api key
//   2) POST <inference endpoint> with serviceId + inputData -> transcript / audio
import fs from 'node:fs';
import { config, withTimeout } from './config.js';
import { toWav16kMono, toMp3, writeTemp, tmpPath, cleanup } from './audio.js';

const ULCA_CONFIG_URL =
  'https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline';

const _pipelineCache = {}; // taskType -> { serviceId, endpoint, headerName, headerValue }

async function getPipeline(taskType) {
  if (_pipelineCache[taskType]) return _pipelineCache[taskType];

  const body = {
    pipelineTasks: [{ taskType, config: { language: { sourceLanguage: 'gu' } } }],
    pipelineRequestConfig: { pipelineId: config.bhashini.pipelineId },
  };

  const res = await withTimeout(
    fetch(ULCA_CONFIG_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        userID: config.bhashini.userId,
        ulcaApiKey: config.bhashini.ulcaApiKey,
      },
      body: JSON.stringify(body),
    }),
    config.apiTimeoutMs,
    'Bhashini pipeline-config'
  );
  if (!res.ok) throw new Error(`Bhashini config HTTP ${res.status}`);

  const data = await res.json();
  const serviceId = data?.pipelineResponseConfig?.[0]?.config?.[0]?.serviceId;
  const ep = data?.pipelineInferenceAPIEndPoint;
  const out = {
    serviceId,
    endpoint: ep?.callbackUrl,
    headerName: ep?.inferenceApiKey?.name,
    headerValue: ep?.inferenceApiKey?.value,
  };
  if (!out.serviceId || !out.endpoint) {
    throw new Error('Bhashini config missing serviceId/endpoint');
  }
  _pipelineCache[taskType] = out;
  return out;
}

async function compute(taskType, taskConfig, inputData) {
  const p = await getPipeline(taskType);
  const headers = { 'Content-Type': 'application/json' };
  if (p.headerName) headers[p.headerName] = p.headerValue;

  const body = {
    pipelineTasks: [
      {
        taskType,
        config: { serviceId: p.serviceId, language: { sourceLanguage: 'gu' }, ...taskConfig },
      },
    ],
    inputData,
  };

  const res = await withTimeout(
    fetch(p.endpoint, { method: 'POST', headers, body: JSON.stringify(body) }),
    config.apiTimeoutMs,
    `Bhashini ${taskType}`
  );
  if (!res.ok) throw new Error(`Bhashini ${taskType} HTTP ${res.status}`);
  return res.json();
}

// ASR: audio file -> Gujarati transcript.
export async function transcribe(audioPath) {
  const wav = tmpPath('wav');
  try {
    await toWav16kMono(audioPath, wav);
    const b64 = fs.readFileSync(wav).toString('base64');
    const data = await compute(
      'asr',
      { audioFormat: 'wav', samplingRate: 16000 },
      { audio: [{ audioContent: b64 }] }
    );
    const text = data?.pipelineResponse?.[0]?.output?.[0]?.source;
    if (!text) throw new Error('Bhashini ASR returned no text');
    return String(text).trim();
  } finally {
    cleanup(wav);
  }
}

// TTS: Gujarati text -> mp3 file at outMp3Path.
export async function synthesizeToMp3(text, outMp3Path) {
  const data = await compute(
    'tts',
    { gender: 'female', samplingRate: 22050 },
    { input: [{ source: text }] }
  );
  const b64 = data?.pipelineResponse?.[0]?.audio?.[0]?.audioContent;
  if (!b64) throw new Error('Bhashini TTS returned no audio');
  const wav = writeTemp(Buffer.from(b64, 'base64'), 'wav');
  try {
    await toMp3(wav, outMp3Path);
    return outMp3Path;
  } finally {
    cleanup(wav);
  }
}
