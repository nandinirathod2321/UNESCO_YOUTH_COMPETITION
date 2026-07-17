/* Truth-Anchor — modern WhatsApp clone: chat list, conversations, forward-to-verify,
   conversational chatbot (/api/chat), audio import/drag-drop, and record mode.
   Fact-check forwards run the shared pipeline via /api/process; chat runs /api/chat. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);

  const screenList = $('screenList');
  const screenChat = $('screenChat');
  const chatlistEl = $('chatlist');
  const messagesEl = $('messages');
  const chatEl = $('chat');
  const typingEl = $('typing');
  const chatHeader = $('chatHeader');
  const selHeader = $('selHeader');
  const chatAvatar = $('chatAvatar');
  const chatName = $('chatName');
  const chatStatus = $('chatStatus');
  const chatVerified = $('chatVerified');
  const backBtn = $('backBtn');
  const selCancel = $('selCancel');
  const selForward = $('selForward');
  const selDelete = $('selDelete');
  const selStar = $('selStar');
  const selReply = $('selReply');
  const micBtn = $('micBtn');
  const msgInput = $('msgInput');
  const voiceToggle = $('voiceToggle');
  const quickChips = $('quickChips');
  const attachBtn = $('attachBtn');
  const attachSheet = $('attachSheet');
  const attachScrim = $('attachScrim');
  const audioFileInput = $('audioFileInput');
  const recOverlay = $('recOverlay');
  const recTime = $('recTime');
  const dropHint = $('dropHint');
  const toastEl = $('toast');
  const sheetScrim = $('sheetScrim');
  const fwdSheet = $('fwdSheet');
  const fwdList = $('fwdList');
  const fwdSendbar = $('fwdSendbar');
  const fwdSelected = $('fwdSelected');
  const fwdSend = $('fwdSend');
  const fwdClose = $('fwdClose');

  const BARS = 42;
  let audioCtx = null;
  let currentAudio = null;
  let chatVoiceOn = false;

  // ── SVG ───────────────────────────────────────────────────
  const SVG = {
    play: '<svg viewBox="0 0 24 24" width="30" height="30"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 24 24" width="30" height="30"><path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor"/></svg>',
    tick: '<svg class="tick" viewBox="0 0 18 12"><path d="M17 1.4 7.6 11 3.9 7.3l1-1L7.6 9 16 0.4zM12.1 1.4 2.7 11 0 8.3l1-1L2.7 9l8.4-8.6z" fill="currentColor"/></svg>',
    tickSingle: '<svg class="tick" viewBox="0 0 16 12"><path d="M5.6 10.6 1.4 6.4l1.1-1.1 3.1 3.1 7.3-7.3 1.1 1.1z" fill="currentColor"/></svg>',
    clock: '<svg class="clock-ic" viewBox="0 0 24 24"><path d="M12 3a9 9 0 100 18 9 9 0 000-18zm0 16a7 7 0 110-14 7 7 0 010 14zm.6-11h-1.5v5l4 2.4.8-1.2-3.3-2z" fill="currentColor"/></svg>',
    forward: '<svg viewBox="0 0 20 20" width="13" height="13"><path d="M9.5 6.2V3l7 6.3-7 6.3v-3.3C5.6 9.6 3.4 12 2.4 15.2c-.2-5.4 2.9-8.4 7.1-9z" fill="currentColor"/></svg>',
    micBadge: '<span class="mic-badge"><svg viewBox="0 0 24 24" width="11" height="11"><path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V21h2v-3.1A7 7 0 0 0 19 11z" fill="currentColor"/></svg></span>',
    micMini: '<svg viewBox="0 0 24 24" width="15" height="15"><path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V21h2v-3.1A7 7 0 0 0 19 11z" fill="currentColor"/></svg>',
    verifiedSmall: '<svg viewBox="0 0 24 24" width="14" height="14"><path d="M12 1.6l2.3 1.7 2.85-.15 1 2.67 2.5 1.38-.63 2.78L21.9 13.9l-2 2.05.03 2.85-2.77.7-1.6 2.36L12.8 22.6 12 22l-.8.6-2.76-.74-1.6-2.36-2.77-.7.03-2.85-2-2.05 1.48-2.15-.63-2.78 2.5-1.38 1-2.67L9.7 3.3z" fill="#25D366"/><path d="M10.6 15.3l-3-3 1.2-1.2 1.8 1.8 4-4 1.2 1.2z" fill="#fff"/></svg>',
    check: '<svg viewBox="0 0 24 24" width="13" height="13"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" fill="currentColor"/></svg>',
    doubleTick: '<svg viewBox="0 0 18 12" width="15" height="11"><path d="M17 1.4 7.6 11 3.9 7.3l1-1L7.6 9 16 0.4zM12.1 1.4 2.7 11 0 8.3l1-1L2.7 9l8.4-8.6z" fill="currentColor"/></svg>',
    avaUser: '<svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="22" fill="#b0bec5"/><circle cx="22" cy="17" r="7" fill="#eceff1"/><path d="M8 39a14 14 0 0 1 28 0z" fill="#eceff1"/></svg>',
    avaBot: '<svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="22" fill="#0B7D6E"/><path d="M22 10a2 2 0 0 1 2 2v1.1a8 8 0 0 1 5.4 7.6V26l1.9 2.9a1 1 0 0 1-.83 1.55H13.5a1 1 0 0 1-.83-1.55L14.6 26v-3.3a8 8 0 0 1 5.4-7.6V12a2 2 0 0 1 2-2z" fill="#ECFDF8"/><circle cx="22" cy="22" r="3.8" fill="#0B7D6E"/></svg>',
  };
  const person = (bg) => `<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="24" fill="${bg}"/><circle cx="24" cy="19" r="7.5" fill="#fff" opacity=".92"/><path d="M9 41a15 15 0 0 1 30 0z" fill="#fff" opacity=".92"/></svg>`;
  const groupAva = (bg) => `<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="24" fill="${bg}"/><circle cx="17" cy="20" r="5.5" fill="#fff" opacity=".9"/><circle cx="31" cy="20" r="5.5" fill="#fff" opacity=".9"/><path d="M7 37a9 9 0 0 1 18 0zM23 37a9 9 0 0 1 18 0z" fill="#fff" opacity=".9"/></svg>`;

  // ── helpers ───────────────────────────────────────────────
  const clock = () => {
    const d = new Date();
    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, '0');
    const ap = h >= 12 ? 'pm' : 'am';
    h = h % 12 || 12;
    return `${h}:${m} ${ap}`;
  };
  const fmtDur = (s) => {
    if (!isFinite(s) || s < 0) s = 0;
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  };
  const el = (html) => {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const scrollDown = () => requestAnimationFrame(() => (chatEl.scrollTop = chatEl.scrollHeight + 600));
  let toastTimer;
  const toast = (msg) => { toastEl.textContent = msg; toastEl.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => (toastEl.hidden = true), 1800); };

  // ── conversations ─────────────────────────────────────────
  const AUDIO = { A: '/media/sampleA_input.mp3', B: '/media/sampleB_input.mp3', C: '/media/sampleC_input.mp3' };
  const spam = (id, num, sampleId, dur, time) => ({
    id, name: num, ava: person('#8696a0'), status: `last seen today at ${time}`, unknown: true,
    preview: 'voice', previewText: 'Voice message', time, unread: 1,
    messages: [{ kind: 'audio', side: 'in', src: AUDIO[sampleId], sampleId, role: 'spam', forwardedMany: true, dur, time }],
  });
  const CONV = {
    scam: spam('scam', '+91 98765 43210', 'A', '0:12', '9:38 am'),
    health: spam('health', '+91 90178 22540', 'B', '0:22', '9:12 am'),
    pension: spam('pension', '+91 87066 91234', 'C', '0:20', 'Yesterday'),
    truthanchor: {
      id: 'truthanchor', name: 'Truth-Anchor', verified: true, ava: SVG.avaBot, status: 'online', bot: true,
      preview: 'text', previewText: 'નમસ્તે 🙏 tap to chat or fact-check', time: '9:40 am', unread: 0, chatHistory: [],
      messages: [{ kind: 'text', side: 'in', text: 'નમસ્તે 🙏 મને કોઈ શંકાસ્પદ મેસેજ ફોરવર્ડ કરો, અથવા સીધું પૂછો — હું તપાસ કરીને સાદી ગુજરાતીમાં જવાબ આપીશ.', time: '9:40 am' }],
    },
    mom: { id: 'mom', name: 'મમ્મી', ava: person('#D96C6C'), status: 'last seen today at 8:15 am', preview: 'text', previewText: 'ભોજન થઈ ગયું? 🙂', time: '8:20 am', unread: 0, messages: [{ kind: 'text', side: 'in', text: 'ભોજન થઈ ગયું? 🙂', time: '8:20 am' }] },
    family: { id: 'family', name: 'ઘર પરિવાર', group: true, ava: groupAva('#7E93A6'), status: 'You, મમ્મી, Rohan, Papa', preview: 'text', previewText: 'Rohan: 👍', time: 'Yesterday', unread: 0, messages: [{ kind: 'text', side: 'in', text: '👍', author: 'Rohan', time: 'Yesterday' }] },
  };
  const LIST_ORDER = ['scam', 'health', 'pension', 'truthanchor', 'mom', 'family'];
  const SHEET_TARGETS = ['truthanchor', 'mom', 'family'];
  const INITIAL = JSON.parse(JSON.stringify({ ta: CONV.truthanchor.messages, mom: CONV.mom.messages, family: CONV.family.messages }));
  let activeConv = null;

  // ── chat list ─────────────────────────────────────────────
  function previewNode(c) {
    if (c.preview === 'voice') return `<span class="row-preview">${SVG.micMini}${escapeHtml(c.previewText)}</span>`;
    if (c.bot) return `<span class="row-preview"><span class="rt">${SVG.doubleTick}</span>${escapeHtml(c.previewText)}</span>`;
    return `<span class="row-preview">${escapeHtml(c.previewText)}</span>`;
  }
  function buildChatList() {
    chatlistEl.innerHTML = '';
    LIST_ORDER.forEach((id) => {
      const c = CONV[id];
      const row = el(`
        <div class="chat-row" data-conv="${id}">
          <div class="row-avatar">${c.ava}</div>
          <div class="row-main">
            <div class="row-line1"><span class="row-name">${escapeHtml(c.name)}${c.verified ? SVG.verifiedSmall : ''}</span><span class="row-time ${c.unread ? 'unreadt' : ''}">${escapeHtml(c.time)}</span></div>
            <div class="row-line2">${previewNode(c)}${c.unread ? `<span class="unread-badge">${c.unread}</span>` : ''}</div>
          </div>
        </div>`);
      row.addEventListener('click', () => openChat(id));
      chatlistEl.appendChild(row);
    });
  }

  // ── router ────────────────────────────────────────────────
  function openList() {
    exitSelection();
    buildChatList();
    if (!screenChat.hidden) {
      screenChat.classList.remove('enter');
      screenChat.classList.add('leave');
      const done = () => { screenChat.hidden = true; screenChat.classList.remove('leave'); screenChat.removeEventListener('animationend', done); };
      screenChat.addEventListener('animationend', done);
      setTimeout(done, 320);
    }
    screenList.hidden = false;
    activeConv = null;
  }
  function openChat(id) {
    activeConv = id;
    const c = CONV[id];
    exitSelection();
    chatAvatar.innerHTML = c.ava;
    chatName.textContent = c.name;
    chatVerified.innerHTML = c.verified ? SVG.verifiedSmall : '';
    setStatus('rest');
    c.unread = 0;
    renderConversation(c);
    quickChips.hidden = !c.bot;
    screenChat.hidden = false;
    screenChat.classList.remove('leave');
    void screenChat.offsetWidth;
    screenChat.classList.add('enter');
    scrollDown();
  }
  backBtn.addEventListener('click', openList);
  function setStatus(mode) {
    if (mode === 'typing') { chatStatus.textContent = 'typing…'; chatStatus.classList.add('typing'); }
    else if (mode === 'recording') { chatStatus.textContent = 'recording audio…'; chatStatus.classList.add('typing'); }
    else { chatStatus.textContent = CONV[activeConv]?.status || 'online'; chatStatus.classList.remove('typing'); }
  }

  // ── render conversation ───────────────────────────────────
  function renderConversation(conv) {
    messagesEl.innerHTML = '';
    messagesEl.appendChild(el('<div class="day-divider"><span>Today</span></div>'));
    messagesEl.appendChild(el(`<div class="encryption-note"><svg viewBox="0 0 24 24" width="11" height="11"><path d="M12 2a5 5 0 0 0-5 5v3H6a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1V7a5 5 0 0 0-5-5zm3 8H9V7a3 3 0 0 1 6 0z" fill="currentColor"/></svg>Messages are end-to-end encrypted.</div>`));
    if (conv.unknown) messagesEl.appendChild(el(`<div class="unknown-banner"><div class="ub-text">This number is not in your contacts. It may be sending unsolicited messages.</div><div class="ub-actions"><button class="ub-btn">Block</button><button class="ub-btn add">Add to contacts</button></div></div>`));
    conv.messages.forEach((m) => renderMessage(conv.id, m));
    scrollDown();
  }
  function renderMessage(convId, msg) {
    if (msg.kind === 'audio') return renderAudio(convId, msg);
    if (msg.kind === 'factcard') return renderFactCard(msg);
    if (msg.kind === 'text') return renderText(convId, msg);
  }
  function renderText(convId, msg) {
    const isOut = msg.side === 'out';
    const author = msg.author ? `<span class="grp-author">${escapeHtml(msg.author)}</span>` : '';
    const sub = msg.subtitle_en ? `<div class="subtitle">${escapeHtml(msg.subtitle_en)}</div>` : '';
    const node = el(`
      <div class="row ${msg.side}">
        <div class="bubble ${msg.side}">
          ${author}<span class="text">${escapeHtml(msg.text)}</span>${sub}
          <span class="meta">${escapeHtml(msg.time || clock())}${isOut ? '<span class="tickwrap">' + tickHtml('read') + '</span>' : ''}</span>
        </div>
      </div>`);
    messagesEl.appendChild(node);
    decorateBubble(node.querySelector('.bubble'), convId, msg);
    scrollDown();
    return node;
  }

  // ── waveform ──────────────────────────────────────────────
  function pseudoPeaks() { const p = []; for (let i = 0; i < BARS; i++) p.push(0.25 + 0.6 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.5))); return p; }
  async function decodePeaks(url) {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const buf = await (await fetch(url)).arrayBuffer();
      const audio = await audioCtx.decodeAudioData(buf);
      const data = audio.getChannelData(0);
      const block = Math.floor(data.length / BARS) || 1;
      const peaks = [];
      for (let i = 0; i < BARS; i++) { let max = 0; for (let j = 0; j < block; j += 64) { const v = Math.abs(data[i * block + j] || 0); if (v > max) max = v; } peaks.push(max); }
      const norm = Math.max(...peaks, 0.01);
      return peaks.map((p) => Math.max(0.08, p / norm));
    } catch (e) { console.warn('[wave] decode failed', e.message); return pseudoPeaks(); }
  }
  function drawWave(canvas, peaks, progress) {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth || 160, h = canvas.clientHeight || 30;
    if (canvas.width !== w * dpr) { canvas.width = w * dpr; canvas.height = h * dpr; }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const gap = 2, bw = (w - (peaks.length - 1) * gap) / peaks.length, cx = h / 2, playedTo = progress * peaks.length;
    for (let i = 0; i < peaks.length; i++) {
      const bh = Math.max(2, peaks[i] * (h - 6)), x = i * (bw + gap);
      ctx.fillStyle = i < playedTo ? '#00a884' : '#b6c2c7';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, cx - bh / 2, bw, bh, bw / 2); else ctx.rect(x, cx - bh / 2, bw, bh);
      ctx.fill();
    }
    const knobX = Math.max(4, Math.min(w - 4, progress * w));
    ctx.beginPath(); ctx.arc(knobX, cx, 5, 0, Math.PI * 2); ctx.fillStyle = '#00a884'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();
  }
  function tickHtml(state) {
    if (state === 'sending') return SVG.clock;
    if (state === 'sent') return SVG.tickSingle;
    if (state === 'delivered') return SVG.tick;
    if (state === 'read') return SVG.tick.replace('class="tick"', 'class="tick read"');
    return '';
  }
  const setTick = (node, state) => { const w = node.querySelector('.tickwrap'); if (w) w.innerHTML = tickHtml(state); };

  // ── audio bubble ──────────────────────────────────────────
  const SPEEDS = [1, 1.5, 2];
  function renderAudio(convId, msg) {
    const isOut = msg.side === 'out';
    let fwd = '';
    if (msg.forwardedMany) fwd = `<div class="forwarded many">${SVG.forward}Forwarded many times</div>`;
    else if (msg.forwarded) fwd = `<div class="forwarded">${SVG.forward}Forwarded</div>`;
    const node = el(`
      <div class="row ${msg.side}">
        <div class="bubble ${msg.side} audio">
          ${fwd}
          <div class="audio-top">
            <div class="audio-ava">${isOut ? SVG.avaUser : msg.role === 'reply' ? SVG.avaBot : SVG.avaUser}${SVG.micBadge}<span class="speed-pill">1×</span></div>
            <button class="play-btn" aria-label="Play">${SVG.play}</button>
            <div class="audio-mid"><canvas class="wave"></canvas></div>
          </div>
          <div class="audio-bottom">
            <span class="audio-dur">${msg.dur || '0:00'}</span>
            <span class="audio-time">${escapeHtml(msg.time || clock())}${isOut ? '<span class="tickwrap">' + tickHtml(msg.tick || 'read') + '</span>' : ''}</span>
          </div>
        </div>
      </div>`);
    messagesEl.appendChild(node);
    const bubble = node.querySelector('.bubble');
    const audio = new Audio(msg.src);
    audio.preload = 'metadata';
    const canvas = node.querySelector('.wave');
    const playBtn = node.querySelector('.play-btn');
    const durLabel = node.querySelector('.audio-dur');
    const speedPill = node.querySelector('.speed-pill');
    let peaks = pseudoPeaks(), progress = 0, speedIdx = 0;
    const render = () => drawWave(canvas, peaks, progress);
    requestAnimationFrame(render);
    decodePeaks(msg.src).then((p) => { peaks = p; render(); });
    audio.addEventListener('loadedmetadata', () => { if (isFinite(audio.duration)) durLabel.textContent = fmtDur(audio.duration); });
    audio.addEventListener('timeupdate', () => { progress = audio.duration ? audio.currentTime / audio.duration : 0; durLabel.textContent = fmtDur(audio.currentTime); render(); });
    audio.addEventListener('ended', () => { playBtn.innerHTML = SVG.play; bubble.classList.remove('playing'); progress = 0; durLabel.textContent = fmtDur(audio.duration || 0); render(); });
    audio.addEventListener('pause', () => { if (!audio.ended) { playBtn.innerHTML = SVG.play; bubble.classList.remove('playing'); } });
    playBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (audio.paused) { if (currentAudio && currentAudio !== audio) currentAudio.pause(); currentAudio = audio; audio.play(); playBtn.innerHTML = SVG.pause; bubble.classList.add('playing'); }
      else { audio.pause(); playBtn.innerHTML = SVG.play; bubble.classList.remove('playing'); }
    });
    speedPill.addEventListener('click', (e) => { e.stopPropagation(); speedIdx = (speedIdx + 1) % SPEEDS.length; audio.playbackRate = SPEEDS[speedIdx]; speedPill.textContent = SPEEDS[speedIdx] + '×'; });
    canvas.addEventListener('click', (e) => { const r = canvas.getBoundingClientRect(); const ratio = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)); if (audio.duration) audio.currentTime = ratio * audio.duration; });
    decorateBubble(bubble, convId, msg);
    return node;
  }

  // ── fact-check card ───────────────────────────────────────
  function renderFactCard(msg) {
    const data = msg.data || msg;
    const pill = data.pill || {};
    const pillClass = pill.kind === 'scam' ? 'scam' : pill.kind === 'verified' ? 'verified' : 'unsure';
    const chip = pill.chip ? `<span class="chip">${escapeHtml(pill.chip)}</span>` : '';
    const subtitle = data.subtitle_en ? `<div class="subtitle">${escapeHtml(data.subtitle_en)}</div>` : '';
    const pillRow = pill.text ? `<div class="pill-row"><span class="pill ${pillClass}">${escapeHtml(pill.text)}</span>${chip}</div>` : '';
    let source = '';
    if (data.citation) {
      const c = data.citation;
      source = `<div class="source-row"><a class="src-chip" href="${escapeHtml(c.url || '#')}" target="_blank" rel="noopener">📌 ${escapeHtml(c.name)}</a><span class="src-line">${escapeHtml(c.line || '')}</span></div>`;
    }
    const node = el(`
      <div class="row in">
        <div class="bubble in factcard">
          <div class="text">${escapeHtml(data.reply_gujarati || data.reply || '')}</div>
          ${subtitle}${pillRow}${source}
          <div class="card-meta"><span>${clock()}</span></div>
        </div>
      </div>`);
    messagesEl.appendChild(node);
    decorateBubble(node.querySelector('.bubble'), 'truthanchor', msg);
    scrollDown();
    return node;
  }
  const showTyping = (on) => { typingEl.hidden = !on; if (on) scrollDown(); };

  // ── selection ─────────────────────────────────────────────
  let selectedCtx = null;
  function attachLongPress(node, cb) {
    let timer;
    node.addEventListener('pointerdown', () => { timer = setTimeout(cb, 430); });
    ['pointerup', 'pointerleave', 'pointermove', 'pointercancel'].forEach((ev) => node.addEventListener(ev, () => clearTimeout(timer)));
    node.addEventListener('contextmenu', (e) => { e.preventDefault(); cb(); });
  }
  function enterSelection(convId, msg, node) {
    document.querySelectorAll('.row.msg-selected').forEach((r) => r.classList.remove('msg-selected'));
    selectedCtx = { convId, msg, node };
    node.classList.add('msg-selected');
    chatHeader.hidden = true; selHeader.hidden = false;
  }
  function exitSelection() {
    document.querySelectorAll('.row.msg-selected').forEach((r) => r.classList.remove('msg-selected'));
    document.querySelectorAll('.reaction-bar').forEach((b) => b.remove());
    selectedCtx = null; selHeader.hidden = true; chatHeader.hidden = false;
  }

  // ── message actions: hover chevron + long-press → reactions + top bar ──
  const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
  function decorateBubble(bubble, convId, msg) {
    const chev = el('<button class="bmenu" tabindex="-1" aria-label="Message menu"><svg viewBox="0 0 24 24" width="18" height="18"><path d="M7 10l5 5 5-5z" fill="currentColor"/></svg></button>');
    chev.addEventListener('click', (e) => { e.stopPropagation(); openMessageActions(convId, msg, bubble); });
    bubble.appendChild(chev);
    if (msg.reaction) bubble.appendChild(reactionPill(msg.reaction));
    attachLongPress(bubble, () => openMessageActions(convId, msg, bubble));
  }
  const reactionPill = (emoji) => el(`<span class="reaction-pill">${emoji}</span>`);
  function openMessageActions(convId, msg, bubble) {
    const row = bubble.closest('.row');
    enterSelection(convId, msg, row);
    showReactionBar(bubble, msg);
  }
  function showReactionBar(bubble, msg) {
    document.querySelectorAll('.reaction-bar').forEach((b) => b.remove());
    const bar = el(`<div class="reaction-bar">${REACTIONS.map((e) => `<button class="rx">${e}</button>`).join('')}<button class="rx rx-more">＋</button></div>`);
    const rb = bubble.getBoundingClientRect();
    const cb = chatEl.getBoundingClientRect();
    if (rb.top - cb.top < 56) bar.classList.add('below');
    bubble.appendChild(bar);
    bar.addEventListener('click', (e) => {
      const b = e.target.closest('.rx');
      if (!b) return;
      e.stopPropagation();
      if (b.classList.contains('rx-more')) toast('More reactions');
      else addReaction(bubble, msg, b.textContent);
      exitSelection();
    });
  }
  function addReaction(bubble, msg, emoji) {
    msg.reaction = emoji;
    bubble.querySelectorAll('.reaction-pill').forEach((p) => p.remove());
    bubble.appendChild(reactionPill(emoji));
  }
  selCancel.addEventListener('click', exitSelection);
  selForward.addEventListener('click', () => { if (selectedCtx) openSheet(payloadFromMsg(selectedCtx.msg)); });
  selDelete.addEventListener('click', () => { if (selectedCtx) { const c = CONV[selectedCtx.convId]; c.messages = c.messages.filter((m) => m !== selectedCtx.msg); selectedCtx.node.remove(); } exitSelection(); toast('Message deleted'); });
  selStar.addEventListener('click', () => { exitSelection(); toast('Message starred'); });
  selReply.addEventListener('click', () => { exitSelection(); toast('Swipe to reply'); });
  function payloadFromMsg(msg) {
    if (msg.kind === 'text') return { kind: 'share-text', text: msg.text };
    if (msg.kind === 'factcard') return { kind: 'share-text', text: msg.data?.reply_gujarati || msg.data?.reply || '' };
    if (msg.file) return { kind: 'verify-live', file: msg.file, src: msg.src };
    if (msg.sampleId && msg.role === 'spam') return { kind: 'factcheck', sampleId: msg.sampleId, src: msg.src };
    return { kind: 'share', src: msg.src };
  }
  chatEl.addEventListener('click', (e) => {
    if (selectedCtx && !e.target.closest('.reaction-bar, .bmenu, .msg-selected')) exitSelection();
  });

  // ── forward sheet ─────────────────────────────────────────
  let pendingForward = null;
  const sheetSel = new Set();
  function buildSheet() {
    fwdList.innerHTML = '';
    SHEET_TARGETS.forEach((id) => {
      const c = CONV[id];
      const row = el(`<div class="fwd-row" data-id="${id}"><div class="fwd-avatar">${c.ava}<span class="fwd-check">${SVG.check}</span></div><div class="fwd-rowmeta"><div class="fwd-name">${escapeHtml(c.name)}${c.verified ? SVG.verifiedSmall : ''}</div><div class="fwd-sub">${escapeHtml(c.status)}</div></div></div>`);
      row.addEventListener('click', () => toggleSheet(id, row));
      fwdList.appendChild(row);
    });
  }
  function toggleSheet(id, row) {
    if (sheetSel.has(id)) { sheetSel.delete(id); row.classList.remove('selected'); }
    else { sheetSel.add(id); row.classList.add('selected'); }
    if (sheetSel.size === 0) fwdSendbar.hidden = true;
    else { fwdSelected.innerHTML = `<span class="sel-names">${escapeHtml([...sheetSel].map((i) => CONV[i].name).join(', '))}</span>`; fwdSendbar.hidden = false; }
  }
  function clearSheetSel() { sheetSel.clear(); fwdList.querySelectorAll('.fwd-row.selected').forEach((r) => r.classList.remove('selected')); fwdSendbar.hidden = true; }
  function openSheet(payload) {
    pendingForward = payload; clearSheetSel();
    attachScrim.hidden = true; attachSheet.classList.remove('show');
    sheetScrim.hidden = false; fwdSheet.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => { sheetScrim.classList.add('show'); fwdSheet.classList.add('show'); });
  }
  function closeSheet() { sheetScrim.classList.remove('show'); fwdSheet.classList.remove('show'); setTimeout(() => { sheetScrim.hidden = true; fwdSheet.setAttribute('aria-hidden', 'true'); }, 300); }
  fwdClose.addEventListener('click', closeSheet);
  sheetScrim.addEventListener('click', closeSheet);
  fwdSend.addEventListener('click', () => {
    const targets = [...sheetSel], pf = pendingForward;
    if (!targets.length || !pf) return;
    closeSheet(); exitSelection();
    const toTA = targets.includes('truthanchor');
    targets.forEach((t) => {
      if (t === 'truthanchor' && (pf.kind === 'factcheck' || pf.kind === 'verify-live')) return;
      if (pf.kind === 'share-text') {
        CONV[t].messages.push({ kind: 'text', side: 'out', text: pf.text, forwarded: true, time: clock() });
        CONV[t].previewText = (pf.text || '').slice(0, 40); CONV[t].preview = 'text'; CONV[t].time = clock();
      } else {
        CONV[t].messages.push({ kind: 'audio', side: 'out', src: pf.src, file: pf.file, forwarded: true, role: 'shared', tick: 'read', time: clock() });
        CONV[t].previewText = 'Voice message'; CONV[t].preview = 'voice'; CONV[t].time = clock();
      }
    });
    const navTo = toTA ? 'truthanchor' : targets[0];
    openChat(navTo);
    if (toTA && pf.kind === 'factcheck') runFactCheck(pf.sampleId);
    else if (toTA && pf.kind === 'verify-live') runVerifyLive(pf.file);
    else toast('Shared ✓');
  });

  // ── fact-check flows ──────────────────────────────────────
  async function tickSequence(node) {
    await wait(450); setTick(node, 'sent');
    await wait(500); setTick(node, 'delivered');
    setStatus('typing'); showTyping(true);
  }
  async function runFactCheck(sampleId) {
    const conv = CONV.truthanchor;
    const outMsg = { kind: 'audio', side: 'out', src: AUDIO[sampleId], forwarded: true, role: 'user', tick: 'sending', time: clock() };
    conv.messages.push(outMsg);
    const node = renderAudio('truthanchor', outMsg);
    await tickSequence(node);
    try {
      const res = await fetch('/api/process', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sampleId }) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      await wait(700); setTick(node, 'read'); await wait(400);
      showTyping(false); setStatus('rest');
      await deliverReply(data);
    } catch (e) { console.error('[ui] factcheck failed', e); showTyping(false); setStatus('rest'); toast('Could not reach Truth-Anchor'); }
  }
  async function runVerifyLive(file) {
    const conv = CONV.truthanchor;
    const url = file ? URL.createObjectURL(file) : null;
    const outMsg = { kind: 'audio', side: 'out', src: url, file, forwarded: true, role: 'user', tick: 'sending', time: clock() };
    conv.messages.push(outMsg);
    const node = renderAudio('truthanchor', outMsg);
    await tickSequence(node);
    try {
      const fd = new FormData();
      fd.append('audio', file, file.name || 'audio');
      const res = await fetch('/api/process', { method: 'POST', body: fd });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      await wait(400); setTick(node, 'read'); await wait(300);
      showTyping(false); setStatus('rest');
      if (data.providers) console.log('[live] providers:', data.providers);
      await deliverReply(data);
    } catch (e) { console.error('[ui] verify-live failed', e); showTyping(false); setStatus('rest'); toast('Could not process the audio'); }
  }
  async function deliverReply(data) {
    const conv = CONV.truthanchor;
    if (data.replyAudioUrl) {
      const replyMsg = { kind: 'audio', side: 'in', src: data.replyAudioUrl, role: 'reply', time: clock() };
      conv.messages.push(replyMsg);
      renderAudio('truthanchor', replyMsg);
      await wait(650);
    }
    const fc = { kind: 'factcard', data, time: clock() };
    conv.messages.push(fc);
    renderFactCard(fc);
    conv.previewText = 'Voice message'; conv.preview = 'voice'; conv.time = clock();
  }

  // ── conversational chat (Part D) ──────────────────────────
  function pushHistory(role, content) { CONV.truthanchor.chatHistory.push({ role, content }); if (CONV.truthanchor.chatHistory.length > 12) CONV.truthanchor.chatHistory.shift(); }
  async function sendText(text) {
    if (!text.trim()) return;
    if (activeConv !== 'truthanchor') { openChat('truthanchor'); }
    const outMsg = { kind: 'text', side: 'out', text, time: clock() };
    CONV.truthanchor.messages.push(outMsg);
    renderText('truthanchor', outMsg);
    pushHistory('user', text);
    setStatus('typing'); showTyping(true);
    try {
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text, history: CONV.truthanchor.chatHistory.slice(0, -1), voice: chatVoiceOn }) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      await wait(500); showTyping(false); setStatus('rest');
      await deliverChatReply(data);
    } catch (e) { console.error('[chat] failed', e); showTyping(false); setStatus('rest'); toast('Could not reach Truth-Anchor'); }
  }
  async function deliverChatReply(data) {
    const conv = CONV.truthanchor;
    if (data.replyAudioUrl) { const vm = { kind: 'audio', side: 'in', src: data.replyAudioUrl, role: 'reply', time: clock() }; conv.messages.push(vm); renderAudio('truthanchor', vm); await wait(450); }
    const txt = { kind: 'text', side: 'in', text: data.reply, subtitle_en: data.subtitle_en, time: clock() };
    conv.messages.push(txt);
    renderText('truthanchor', txt);
    pushHistory('assistant', data.reply);
    conv.previewText = data.reply.slice(0, 40); conv.preview = 'text'; conv.time = clock();
  }
  async function sendVoiceMessage(blob) {
    const conv = CONV.truthanchor;
    const url = URL.createObjectURL(blob);
    const outMsg = { kind: 'audio', side: 'out', src: url, role: 'user', tick: 'delivered', time: clock() };
    conv.messages.push(outMsg);
    const node = renderAudio('truthanchor', outMsg);
    setStatus('typing'); showTyping(true);
    try {
      const fd = new FormData();
      const ext = (blob.type.split('/')[1] || 'webm').split(';')[0];
      fd.append('audio', blob, `voice.${ext}`);
      fd.append('history', JSON.stringify(conv.chatHistory));
      fd.append('voice', String(chatVoiceOn));
      const res = await fetch('/api/chat', { method: 'POST', body: fd });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTick(node, 'read');
      if (data.transcript) pushHistory('user', data.transcript);
      await wait(400); showTyping(false); setStatus('rest');
      await deliverChatReply(data);
    } catch (e) { console.error('[chat voice] failed', e); showTyping(false); setStatus('rest'); toast('Could not process the voice message'); }
  }

  // quick chips + input send
  quickChips.addEventListener('click', (e) => { const c = e.target.closest('.qchip'); if (c && c.dataset.q) sendText(c.dataset.q); });
  voiceToggle.addEventListener('click', () => {
    chatVoiceOn = !chatVoiceOn;
    voiceToggle.classList.toggle('on', chatVoiceOn);
    voiceToggle.innerHTML = `<span class="vc-ic">${chatVoiceOn ? '🔊' : '🔈'}</span>Voice: ${chatVoiceOn ? 'On' : 'Off'}`;
    toast(chatVoiceOn ? '🔊 Voice replies on' : 'Voice replies off');
  });
  const cameraBtn = $('cameraBtn');
  function updateFabMode() {
    const has = msgInput.value.trim().length > 0;
    micBtn.classList.toggle('send-mode', has);
    if (cameraBtn) cameraBtn.hidden = has;
  }
  msgInput.addEventListener('input', updateFabMode);
  msgInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); const t = msgInput.value; msgInput.value = ''; updateFabMode(); sendText(t); } });

  // ── attach / import audio (Part C) ────────────────────────
  function openAttach() { attachScrim.hidden = false; attachSheet.setAttribute('aria-hidden', 'false'); requestAnimationFrame(() => { attachScrim.classList.add('show'); attachSheet.classList.add('show'); }); }
  function closeAttach() { attachScrim.classList.remove('show'); attachSheet.classList.remove('show'); setTimeout(() => { attachScrim.hidden = true; }, 220); }
  attachBtn.addEventListener('click', openAttach);
  attachScrim.addEventListener('click', closeAttach);
  attachSheet.addEventListener('click', (e) => {
    const item = e.target.closest('.att-item'); if (!item) return;
    if (item.dataset.att === 'audio') { closeAttach(); audioFileInput.click(); }
    else { closeAttach(); toast('For the demo, tap Audio to import a voice note'); }
  });
  audioFileInput.addEventListener('change', () => { const f = audioFileInput.files?.[0]; if (f) importAudioFile(f); audioFileInput.value = ''; });

  function importAudioFile(file) {
    if (activeConv === 'truthanchor') { runVerifyLive(file); return; }
    const target = activeConv && CONV[activeConv] ? activeConv : 'scam';
    if (!activeConv) openChat(target);
    const url = URL.createObjectURL(file);
    const msg = { kind: 'audio', side: 'in', src: url, file, role: 'imported', time: clock() };
    CONV[target].messages.push(msg);
    renderAudio(target, msg);
    toast('Voice note added — long-press to forward to Truth-Anchor');
  }

  // drag-drop
  let dragDepth = 0;
  window.addEventListener('dragenter', (e) => { if ([...(e.dataTransfer?.items || [])].some((i) => i.kind === 'file')) { dragDepth++; dropHint.hidden = false; } });
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('dragleave', () => { dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) dropHint.hidden = true; });
  window.addEventListener('drop', (e) => {
    e.preventDefault(); dragDepth = 0; dropHint.hidden = true;
    const f = [...(e.dataTransfer?.files || [])].find((x) => x.type.startsWith('audio') || /\.(mp3|m4a|ogg|wav|aac|opus)$/i.test(x.name));
    if (f) importAudioFile(f); else toast('Drop an audio file (mp3/m4a/ogg/wav)');
  });

  // ── mic recording ─────────────────────────────────────────
  let mediaRecorder = null, recChunks = [], recTimer = null, recStart = 0;
  async function toggleRecord() {
    if (msgInput.value.trim()) { const t = msgInput.value; msgInput.value = ''; updateFabMode(); sendText(t); return; }
    if (activeConv !== 'truthanchor') { toast('Open the Truth-Anchor chat to chat by voice'); return; }
    if (mediaRecorder && mediaRecorder.state === 'recording') { mediaRecorder.stop(); return; }
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch (e) { console.error('[mic] denied', e); toast('Microphone not available — import an audio file instead'); return; }
    recChunks = [];
    const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
    mediaRecorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    mediaRecorder.ondataavailable = (ev) => ev.data.size && recChunks.push(ev.data);
    const recLock = $('recLock');
    mediaRecorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      micBtn.classList.remove('recording'); recOverlay.hidden = true; recLock.hidden = true; clearInterval(recTimer); setStatus('rest');
      sendVoiceMessage(new Blob(recChunks, { type: mediaRecorder.mimeType || 'audio/webm' }));
    };
    mediaRecorder.start();
    micBtn.classList.add('recording'); recOverlay.hidden = false; recLock.hidden = false; setStatus('recording');
    recStart = performance.now();
    recTimer = setInterval(() => { recTime.textContent = fmtDur((performance.now() - recStart) / 1000); }, 200);
  }
  micBtn.addEventListener('click', toggleRecord);

  // ── record mode (Part G) ──────────────────────────────────
  function resetAll() {
    CONV.truthanchor.messages = JSON.parse(JSON.stringify(INITIAL.ta));
    CONV.truthanchor.chatHistory = [];
    CONV.truthanchor.previewText = 'નમસ્તે 🙏 tap to chat or fact-check';
    CONV.mom.messages = JSON.parse(JSON.stringify(INITIAL.mom));
    CONV.family.messages = JSON.parse(JSON.stringify(INITIAL.family));
    ['scam', 'health', 'pension'].forEach((k) => (CONV[k].unread = 1));
    openList();
    toast('Reset ✓');
  }
  function replay(sampleId) {
    const map = { A: 'scam', B: 'health', C: 'pension' };
    CONV.truthanchor.messages = JSON.parse(JSON.stringify(INITIAL.ta));
    CONV.truthanchor.chatHistory = [];
    openChat('truthanchor');
    setTimeout(() => runFactCheck(sampleId), 350);
  }
  if (new URLSearchParams(location.search).has('record')) document.body.classList.add('record');
  window.addEventListener('keydown', (e) => {
    if (e.target === msgInput) return;
    if (e.key === 'r' || e.key === 'R') resetAll();
    else if (e.key === '1') replay('A');
    else if (e.key === '2') replay('B');
    else if (e.key === '3') replay('C');
    else if (e.key === 'b' || e.key === 'B') document.body.classList.toggle('record');
  });

  // ── ripple ────────────────────────────────────────────────
  document.addEventListener('pointerdown', (e) => {
    const t = e.target.closest('.chat-row,.icon-btn,.fchip,.qchip,.att-item,.fwd-row,.nav-item');
    if (!t) return;
    const r = t.getBoundingClientRect();
    const d = Math.max(r.width, r.height);
    const ink = document.createElement('span');
    ink.className = 'ripple-ink';
    ink.style.width = ink.style.height = d + 'px';
    ink.style.left = e.clientX - r.left - d / 2 + 'px';
    ink.style.top = e.clientY - r.top - d / 2 + 'px';
    t.appendChild(ink);
    setTimeout(() => ink.remove(), 520);
  });

  // init
  buildSheet();
  openList();
})();
