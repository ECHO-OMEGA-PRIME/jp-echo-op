/* ═══════════════════════════════════════════════════════════════
   ECHO CHAT SENTINEL — Aqua Pulse / JP Echo-OP Widget
   Vanilla JS • Echo Personality • Voice TTS • Engine-backed
   Powered by Echo Chat Sentinel — echo-ept.com
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var CHAT_API = 'https://echo-chat.bmcii1976.workers.dev';
  var SITE_ID = 'jp-echo-op';
  var PERSONALITY = 'echo_prime';

  var sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).slice(2);

  function getUserId() {
    var id = localStorage.getItem('jp_user_id');
    if (!id) {
      id = 'jp_' + Date.now().toString(36) + Math.random().toString(36).slice(2);
      localStorage.setItem('jp_user_id', id);
    }
    return id;
  }

  var userId = getUserId();
  var isOpen = false;
  var isLoading = false;
  var messages = [];

  var WELCOME = "Hey there! I'm Echo, your AI assistant for Aqua Pulse. I can help with water chemistry analysis, scaling prevention, corrosion monitoring, and anything about Permian Basin water intelligence. What can I help you with?";

  var QUICK_ACTIONS = [
    { label: 'Water Analysis', msg: 'How does the water chemistry analysis work?' },
    { label: 'Scaling Prevention', msg: 'Tell me about scaling detection and prevention.' },
    { label: 'Pricing', msg: "What are the pricing options?" },
    { label: 'Contact', msg: 'How do I get in touch?' }
  ];

  /* ────────── CSS ────────── */
  var css = document.createElement('style');
  css.textContent = [
    '#ecs-btn{position:fixed;bottom:24px;right:24px;z-index:9999;width:60px;height:60px;border-radius:50%;border:none;cursor:pointer;background:linear-gradient(135deg,#00d4ff,#0099cc);color:#fff;box-shadow:0 4px 20px rgba(0,212,255,0.4);transition:transform .2s,box-shadow .2s;display:flex;align-items:center;justify-content:center}',
    '#ecs-btn:hover{transform:scale(1.1);box-shadow:0 6px 28px rgba(0,212,255,0.5)}',
    '#ecs-btn svg{width:28px;height:28px}',
    '#ecs-pulse{position:fixed;bottom:24px;right:24px;z-index:9998;width:60px;height:60px;border-radius:50%;background:rgba(0,212,255,0.3);animation:ecs-ping 2s ease-out infinite}',
    '@keyframes ecs-ping{0%{transform:scale(1);opacity:.5}100%{transform:scale(1.5);opacity:0}}',
    '#ecs-panel{position:fixed;bottom:24px;right:24px;z-index:10000;width:380px;height:580px;background:#060d1a;border-radius:16px;border:1px solid rgba(0,212,255,0.15);box-shadow:0 8px 40px rgba(0,0,0,0.5);display:none;flex-direction:column;overflow:hidden;font-family:Inter,sans-serif}',
    '#ecs-panel.open{display:flex}',
    '#ecs-hdr{background:linear-gradient(135deg,#00d4ff,#0099cc);padding:16px;color:#fff;display:flex;align-items:center;justify-content:space-between}',
    '#ecs-hdr-info{display:flex;align-items:center;gap:12px}',
    '#ecs-avatar{width:44px;height:44px;background:rgba(255,255,255,0.2);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700}',
    '#ecs-hdr h3{margin:0;font-size:17px;font-weight:700}',
    '#ecs-hdr p{margin:0;font-size:12px;opacity:.85}',
    '#ecs-close{background:none;border:none;color:#fff;cursor:pointer;padding:8px;border-radius:50%;transition:background .2s}',
    '#ecs-close:hover{background:rgba(255,255,255,0.2)}',
    '#ecs-msgs{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px}',
    '.ecs-msg{max-width:85%;padding:10px 14px;border-radius:14px;font-size:13px;line-height:1.5;white-space:pre-wrap;word-wrap:break-word}',
    '.ecs-msg.user{align-self:flex-end;background:#0099cc;color:#fff;border-bottom-right-radius:4px}',
    '.ecs-msg.assistant{align-self:flex-start;background:#0c1829;color:#e2edf6;border:1px solid rgba(0,212,255,0.12);border-bottom-left-radius:4px}',
    '.ecs-typing{align-self:flex-start;background:#0c1829;border:1px solid rgba(0,212,255,0.12);border-radius:14px;padding:10px 14px;display:flex;align-items:center;gap:8px;font-size:13px;color:#7a99b8}',
    '.ecs-typing-dot{width:6px;height:6px;border-radius:50%;background:#00d4ff;animation:ecs-bounce .6s ease-in-out infinite}',
    '.ecs-typing-dot:nth-child(2){animation-delay:.1s}',
    '.ecs-typing-dot:nth-child(3){animation-delay:.2s}',
    '@keyframes ecs-bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}',
    '#ecs-quick{padding:8px 16px 4px;border-top:1px solid rgba(0,212,255,0.08);background:#060d1a;display:flex;flex-wrap:wrap;gap:6px}',
    '.ecs-qbtn{padding:6px 12px;font-size:11px;border-radius:20px;border:1px solid rgba(0,212,255,0.2);background:rgba(0,212,255,0.08);color:#5be5ff;cursor:pointer;transition:all .2s;font-family:Inter,sans-serif}',
    '.ecs-qbtn:hover{background:rgba(0,212,255,0.18);border-color:rgba(0,212,255,0.4)}',
    '#ecs-input-wrap{padding:12px 16px;border-top:1px solid rgba(0,212,255,0.08);background:#060d1a;display:flex;align-items:center;gap:8px}',
    '#ecs-input{flex:1;padding:10px 16px;border-radius:24px;border:1px solid rgba(0,212,255,0.15);background:#0c1829;color:#e2edf6;font-size:13px;outline:none;font-family:Inter,sans-serif}',
    '#ecs-input:focus{border-color:rgba(0,212,255,0.4)}',
    '#ecs-input::placeholder{color:#4a6580}',
    '#ecs-send{width:42px;height:42px;border-radius:50%;border:none;cursor:pointer;background:linear-gradient(135deg,#00d4ff,#0099cc);color:#fff;display:flex;align-items:center;justify-content:center;transition:transform .2s}',
    '#ecs-send:hover{transform:scale(1.05)}',
    '#ecs-send:disabled{opacity:.5;cursor:default;transform:none}',
    '#ecs-send svg{width:18px;height:18px}',
    '#ecs-footer{text-align:center;padding:4px;font-size:10px;color:#4a6580;background:#060d1a}',
    '#ecs-footer a{color:#00d4ff;text-decoration:none}',
    '#ecs-footer a:hover{color:#5be5ff}',
    '@media(max-width:420px){#ecs-panel{width:calc(100vw - 16px);right:8px;bottom:8px;height:calc(100vh - 80px)}}'
  ].join('\n');
  document.head.appendChild(css);

  /* ────────── DOM ────────── */
  var SVG_CHAT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  var SVG_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  var SVG_SEND = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';

  // Float button
  var btn = document.createElement('button');
  btn.id = 'ecs-btn';
  btn.innerHTML = SVG_CHAT;
  btn.setAttribute('aria-label', 'Chat with Echo');

  // Pulse
  var pulse = document.createElement('div');
  pulse.id = 'ecs-pulse';

  // Panel
  var panel = document.createElement('div');
  panel.id = 'ecs-panel';
  panel.innerHTML = [
    '<div id="ecs-hdr">',
    '  <div id="ecs-hdr-info">',
    '    <div id="ecs-avatar">E</div>',
    '    <div><h3>Echo</h3><p>AI Intelligence Assistant</p></div>',
    '  </div>',
    '  <button id="ecs-close" aria-label="Close">' + SVG_X + '</button>',
    '</div>',
    '<div id="ecs-msgs"></div>',
    '<div id="ecs-quick"></div>',
    '<div id="ecs-input-wrap">',
    '  <input id="ecs-input" type="text" placeholder="Ask Echo anything..." autocomplete="off" />',
    '  <button id="ecs-send" disabled>' + SVG_SEND + '</button>',
    '</div>',
    '<div id="ecs-footer">Powered by <a href="https://echo-ept.com" target="_blank" rel="noopener">Echo Chat Sentinel</a></div>'
  ].join('\n');

  document.body.appendChild(pulse);
  document.body.appendChild(btn);
  document.body.appendChild(panel);

  var msgsEl = document.getElementById('ecs-msgs');
  var inputEl = document.getElementById('ecs-input');
  var sendBtn = document.getElementById('ecs-send');
  var closeBtn = document.getElementById('ecs-close');
  var quickEl = document.getElementById('ecs-quick');

  /* ────────── Quick Actions ────────── */
  QUICK_ACTIONS.forEach(function (a) {
    var b = document.createElement('button');
    b.className = 'ecs-qbtn';
    b.textContent = a.label;
    b.onclick = function () { inputEl.value = a.msg; inputEl.focus(); sendBtn.disabled = false; };
    quickEl.appendChild(b);
  });

  /* ────────── Helpers ────────── */
  function addMessage(role, content) {
    messages.push({ role: role, content: content });
    var div = document.createElement('div');
    div.className = 'ecs-msg ' + role;
    div.textContent = content;
    msgsEl.appendChild(div);
    msgsEl.scrollTop = msgsEl.scrollHeight;
    // Hide quick actions after first user message
    if (messages.length > 2) quickEl.style.display = 'none';
  }

  function showTyping() {
    var d = document.createElement('div');
    d.className = 'ecs-typing';
    d.id = 'ecs-typing';
    d.innerHTML = '<span class="ecs-typing-dot"></span><span class="ecs-typing-dot"></span><span class="ecs-typing-dot"></span><span style="margin-left:4px">Echo is thinking...</span>';
    msgsEl.appendChild(d);
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  function hideTyping() {
    var t = document.getElementById('ecs-typing');
    if (t) t.remove();
  }

  /* ────────── Open / Close ────────── */
  function open() {
    isOpen = true;
    btn.style.display = 'none';
    pulse.style.display = 'none';
    panel.classList.add('open');
    if (messages.length === 0) addMessage('assistant', WELCOME);
    setTimeout(function () { inputEl.focus(); }, 100);
  }

  function close() {
    isOpen = false;
    btn.style.display = 'flex';
    pulse.style.display = 'block';
    panel.classList.remove('open');
  }

  btn.onclick = open;
  closeBtn.onclick = close;

  /* ────────── Send Message ────────── */
  function sendMessage() {
    var text = inputEl.value.trim();
    if (!text || isLoading) return;

    addMessage('user', text);
    inputEl.value = '';
    sendBtn.disabled = true;
    isLoading = true;
    showTyping();

    fetch(CHAT_API + '/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        user_id: userId,
        site_id: SITE_ID,
        session_id: sessionId,
        personality: PERSONALITY,
        enable_voice: false
      })
    })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        hideTyping();
        addMessage('assistant', data.response || "I'm having a moment — try again!");
      })
      .catch(function () {
        hideTyping();
        addMessage('assistant', "Oops! Something went wrong. Give me a sec and try again.");
      })
      .finally(function () {
        isLoading = false;
        sendBtn.disabled = !inputEl.value.trim();
      });
  }

  sendBtn.onclick = sendMessage;
  inputEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
  inputEl.addEventListener('input', function () {
    sendBtn.disabled = !inputEl.value.trim() || isLoading;
  });
})();
