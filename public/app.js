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
      examples: ['Back-to-school sale on laptops', 'New restaurant opening, grand opening discount', 'Fitness app free trial offer'] }
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

  function buildMsgEl(msg) {
    const div = document.createElement('div');
    div.className = 'chat-msg ' + (msg.role === 'user' ? 'user' : (msg.type === 'error' ? 'error' : 'assistant'));

    if (msg.type === 'ad') {
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
