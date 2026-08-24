(function () {
  const TOOLS = [
    { id: 'amazon', label: '\ud83d\udce6 Amazon Listing', placeholder: 'Wireless earbuds with noise cancellation, 30hr battery, waterproof…', inputLabel: 'Describe your product',
      examples: ['Stainless steel water bottle, 1L, keeps drinks cold 24hrs', 'Bamboo cutting board set, eco-friendly, 3 sizes', 'Kids educational tablet, 7-inch, parental controls'] },
    { id: 'shopify', label: '\ud83d\udecd\ufe0f Shopify Product Ad', placeholder: 'Handmade leather wallet, minimalist, RFID blocking…', inputLabel: 'Describe your product',
      examples: ['Organic skincare set for sensitive skin', 'Custom pet portraits, hand-painted', 'Minimalist ceramic coffee mugs, set of 4'] },
    { id: 'facebook', label: '\ud83d\udcd8 Facebook / Instagram Ad', placeholder: 'Online yoga course, beginner friendly, 30-day program…', inputLabel: 'Describe your offer',
      examples: ['Flash sale: 30% off all sneakers this weekend', 'New app launch: budgeting made simple', 'Local bakery, custom birthday cakes'] },
    { id: 'google', label: '\ud83d\udd0d Google Ads', placeholder: 'Plumbing service in Lahore, 24/7 emergency callouts…', inputLabel: 'Describe your offer',
      examples: ['Web design agency for small businesses', 'Car rental service, airport pickup', 'Online Quran classes for kids'] },
    { id: 'banner', label: '\ud83d\uddbc\ufe0f Banner / Display Ad', placeholder: 'Summer clearance sale, up to 50% off all items…', inputLabel: 'Describe your promotion',
      examples: ['Back-to-school sale on laptops', 'New restaurant opening, grand opening discount', 'Fitness app free trial offer'] },
    { id: 'video', label: '\ud83c\udfac Animated Ad Video', placeholder: 'A running shoe launch, energetic and modern…', inputLabel: 'Describe your product or offer', isVideo: true,
      examples: ['A new perfume launch, elegant and luxurious', 'A coffee brand, cozy and warm', 'A tech gadget reveal, sleek and futuristic'] }
  ];

  const HISTORY_DAYS = 30;
  const HISTORY_MS = HISTORY_DAYS * 24 * 60 * 60 * 1000;

  const pegboard = document.getElementById('pegboard');
  const rack = document.getElementById('rack');
  const scrim = document.getElementById('scrim');
  const hamburger = document.getElementById('hamburger');
  const toolTitle = document.getElementById('toolTitle');
  const toolSub = document.getElementById('toolSub');
  const toolInput = document.getElementById('toolInput');
  const toolForm = document.getElementById('toolForm');
  const runBtn = document.getElementById('runBtn');
  const statusEl = document.getElementById('status');
  const chatLog = document.getElementById('chatLog');
  const logScroll = document.getElementById('logScroll');
  const examplesEl = document.getElementById('examples');

  let activeId = 'amazon';
  let history = [];

  function historyKey(id) { return 'adforge_hist_' + id; }

  function loadHistory(id) {
    try {
      const raw = localStorage.getItem(historyKey(id));
      if (!raw) return [];
      const arr = JSON.parse(raw);
      const cutoff = Date.now() - HISTORY_MS;
      const kept = arr.filter((m) => (m.ts || 0) >= cutoff);
      if (kept.length !== arr.length) saveHistory(id, kept);
      return kept;
    } catch (e) { return []; }
  }

  function saveHistory(id, arr) {
    try { localStorage.setItem(historyKey(id), JSON.stringify(arr)); } catch (e) { /* ignore */ }
  }

  function renderPegboard() {
    pegboard.innerHTML = TOOLS.map((t, i) => `
      <button class="peg${t.id === activeId ? ' active' : ''}" data-id="${t.id}">
        <span class="peg-num">${String(i + 1).padStart(2, '0')}</span>
        <span>${t.label}</span>
      </button>
    `).join('');
    pegboard.querySelectorAll('.peg').forEach((btn) => {
      btn.addEventListener('click', () => selectTool(btn.dataset.id));
    });
  }

  function openRack() { rack.classList.add('open'); scrim.classList.add('show'); }
  function closeRack() { rack.classList.remove('open'); scrim.classList.remove('show'); }
  hamburger.addEventListener('click', openRack);
  scrim.addEventListener('click', closeRack);

  function autoGrow() {
    toolInput.style.height = 'auto';
    toolInput.style.height = Math.min(toolInput.scrollHeight, 180) + 'px';
  }
  toolInput.addEventListener('input', autoGrow);

  function renderExamples(t) {
    if (history.length) { examplesEl.innerHTML = ''; return; }
    examplesEl.innerHTML = (t.examples || []).map((ex) =>
      `<button type="button" class="example-pill">${ex}</button>`
    ).join('');
    examplesEl.querySelectorAll('.example-pill').forEach((btn) => {
      btn.addEventListener('click', () => {
        toolInput.value = btn.textContent;
        autoGrow();
        toolInput.focus();
      });
    });
  }

  function scrollToBottom() { logScroll.scrollTop = logScroll.scrollHeight; }

  /* ---------- animated video builder (Ken Burns style, client-side) ---------- */
  function loadImg(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  function drawKenBurns(ctx, canvas, img, duration) {
    return new Promise((resolve) => {
      const start = performance.now();
      const startScale = 1.0, endScale = 1.15;
      function frame(now) {
        const t = Math.min((now - start) / duration, 1);
        const scale = startScale + (endScale - startScale) * t;
        const cw = canvas.width, ch = canvas.height;
        const baseScale = Math.max(cw / img.width, ch / img.height);
        const s = baseScale * scale;
        const dw = img.width * s, dh = img.height * s;
        const dx = (cw - dw) / 2, dy = (ch - dh) / 2;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, cw, ch);
        ctx.drawImage(img, dx, dy, dw, dh);
        if (t < 1) requestAnimationFrame(frame);
        else resolve();
      }
      requestAnimationFrame(frame);
    });
  }

  async function buildKenBurnsVideo(imageSrcs, msPerImage) {
    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    const stream = canvas.captureStream(30);
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks = [];
    recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    const done = new Promise((resolve) => { recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' })); });
    recorder.start();

    for (const src of imageSrcs) {
      const img = await loadImg(src);
      await drawKenBurns(ctx, canvas, img, msPerImage);
    }
    recorder.stop();
    return await done;
  }

  function buildMsgEl(msg) {
    const div = document.createElement('div');
    div.className = 'chat-msg ' + (msg.role === 'user' ? 'user' : (msg.type === 'error' ? 'error' : 'assistant'));

    if (msg.type === 'video') {
      const card = document.createElement('div');
      card.className = 'ad-card';
      if (msg.text) {
        const cap = document.createElement('div');
        cap.className = 'ad-copy';
        cap.textContent = msg.text;
        card.appendChild(cap);
      }
      const video = document.createElement('video');
      video.className = 'ad-video';
      video.src = msg.videoUrl;
      video.controls = true;
      video.autoplay = true;
      video.loop = true;
      video.muted = true;
      card.appendChild(video);
      const dl = document.createElement('a');
      dl.className = 'copy-msg-btn';
      dl.textContent = 'Download video';
      dl.href = msg.videoUrl;
      dl.download = 'ad-video.webm';
      card.appendChild(dl);
      div.appendChild(card);
    } else if (msg.type === 'ad') {
      const card = document.createElement('div');
      card.className = 'ad-card';
      const copy = document.createElement('div');
      copy.className = 'ad-copy';
      copy.textContent = msg.text || '';
      card.appendChild(copy);
      if (msg.image) {
        const img = document.createElement('img');
        img.className = 'ad-banner';
        img.src = msg.image;
        card.appendChild(img);
      }
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'copy-msg-btn';
      btn.textContent = 'Copy text';
      btn.addEventListener('click', () => {
        navigator.clipboard.writeText(msg.text || '').then(() => {
          btn.textContent = 'Copied';
          setTimeout(() => (btn.textContent = 'Copy text'), 1200);
        });
      });
      card.appendChild(btn);
      div.appendChild(card);
    } else {
      const p = document.createElement('div');
      p.textContent = msg.text || '';
      div.appendChild(p);
    }
    return div;
  }

  function renderLog() {
    chatLog.innerHTML = '';
    history.forEach((msg) => chatLog.appendChild(buildMsgEl(msg)));
    scrollToBottom();
  }

  function appendMessage(msg, persist) {
    chatLog.appendChild(buildMsgEl(msg));
    scrollToBottom();
    if (persist) { history.push(msg); saveHistory(activeId, history); }
  }

  function showTyping() {
    const div = document.createElement('div');
    div.className = 'chat-msg assistant';
    div.innerHTML = '<span class="typing-dots"><span></span><span></span><span></span></span>';
    chatLog.appendChild(div);
    scrollToBottom();
    return div;
  }

  function selectTool(id) {
    activeId = id;
    const t = TOOLS.find((x) => x.id === id);
    toolTitle.textContent = t.label.replace(/^\S+\s/, '');
    toolSub.textContent = t.inputLabel;
    toolInput.placeholder = t.placeholder;
    toolInput.value = '';
    autoGrow();
    statusEl.textContent = '';
    statusEl.classList.remove('err');

    history = loadHistory(id);
    renderLog();
    renderExamples(t);
    renderPegboard();
    closeRack();
  }

  toolForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const t = TOOLS.find((x) => x.id === activeId);
    const value = toolInput.value.trim();
    if (!value) return;

    runBtn.disabled = true;
    statusEl.classList.remove('err');
    statusEl.textContent = '';

    const currentInput = value;
    toolInput.value = '';
    autoGrow();

    appendMessage({ role: 'user', text: currentInput, ts: Date.now() }, true);
    renderExamples(t);

    const typingEl = showTyping();

    if (t.isVideo) {
      statusEl.textContent = 'Writing tagline\u2026';
      try {
        const tagRes = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tool: t.id, input: currentInput })
        });
        const tagJson = await tagRes.json();
        const tagline = (tagRes.ok && !tagJson.error) ? tagJson.output : '';

        statusEl.textContent = 'Generating scenes (1/3)\u2026';
        const variations = ['wide establishing shot', 'close-up detail shot', 'dynamic angled shot'];
        const imageSrcs = [];
        for (let i = 0; i < variations.length; i++) {
          statusEl.textContent = `Generating scenes (${i + 1}/3)\u2026`;
          const res = await fetch('/api/image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: currentInput + ', ' + variations[i], tool: t.id })
          });
          const j = await res.json();
          if (res.ok && !j.error && j.image) imageSrcs.push(j.image);
        }
        if (!imageSrcs.length) throw new Error('could not generate any scenes');

        statusEl.textContent = 'Rendering video\u2026';
        const blob = await buildKenBurnsVideo(imageSrcs, 2200);
        const videoUrl = URL.createObjectURL(blob);

        typingEl.remove();
        // Video blobs can't be saved to localStorage (too large) — shown live, not persisted.
        appendMessage({ role: 'assistant', type: 'video', text: tagline, videoUrl, ts: Date.now() }, false);
        statusEl.textContent = 'Note: this video isn\u2019t saved to history \u2014 download it before leaving the page.';
      } catch (err) {
        typingEl.remove();
        appendMessage({ role: 'assistant', type: 'error', text: 'Couldn\u2019t build the video — ' + (err.message || 'try again'), ts: Date.now() }, false);
        statusEl.textContent = '';
      } finally {
        runBtn.disabled = false;
      }
      return;
    }

    statusEl.textContent = 'Writing copy \u0026 designing banner\u2026';

    try {
      const [copyRes, imageRes] = await Promise.all([
        fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tool: t.id, input: currentInput })
        }),
        fetch('/api/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: currentInput, tool: t.id })
        })
      ]);

      const copyJson = await copyRes.json();
      if (!copyRes.ok || copyJson.error) throw new Error(copyJson.error || 'ad copy request failed');

      let imageDataUrl = null;
      try {
        const imgJson = await imageRes.json();
        if (imageRes.ok && !imgJson.error) imageDataUrl = imgJson.image;
      } catch (e) { /* banner is optional; copy still shown if it fails */ }

      typingEl.remove();
      appendMessage({ role: 'assistant', type: 'ad', text: copyJson.output, image: imageDataUrl, ts: Date.now() }, true);
      statusEl.textContent = '';
    } catch (err) {
      typingEl.remove();
      appendMessage({ role: 'assistant', type: 'error', text: 'Couldn\u2019t generate that — ' + (err.message || 'try again'), ts: Date.now() }, false);
      statusEl.textContent = '';
    } finally {
      runBtn.disabled = false;
    }
  });

  renderPegboard();
  selectTool('amazon');
})();
