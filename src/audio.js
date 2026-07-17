// src/audio.js
// Audio helpers backed by a bundled static ffmpeg (no system install required).
// - toVoiceOgg: mp3 -> ogg/opus so WhatsApp renders a proper voice note (push-to-talk).
// - toWav16kMono / toMp3: format conversions for the optional Bhashini ASR/TTS path.
import ffmpegPath from 'ffmpeg-static';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);

function run(builder, outputPath) {
  return new Promise((resolve, reject) => {
    builder
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err))
      .save(outputPath);
  });
}

// Convert any audio file to ogg/opus voice-note format. Returns the output path.
export function toVoiceOgg(inputPath, outputPath) {
  return run(
    ffmpeg(inputPath)
      .noVideo()
      .audioCodec('libopus')
      .audioBitrate('32k')
      .audioChannels(1)
      .audioFrequency(48000)
      .format('ogg'),
    outputPath
  );
}

// Convert any audio file to 16kHz mono WAV (what Bhashini ASR expects).
export function toWav16kMono(inputPath, outputPath) {
  return run(
    ffmpeg(inputPath).noVideo().audioChannels(1).audioFrequency(16000).format('wav'),
    outputPath
  );
}

// Convert any audio file to mp3.
export function toMp3(inputPath, outputPath) {
  return run(
    ffmpeg(inputPath).noVideo().audioCodec('libmp3lame').audioBitrate('96k').format('mp3'),
    outputPath
  );
}

// Concatenate several audio files into one mp3 (used by Sarvam multi-chunk TTS).
export function concatAudiosToMp3(inputPaths, outputPath) {
  return new Promise((resolve, reject) => {
    const cmd = ffmpeg();
    inputPaths.forEach((p) => cmd.input(p));
    const filter =
      inputPaths.map((_, i) => `[${i}:a]`).join('') +
      `concat=n=${inputPaths.length}:v=0:a=1[out]`;
    cmd
      .complexFilter(filter, 'out')
      .audioCodec('libmp3lame')
      .audioBitrate('96k')
      .format('mp3')
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .save(outputPath);
  });
}

// Light pre-processing before ASR: trim leading/trailing silence + normalize loudness,
// output 16kHz mono wav. Improves freeform transcription accuracy. Best-effort.
export function preprocessForAsr(inputPath, outputPath) {
  return run(
    ffmpeg(inputPath)
      .noVideo()
      .audioFilters([
        'silenceremove=start_periods=1:start_silence=0.15:start_threshold=-45dB',
        'areverse',
        'silenceremove=start_periods=1:start_silence=0.15:start_threshold=-45dB',
        'areverse',
        'loudnorm=I=-16:TP=-1.5:LRA=11',
      ])
      .audioChannels(1)
      .audioFrequency(16000)
      .format('wav'),
    outputPath
  );
}

// Ensure a voice-note ogg exists next to an mp3 (creates it once, caches on disk).
export async function ensureVoiceOgg(mp3Path) {
  const oggPath = mp3Path.replace(/\.mp3$/i, '.ogg');
  if (fs.existsSync(oggPath)) return oggPath;
  if (!fs.existsSync(mp3Path)) throw new Error(`Source audio missing: ${mp3Path}`);
  fs.mkdirSync(path.dirname(oggPath), { recursive: true });
  await toVoiceOgg(mp3Path, oggPath);
  return oggPath;
}

// A unique temp path (for transient conversions).
let _n = 0;
export function tmpPath(ext) {
  _n += 1;
  return path.join(os.tmpdir(), `truth-anchor-${process.pid}-${Date.now()}-${_n}.${ext}`);
}

export function writeTemp(buffer, ext) {
  const p = tmpPath(ext);
  fs.writeFileSync(p, buffer);
  return p;
}

export function cleanup(...paths) {
  for (const p of paths) {
    try {
      if (p && fs.existsSync(p)) fs.unlinkSync(p);
    } catch {
      /* ignore */
    }
  }
}
