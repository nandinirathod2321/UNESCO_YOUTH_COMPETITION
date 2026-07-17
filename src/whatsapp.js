// src/whatsapp.js
// Real WhatsApp integration via whatsapp-web.js (QR-login a real number — no Twilio, no ngrok).
// A forwarded Gujarati voice note -> the ONE shared pipeline -> a real voice-note reply + a
// text message with the verdict + literacy lesson.
//
// Run:  npm run whatsapp   (scan the QR from WhatsApp > Linked devices on first run)
import path from 'node:path';
import pkg from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { process as runPipeline } from './pipeline.js';
import { composeWhatsappText } from './present.js';
import { ensureVoiceOgg } from './audio.js';
import { CACHE_DIR } from './cache.js';
import { ensureSeed } from '../scripts/seed.js';

const { Client, LocalAuth, MessageMedia } = pkg;

// Resolve a /media/... reply URL to its file on disk, then ensure an ogg/opus voice-note copy.
function mediaPath(url) {
  return path.join(CACHE_DIR, String(url).replace(/^\/media\//, ''));
}
async function replyVoiceNotePath(result) {
  const mp3 = mediaPath(result.replyAudioUrl);
  return ensureVoiceOgg(mp3); // -> sibling .ogg
}

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: path.join(process.cwd(), '.wwebjs_auth') }),
  puppeteer: { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] },
});

client.on('qr', (qr) => {
  console.log('\n[wa] Scan this QR in WhatsApp → Settings → Linked devices → Link a device:\n');
  qrcode.generate(qr, { small: true });
});
client.on('authenticated', () => console.log('[wa] authenticated ✓'));
client.on('ready', () =>
  console.log('\n[wa] Truth-Anchor is ONLINE. Forward a Gujarati voice note to this number.\n')
);
client.on('auth_failure', (m) => console.error('[wa] auth failure:', m));
client.on('disconnected', (r) => console.error('[wa] disconnected:', r));

client.on('message', async (msg) => {
  try {
    if (msg.fromMe || msg.from === 'status@broadcast') return;
    const chat = await msg.getChat();
    if (chat.isGroup) return; // 1-to-1 only

    // Friendly hint for non-audio messages.
    if (msg.type !== 'ptt' && msg.type !== 'audio') {
      await msg.reply(
        'નમસ્તે! કોઈ શંકાસ્પદ વૉઇસ મેસેજ મને ફોરવર્ડ કરો — હું તેની તપાસ કરીને જવાબ આપીશ.\n' +
          '(Forward me a suspicious voice note and I will fact-check it.)'
      );
      return;
    }

    const media = await msg.downloadMedia();
    if (!media?.data) return;
    const ext = (media.mimetype?.split('/')[1] || 'ogg').split(';')[0];
    console.log(`[wa] voice note from ${msg.from} (${media.mimetype})`);

    try {
      await chat.sendStateRecording();
    } catch {
      /* presence is best-effort */
    }

    const result = await runPipeline({
      audioBuffer: Buffer.from(media.data, 'base64'),
      audioExt: ext,
    });

    // 1) the generated Gujarati voice-note reply
    const oggPath = await replyVoiceNotePath(result);
    const voice = MessageMedia.fromFilePath(oggPath);
    await client.sendMessage(msg.from, voice, { sendAudioAsVoice: true });

    // 2) the verdict + literacy lesson as text
    await client.sendMessage(msg.from, composeWhatsappText(result));

    console.log(`[wa] replied → ${result.category} (source=${result.source})`);
  } catch (e) {
    console.error('[wa] handler failed:', e);
    try {
      await client.sendMessage(
        msg.from,
        'માફ કરશો, અત્યારે તપાસ થઈ શકી નથી. કૃપા કરીને થોડી વાર પછી ફરી પ્રયત્ન કરો.'
      );
    } catch {
      /* ignore */
    }
  }
});

async function main() {
  await ensureSeed(); // ensure the cached fallback bundles exist before we go live
  console.log('[wa] starting WhatsApp client…');
  await client.initialize();
}

main().catch((e) => {
  console.error('[wa] fatal:', e);
  process.exit(1);
});
