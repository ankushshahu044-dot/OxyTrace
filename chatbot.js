// ── OxyTrace AI Chatbot (Gemini) ──────────────────────────────────────────────
// IMPORTANT: Set your Gemini API key below, or set window.GEMINI_API_KEY
// before this script loads. Get a free key at: https://aistudio.google.com/app/apikey
(function () {
  const GEMINI_API_KEY = window.GEMINI_API_KEY || 'YOUR_GEMINI_API_KEY';
  const MODEL = 'gemini-2.0-flash';
  const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const SYSTEM_PROMPT = `You are OxyBot, a smart assistant built into the OxyTrace air quality app.
You help users with:
- Air quality & health: Explain AQI levels, PM2.5, pollutants, and health risks
- Navigation: Help users find safe parks, low-pollution routes, and safe zones
- Alerts: Warn users about dangerous air quality and advise precautions
- Tips: Give personalized advice on masks, outdoor timing, indoor air quality

Always be concise, friendly, and focused on air quality and health topics.
If asked something unrelated, gently redirect to OxyTrace topics.`;

  let history = [
    { role: 'user',  parts: [{ text: SYSTEM_PROMPT }] },
    { role: 'model', parts: [{ text: "Understood! I'm OxyBot, your OxyTrace air quality assistant. I'm ready to help with AQI info, health tips, safe navigation, and pollution alerts." }] }
  ];

  let isOpen = false;

  // ── Styles ────────────────────────────────────────────────────────────────────
  const styles = `
    #oxy-bubble {
      position: fixed; bottom: 90px; right: 20px; z-index: 10000;
      width: 52px; height: 52px; border-radius: 50%;
      background: linear-gradient(135deg, #00d4ff, #00ff88);
      box-shadow: 0 0 20px rgba(0,212,255,0.6), 0 0 40px rgba(0,255,136,0.2);
      cursor: grab; display: flex; align-items: center; justify-content: center;
      font-size: 22px; transition: box-shadow 0.2s;
      animation: pulse-bubble 3s ease-in-out infinite;
      touch-action: none; -webkit-user-select: none; user-select: none;
    }
    #oxy-bubble.dragging {
      cursor: grabbing; animation: none; transform: scale(1.12);
      box-shadow: 0 0 40px rgba(0,212,255,1), 0 4px 20px rgba(0,0,0,0.5);
      transition: none;
    }
    #oxy-bubble:not(.dragging):hover { transform: scale(1.1); box-shadow: 0 0 30px rgba(0,212,255,0.9); }
    @keyframes pulse-bubble {
      0%,100% { box-shadow: 0 0 20px rgba(0,212,255,0.6); }
      50% { box-shadow: 0 0 35px rgba(0,212,255,0.9), 0 0 60px rgba(0,255,136,0.3); }
    }
    #oxy-window {
      position: fixed; z-index: 10000;
      width: 340px; max-height: 520px;
      background: #070b0f; border: 1px solid rgba(0,212,255,0.3);
      border-radius: 16px; display: flex; flex-direction: column;
      box-shadow: 0 0 40px rgba(0,212,255,0.15), 0 20px 60px rgba(0,0,0,0.6);
      font-family: 'IBM Plex Mono', monospace;
      transition: opacity 0.2s, transform 0.2s;
    }
    #oxy-window.hidden { opacity: 0; pointer-events: none; transform: translateY(10px); }
    #oxy-header {
      padding: 14px 16px; border-bottom: 1px solid rgba(0,212,255,0.15);
      display: flex; align-items: center; justify-content: space-between;
      background: rgba(0,212,255,0.05); border-radius: 16px 16px 0 0;
    }
    #oxy-header-left { display: flex; align-items: center; gap: 10px; }
    #oxy-avatar {
      width: 34px; height: 34px; border-radius: 50%;
      background: linear-gradient(135deg,#00d4ff,#00ff88);
      display: flex; align-items:center; justify-content:center; font-size:16px;
    }
    #oxy-title { color: #00d4ff; font-size: 13px; font-weight: 600; letter-spacing:1px; }
    #oxy-subtitle { color: rgba(0,212,255,0.5); font-size: 10px; }
    #oxy-close { color: rgba(0,212,255,0.5); cursor:pointer; font-size:18px; padding:4px; }
    #oxy-close:hover { color: #00d4ff; }
    #oxy-messages {
      flex: 1; overflow-y: auto; padding: 14px; display: flex;
      flex-direction: column; gap: 10px; min-height: 0; max-height: 340px;
    }
    #oxy-messages::-webkit-scrollbar { width: 4px; }
    #oxy-messages::-webkit-scrollbar-thumb { background: rgba(0,212,255,0.3); border-radius:4px; }
    .oxy-msg {
      max-width: 85%; padding: 10px 13px; border-radius: 12px;
      font-size: 12px; line-height: 1.55; word-break: break-word; white-space: pre-wrap;
    }
    .oxy-msg.bot {
      background: rgba(0,212,255,0.08); border: 1px solid rgba(0,212,255,0.15);
      color: #c8eeff; align-self: flex-start; border-radius: 4px 12px 12px 12px;
    }
    .oxy-msg.user {
      background: rgba(0,255,136,0.1); border: 1px solid rgba(0,255,136,0.2);
      color: #b8ffd8; align-self: flex-end; border-radius: 12px 4px 12px 12px;
    }
    .oxy-msg.error {
      background: rgba(255,80,80,0.08); border: 1px solid rgba(255,80,80,0.25);
      color: #ffaaaa; align-self: flex-start; border-radius: 4px 12px 12px 12px;
    }
    .oxy-typing { display:flex; gap:5px; align-items:center; padding:4px 0; }
    .oxy-typing span {
      width:6px; height:6px; border-radius:50%; background:#00d4ff; opacity:0.4;
      animation: typingDot 1.2s infinite;
    }
    .oxy-typing span:nth-child(2){animation-delay:.2s;}
    .oxy-typing span:nth-child(3){animation-delay:.4s;}
    @keyframes typingDot { 0%,80%,100%{opacity:0.2;transform:scale(1);} 40%{opacity:1;transform:scale(1.2);} }
    #oxy-api-notice {
      margin: 0 14px 8px; padding: 8px 12px;
      background: rgba(255,180,0,0.07); border: 1px solid rgba(255,180,0,0.2);
      border-radius: 8px; font-size: 10px; color: rgba(255,200,80,0.85); line-height: 1.5;
    }
    #oxy-api-notice a { color: #00d4ff; }
    #oxy-input-area {
      padding: 12px; border-top: 1px solid rgba(0,212,255,0.12);
      display: flex; gap: 8px; align-items: flex-end;
    }
    #oxy-input {
      flex:1; background: rgba(0,212,255,0.05); border: 1px solid rgba(0,212,255,0.2);
      border-radius: 10px; padding: 9px 12px; color: #e0f4ff;
      font-family: 'IBM Plex Mono', monospace; font-size: 12px;
      resize: none; outline: none; max-height: 80px;
    }
    #oxy-input:focus { border-color: rgba(0,212,255,0.5); }
    #oxy-input::placeholder { color: rgba(0,212,255,0.3); }
    #oxy-send {
      width: 36px; height: 36px; border-radius: 50%; flex-shrink:0;
      background: linear-gradient(135deg,#00d4ff,#00ff88);
      border: none; cursor: pointer; display:flex; align-items:center; justify-content:center;
      font-size: 15px; transition: transform 0.15s, box-shadow 0.15s;
    }
    #oxy-send:hover { transform:scale(1.1); box-shadow: 0 0 15px rgba(0,212,255,0.5); }
    #oxy-send:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
    .oxy-quick-btns { display:flex; flex-wrap:wrap; gap:6px; padding: 0 14px 10px; }
    .oxy-quick {
      font-size:10px; padding:5px 10px; border-radius:20px; cursor:pointer;
      border: 1px solid rgba(0,212,255,0.3); color: #00d4ff;
      background: rgba(0,212,255,0.05); transition: background 0.2s;
      font-family: 'IBM Plex Mono', monospace;
    }
    .oxy-quick:hover { background: rgba(0,212,255,0.15); }
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = styles;
  document.head.appendChild(styleEl);

  const apiNoticeHTML = GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY'
    ? `<div id="oxy-api-notice">⚠️ No API key. Get one free at <a href="https://aistudio.google.com/app/apikey" target="_blank">aistudio.google.com</a>, then set <code>window.GEMINI_API_KEY</code> in index.html.</div>`
    : '';

  document.body.insertAdjacentHTML('beforeend', `
    <div id="oxy-bubble" title="OxyBot — hold &amp; drag to move">🤖</div>
    <div id="oxy-window" class="hidden">
      <div id="oxy-header">
        <div id="oxy-header-left">
          <div id="oxy-avatar">🌿</div>
          <div>
            <div id="oxy-title">OxyBot</div>
            <div id="oxy-subtitle">Air Quality Assistant</div>
          </div>
        </div>
        <span id="oxy-close">✕</span>
      </div>
      <div id="oxy-messages"></div>
      ${apiNoticeHTML}
      <div class="oxy-quick-btns">
        <button class="oxy-quick" data-q="What does AQI mean?">What is AQI?</button>
        <button class="oxy-quick" data-q="Is it safe to go outside today?">Safe outside?</button>
        <button class="oxy-quick" data-q="Find me a safe park nearby">Safe park</button>
        <button class="oxy-quick" data-q="What mask should I wear for bad air?">Mask tips</button>
      </div>
      <div id="oxy-input-area">
        <textarea id="oxy-input" rows="1" placeholder="Ask about air quality, health, alerts…"></textarea>
        <button id="oxy-send">➤</button>
      </div>
    </div>
  `);

  // ── Refs ──────────────────────────────────────────────────────────────────────
  const bubble = document.getElementById('oxy-bubble');
  const win    = document.getElementById('oxy-window');
  const msgs   = document.getElementById('oxy-messages');
  const input  = document.getElementById('oxy-input');
  const send   = document.getElementById('oxy-send');

  // Initialize window position (bottom-right default)
  win.style.bottom = '155px';
  win.style.right  = '20px';

  // ── DRAGGABLE LOGIC ──────────────────────────────────────────────────────────
  let isDragging = false;
  let hasMoved   = false;
  let startPX = 0, startPY = 0;  // pointer start
  let startBX = 0, startBY = 0;  // bubble start (from left/top)

  function getClientXY(e) {
    if (e.touches && e.touches.length > 0) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    return { x: e.clientX, y: e.clientY };
  }

  function getBubbleRect() {
    return bubble.getBoundingClientRect();
  }

  function setBubblePosition(x, y) {
    const vw = window.innerWidth, vh = window.innerHeight;
    const bw = bubble.offsetWidth, bh = bubble.offsetHeight;
    x = Math.max(8, Math.min(vw - bw - 8, x));
    y = Math.max(8, Math.min(vh - bh - 8, y));
    bubble.style.left   = x + 'px';
    bubble.style.top    = y + 'px';
    bubble.style.right  = 'auto';
    bubble.style.bottom = 'auto';
  }

  function positionWindowNearBubble() {
    const br = getBubbleRect();
    const ww = 340, wh = 520;
    const vw = window.innerWidth, vh = window.innerHeight;
    let wx = br.left + br.width / 2 - ww / 2;
    let wy = br.top - wh - 12;
    if (wy < 8) wy = br.bottom + 12;
    wx = Math.max(8, Math.min(vw - ww - 8, wx));
    win.style.left   = wx + 'px';
    win.style.top    = wy + 'px';
    win.style.right  = 'auto';
    win.style.bottom = 'auto';
  }

  bubble.addEventListener('mousedown', startDrag);
  bubble.addEventListener('touchstart', startDrag, { passive: false });

  function startDrag(e) {
    const { x, y } = getClientXY(e);
    isDragging = true;
    hasMoved   = false;
    startPX = x; startPY = y;
    const br = getBubbleRect();
    startBX = br.left; startBY = br.top;
    bubble.classList.add('dragging');
    e.preventDefault();
  }

  document.addEventListener('mousemove', onDragMove);
  document.addEventListener('touchmove', onDragMove, { passive: false });

  function onDragMove(e) {
    if (!isDragging) return;
    const { x, y } = getClientXY(e);
    const dx = x - startPX, dy = y - startPY;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) hasMoved = true;
    if (hasMoved) {
      setBubblePosition(startBX + dx, startBY + dy);
      if (isOpen) positionWindowNearBubble();
    }
    e.preventDefault();
  }

  document.addEventListener('mouseup', endDrag);
  document.addEventListener('touchend', endDrag);

  function endDrag() {
    if (!isDragging) return;
    isDragging = false;
    bubble.classList.remove('dragging');
    if (!hasMoved) {
      toggleChat();
    }
  }

  // ── Toggle ────────────────────────────────────────────────────────────────────
  function toggleChat() {
    isOpen = !isOpen;
    win.classList.toggle('hidden', !isOpen);
    if (isOpen) {
      positionWindowNearBubble();
      if (msgs.children.length === 0) {
        addMsg('bot', "👋 Hey! I'm OxyBot, your OxyTrace AI assistant.\n\nAsk me about AQI levels, health tips, safe parks, or pollution alerts!");
      }
    }
  }

  document.getElementById('oxy-close').addEventListener('click', (e) => {
    e.stopPropagation();
    isOpen = false;
    win.classList.add('hidden');
  });

  document.querySelectorAll('.oxy-quick').forEach(btn => {
    btn.addEventListener('click', () => {
      input.value = btn.dataset.q;
      sendMessage();
    });
  });

  // ── Message helpers ───────────────────────────────────────────────────────────
  function addMsg(type, text) {
    const div = document.createElement('div');
    div.className = `oxy-msg ${type}`;
    div.textContent = text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1');
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div;
  }

  function showTyping() {
    const div = document.createElement('div');
    div.className = 'oxy-msg bot';
    div.id = 'oxy-typing';
    div.innerHTML = '<div class="oxy-typing"><span></span><span></span><span></span></div>';
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function removeTyping() {
    const t = document.getElementById('oxy-typing');
    if (t) t.remove();
  }

  // ── Send ──────────────────────────────────────────────────────────────────────
  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    if (GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY') {
      addMsg('error', '⚠️ API key not set. Please configure your Gemini API key. See the notice above.');
      return;
    }

    input.value = '';
    input.style.height = 'auto';
    send.disabled = true;

    addMsg('user', text);
    showTyping();
    history.push({ role: 'user', parts: [{ text }] });

    try {
      const res = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: history })
      });

      const data = await res.json();
      removeTyping();

      if (!res.ok) {
        const errMsg = data?.error?.message || `API error ${res.status}`;
        addMsg('error', `⚠️ ${errMsg}`);
        history.pop();
      } else {
        const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (reply) {
          history.push({ role: 'model', parts: [{ text: reply }] });
          addMsg('bot', reply);
        } else {
          addMsg('error', '⚠️ Empty response. Please try again.');
          history.pop();
        }
      }
    } catch (err) {
      removeTyping();
      addMsg('error', `⚠️ Network error: ${err.message}`);
      history.pop();
    }

    send.disabled = false;
    input.focus();
  }

  send.addEventListener('click', sendMessage);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 80) + 'px';
  });
})();
