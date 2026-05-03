// ─── STATE ──────────────────────────────────────────────────
const state = {
  questions: [],
  stickers: [],
  selectedBg: 'pink',
  selectedFont: 'cursive',
  currentAnketaId: null,
  linkMode: 'fill', // 'fill' | 'responses'
};

// ─── INIT ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initHearts();
  initCursor();
  initStickerPicker();
  initBgPicker();
  initFontPicker();
  renderMyAnketas();
  handleRoute();
});

// ─── MY ANKETAS (localStorage) ───────────────────────────────
function saveMyAnketa(id, title, ownerName) {
  const list = getMyAnketas();
  list.unshift({ id, title, ownerName, created: Date.now() });
  // Keep last 20
  localStorage.setItem('myAnketas', JSON.stringify(list.slice(0, 20)));
}

function getMyAnketas() {
  try { return JSON.parse(localStorage.getItem('myAnketas') || '[]'); } catch { return []; }
}

function renderMyAnketas() {
  const list = getMyAnketas();
  const section = document.getElementById('myAnketasSection');
  const container = document.getElementById('myAnketasList');
  if (!section || !container) return;
  if (list.length === 0) { section.style.display = 'none'; return; }
  section.style.display = 'block';
  container.innerHTML = list.map(a => `
    <div class="my-anketa-item">
      <div class="my-anketa-name">
        ${escHtml(a.title || 'Моя анкета')}
        <small>${escHtml(a.ownerName)} · ${new Date(a.created).toLocaleDateString('ru-RU')}</small>
      </div>
      <div class="my-anketa-btns">
        <button class="btn-xs" onclick="copyAnketaLink('${escHtml(a.id)}')">📋 Ссылка</button>
        <button class="btn-xs primary" onclick="loadResponsesPage('${escHtml(a.id)}')">💌 Ответы</button>
      </div>
    </div>
  `).join('');
}

function copyAnketaLink(id) {
  const link = `${window.location.origin}/anketa/${id}`;
  navigator.clipboard.writeText(link).then(() => showToast('✅ Ссылка скопирована!'));
}

// ─── LINK MODE ───────────────────────────────────────────────
function setLinkMode(mode) {
  state.linkMode = mode;
  document.getElementById('modeFill').classList.toggle('active', mode === 'fill');
  document.getElementById('modeResponses').classList.toggle('active', mode === 'responses');
  const input = document.getElementById('linkInput');
  if (mode === 'fill') input.placeholder = 'вставь ссылку анкеты подруги...';
  else input.placeholder = 'вставь ссылку своей анкеты...';
}

// ─── ROUTING ─────────────────────────────────────────────────
function handleRoute() {
  const path = window.location.pathname;
  const match = path.match(/^\/anketa\/([a-f0-9-]{36})$/i);
  if (match) {
    loadFillPage(match[1]);
  } else {
    showPage('page-home');
  }
}

function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
  if (id === 'page-create') {
    // Reset wizard state for a fresh anketa
    state.questions = [];
    state.stickers = [];
    state.selectedBg = 'pink';
    state.selectedFont = 'cursive';
    document.getElementById('ownerName').value = '';
    document.getElementById('anketaTitle').value = '';
    renderQuestions();
    renderSelectedStickers();
    // Reset bg/font pickers
    document.querySelectorAll('.bg-option').forEach(o => o.classList.toggle('selected', o.dataset.bg === 'pink'));
    document.querySelectorAll('.font-option').forEach(o => o.classList.toggle('selected', o.dataset.font === 'cursive'));
    wizardGo(1);
  }
}

// ─── WIZARD ──────────────────────────────────────────────────
let currentStep = 1;

function wizardGo(step) {
  currentStep = step;
  // Hide all steps, show current
  document.querySelectorAll('.wizard-step').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(`wizard-step-${step}`);
  if (el) el.classList.add('active');
  // Update stepper dots
  for (let i = 1; i <= 4; i++) {
    const dot = document.getElementById(`step-dot-${i}`);
    if (!dot) continue;
    dot.classList.remove('active', 'done');
    if (i < step) dot.classList.add('done');
    else if (i === step) dot.classList.add('active');
  }
  // Update step lines
  document.querySelectorAll('.step-line').forEach((line, idx) => {
    line.classList.toggle('done', idx + 1 < step);
  });
  // Update back button
  const backBtn = document.getElementById('wizardBackBtn');
  if (backBtn) backBtn.onclick = step === 1 ? () => showPageDirect('page-home') : () => wizardGo(step - 1);
  // If step 4: refresh preview
  if (step === 4) updatePreview();
  window.scrollTo(0, 0);
}

function showPageDirect(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
  if (id === 'page-home') renderMyAnketas();
}

function wizardBack() {
  if (currentStep === 1) showPageDirect('page-home');
  else wizardGo(currentStep - 1);
}

function wizardNext(fromStep) {
  if (fromStep === 1) {
    const name = document.getElementById('ownerName').value.trim();
    if (!name) { shakeInput('ownerName'); return; }
  }
  if (fromStep === 3) {
    if (state.questions.length === 0) {
      const err = document.getElementById('questionsError');
      if (err) { err.style.display = 'block'; setTimeout(() => { err.style.display = 'none'; }, 3000); }
      return;
    }
  }
  wizardGo(fromStep + 1);
}

function openByLink() {
  const val = document.getElementById('linkInput').value.trim();
  const match = val.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
  if (match) {
    const id = match[1];
    if (state.linkMode === 'responses') {
      loadResponsesPage(id);
    } else {
      window.history.pushState({}, '', `/anketa/${id}`);
      loadFillPage(id);
    }
  } else {
    shakeInput('linkInput');
  }
}

// ─── FLOATING HEARTS ─────────────────────────────────────────
function initHearts() {
  const container = document.getElementById('heartsBg');
  const emojis = ['💕','💗','💖','🌸','✨','⭐','🌷','💫'];
  for (let i = 0; i < 20; i++) {
    const el = document.createElement('div');
    el.className = 'heart-float';
    el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    el.style.left = Math.random() * 100 + 'vw';
    el.style.animationDuration = (8 + Math.random() * 12) + 's';
    el.style.animationDelay = -(Math.random() * 20) + 's';
    el.style.fontSize = (0.8 + Math.random() * 1.2) + 'rem';
    container.appendChild(el);
  }
}

// ─── SPARKLE CURSOR ───────────────────────────────────────────
function initCursor() {
  const sparkles = ['✨','💫','⭐','🌸','💕','🌟','🔮'];
  document.addEventListener('mousemove', (e) => {
    if (Math.random() > 0.85) {
      const el = document.createElement('div');
      el.className = 'sparkle';
      el.textContent = sparkles[Math.floor(Math.random() * sparkles.length)];
      el.style.left = e.clientX - 10 + 'px';
      el.style.top = e.clientY - 10 + 'px';
      document.getElementById('sparkle-container').appendChild(el);
      setTimeout(() => el.remove(), 800);
    }
  });
}

// ─── STICKER PICKER ───────────────────────────────────────────
function initStickerPicker() {
  const picker = document.getElementById('stickerPicker');
  const text = picker.textContent;
  picker.innerHTML = '';
  // Parse individual emojis using Intl.Segmenter if available, otherwise split by whitespace
  let items;
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter('ru', { granularity: 'grapheme' });
    items = [...segmenter.segment(text)]
      .map(s => s.segment.trim())
      .filter(s => s.length > 0);
  } else {
    items = text.trim().split(/\s+/);
  }
  items.forEach(emoji => {
    const span = document.createElement('span');
    span.textContent = emoji;
    span.title = 'Добавить';
    span.onclick = () => addSticker(emoji);
    picker.appendChild(span);
  });
}

function addSticker(emoji) {
  state.stickers.push(emoji);
  renderSelectedStickers();
  updatePreview();
}

function removeSticker(idx) {
  state.stickers.splice(idx, 1);
  renderSelectedStickers();
  updatePreview();
}

function renderSelectedStickers() {
  const el = document.getElementById('selectedStickers');
  el.innerHTML = '';
  state.stickers.forEach((s, i) => {
    const span = document.createElement('span');
    span.className = 'selected-sticker';
    span.textContent = s;
    span.title = 'Удалить';
    span.onclick = () => removeSticker(i);
    el.appendChild(span);
  });
  if (state.stickers.length === 0) {
    el.innerHTML = '<span style="color:#e8a8c8;font-size:0.9rem;font-family:\'Dancing Script\',cursive">стикеры появятся здесь...</span>';
  }
}

// ─── BG PICKER ───────────────────────────────────────────────
function initBgPicker() {
  document.querySelectorAll('.bg-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.bg-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      state.selectedBg = opt.dataset.bg;
      updatePreview();
    });
  });
}

// ─── FONT PICKER ─────────────────────────────────────────────
function initFontPicker() {
  document.querySelectorAll('.font-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.font-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      state.selectedFont = opt.dataset.font;
      updatePreview();
    });
  });
}

// ─── QUESTIONS ───────────────────────────────────────────────
function addPreset(el) {
  const text = el.textContent.trim();
  if (!state.questions.includes(text)) {
    state.questions.push(text);
    renderQuestions();
    updatePreview();
  }
}

function addQuestion() {
  const input = document.getElementById('newQuestion');
  const text = input.value.trim();
  if (text && text.length <= 200) {
    state.questions.push(text);
    input.value = '';
    renderQuestions();
    updatePreview();
  } else if (!text) {
    shakeInput('newQuestion');
  }
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && document.activeElement.id === 'newQuestion') {
    addQuestion();
  }
});

function removeQuestion(idx) {
  state.questions.splice(idx, 1);
  renderQuestions();
  updatePreview();
}

function renderQuestions() {
  const list = document.getElementById('questionsList');
  list.innerHTML = '';
  state.questions.forEach((q, i) => {
    const div = document.createElement('div');
    div.className = 'question-item';
    div.innerHTML = `
      <span class="q-num">${i + 1}.</span>
      <span class="q-text">${escHtml(q)}</span>
      <button class="q-del" onclick="removeQuestion(${i})" title="Удалить">✕</button>
    `;
    list.appendChild(div);
  });
}

// ─── PREVIEW ─────────────────────────────────────────────────
function updatePreview() {
  const preview = document.getElementById('anketaPreview');
  const ownerName = document.getElementById('ownerName').value.trim() || 'Твоё имя';
  const title = document.getElementById('anketaTitle').value.trim() || 'Моя анкета';
  preview.className = `anketa-preview bg-${state.selectedBg} font-${state.selectedFont}`;
  preview.innerHTML = `
    <div style="text-align:center;margin-bottom:12px">
      <div style="font-size:1.5rem;letter-spacing:4px">${state.stickers.join(' ') || '🌸'}</div>
      <div style="font-family:'Pacifico',cursive;font-size:1.3rem;color:#c0197f;margin:6px 0">${escHtml(title)}</div>
      <div style="font-size:0.95rem;color:#a03060">от ${escHtml(ownerName)}</div>
    </div>
    ${state.questions.slice(0, 4).map((q, i) => `
      <div style="margin-bottom:8px;padding:6px 10px;background:rgba(255,255,255,0.6);border-radius:10px;border:1px solid rgba(249,168,212,0.5)">
        <span style="color:#c0197f;font-size:0.85rem">${i + 1}. ${escHtml(q)}</span>
        <div style="border-bottom:1px solid #f9a8d4;margin-top:4px"></div>
      </div>
    `).join('')}
    ${state.questions.length > 4 ? `<div style="text-align:center;color:#e8a8c8;font-size:0.9rem">и ещё ${state.questions.length - 4} вопроса...</div>` : ''}
    ${state.questions.length === 0 ? '<div style="text-align:center;color:#e8a8c8">добавь вопросы выше ☝️</div>' : ''}
  `;
}

// Auto-update preview on input
document.addEventListener('input', (e) => {
  if (['ownerName', 'anketaTitle'].includes(e.target.id)) updatePreview();
});

// ─── CREATE ANKETA ────────────────────────────────────────────
async function createAnketa() {
  const ownerName = document.getElementById('ownerName').value.trim();
  const title = document.getElementById('anketaTitle').value.trim();

  const btn = document.getElementById('createBtn');
  btn.textContent = '⏳ Создаём...';
  btn.disabled = true;

  try {
    const res = await fetch('/api/anketa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        owner_name: ownerName || 'Аноним',
        title: title || 'Моя анкета',
        questions: state.questions,
        stickers: state.stickers,
        background: state.selectedBg,
        font: state.selectedFont,
      })
    });
    const data = await res.json();
    if (data.id) {
      state.currentAnketaId = data.id;
      saveMyAnketa(data.id, title || 'Моя анкета', ownerName || 'Аноним');
      const link = `${window.location.origin}/anketa/${data.id}`;
      document.getElementById('shareTitle').textContent = title || 'Моя анкета';
      document.getElementById('shareLink').value = link;
      showPageDirect('page-share');
      window.history.pushState({}, '', '/');
    } else {
      showToast('Ошибка: ' + (data.error || 'попробуй ещё раз'));
    }
  } catch (e) {
    showToast('Ошибка соединения 😢');
  }

  btn.textContent = '🎉 Создать анкету!';
  btn.disabled = false;
}


// ─── COPY LINK ────────────────────────────────────────────────
function copyLink() {
  const input = document.getElementById('shareLink');
  input.select();
  navigator.clipboard.writeText(input.value).then(() => {
    const msg = document.getElementById('copyMsg');
    msg.style.display = 'block';
    setTimeout(() => { msg.style.display = 'none'; }, 2500);
  });
}

function viewResponses() {
  if (state.currentAnketaId) loadResponsesPage(state.currentAnketaId);
}

function goBackFromResponses() {
  if (state.currentAnketaId) {
    showPageDirect('page-share');
  } else {
    showPageDirect('page-home');
  }
}

// ─── FILL PAGE ────────────────────────────────────────────────
async function loadFillPage(id) {
  showPageDirect('page-fill');
  const container = document.getElementById('fillContainer');
  container.innerHTML = '<div style="text-align:center;padding:60px;font-size:2rem">🌸 загружаем...</div>';

  try {
    const res = await fetch(`/api/anketa/${id}`);
    if (!res.ok) {
      container.innerHTML = '<div style="text-align:center;padding:60px"><div style="font-size:3rem">😿</div><h2 style="color:#c0197f;font-family:\'Pacifico\',cursive;margin-top:12px">Анкета не найдена</h2><p style="color:#c06080">Проверь ссылку!</p></div>';
      return;
    }
    const anketa = await res.json();

    // Apply bg to body
    document.body.className = '';
    document.body.classList.add(`bg-${anketa.background || 'pink'}`);

    const fontClass = `font-${anketa.font || 'cursive'}`;
    container.className = fontClass;

    const stickers = (anketa.stickers || []).join(' ');
    const questions = anketa.questions || [];

    container.innerHTML = `
      <div class="fill-anketa">
        <div class="fill-header">
          ${stickers ? `<div class="stickers-display">${stickers}</div>` : ''}
          <h1>${escHtml(anketa.title || 'Анкета')}</h1>
          <div class="from">от ${escHtml(anketa.owner_name)} 💕</div>
        </div>
        <div class="fill-form-card">
          <div class="fill-name-row">
            <label>✏️ Твоё имя</label>
            <input type="text" id="friendName" placeholder="Как тебя зовут?" class="cute-input" maxlength="80">
          </div>
          ${questions.map((q, i) => `
            <div class="fill-q">
              <label><span class="q-num-badge">${i + 1}</span>${escHtml(q)}</label>
              <textarea id="ans_${i}" placeholder="твой ответ..." rows="2"></textarea>
            </div>
          `).join('')}
          <div class="fill-submit">
            <button class="btn-main" onclick="submitResponse('${escHtml(id)}', ${questions.length})">💌 Отправить подруге!</button>
          </div>
        </div>
      </div>
    `;
  } catch (e) {
    container.innerHTML = '<div style="text-align:center;padding:60px;color:#c0197f">Ошибка загрузки 😢</div>';
  }
}

async function submitResponse(anketaId, questionsCount) {
  const friendName = document.getElementById('friendName').value.trim();
  if (!friendName) { shakeInput('friendName'); return; }

  const answers = {};
  for (let i = 0; i < questionsCount; i++) {
    const el = document.getElementById(`ans_${i}`);
    if (el) answers[i] = el.value.trim();
  }

  const btn = document.querySelector('#fillContainer .btn-main');
  btn.textContent = '⏳ Отправляем...';
  btn.disabled = true;

  try {
    const res = await fetch(`/api/anketa/${anketaId}/response`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ friend_name: friendName, answers })
    });
    const data = await res.json();
    if (data.ok) {
      document.getElementById('fillContainer').innerHTML = `
        <div class="fill-success">
          <div class="big-emoji">🎉</div>
          <h2>Отправлено!</h2>
          <p>Твои ответы улетели к подруге 💕</p>
          <div style="font-size:2rem;margin-top:16px">🌸 💕 ✨ 🌸</div>
          <button class="btn-secondary" style="margin-top:24px" onclick="showPageDirect('page-home');window.history.pushState({},'','/')">🏠 На главную</button>
        </div>
      `;
    } else {
      showToast(data.error || 'Ошибка, попробуй ещё раз');
      btn.textContent = '💌 Отправить подруге!';
      btn.disabled = false;
    }
  } catch (e) {
    showToast('Ошибка соединения 😢');
    btn.textContent = '💌 Отправить подруге!';
    btn.disabled = false;
  }
}

// ─── RESPONSES PAGE ───────────────────────────────────────────
async function loadResponsesPage(anketaId) {
  showPageDirect('page-responses');
  const container = document.getElementById('responsesContainer');
  container.innerHTML = '<div style="text-align:center;padding:40px;font-size:2rem">🌸 загружаем...</div>';

  try {
    const [anketaRes, responsesRes] = await Promise.all([
      fetch(`/api/anketa/${anketaId}`),
      fetch(`/api/anketa/${anketaId}/responses`)
    ]);
    const anketa = await anketaRes.json();
    const responses = await responsesRes.json();
    const questions = anketa.questions || [];

    container.innerHTML = `<div class="responses-container">
      ${responses.length === 0
        ? '<div class="no-responses">😿 Пока никто не заполнил анкету<br><br>Разошли ссылку подружкам! 💕</div>'
        : responses.map(r => `
          <div class="response-card">
            <div class="resp-name">💌 ${escHtml(r.friend_name)} <span class="resp-date">${new Date(r.created_at).toLocaleDateString('ru-RU')}</span></div>
            ${questions.map((q, i) => `
              <div class="resp-qa">
                <div class="resp-q">${escHtml(q)}</div>
                <div class="resp-a">${escHtml((r.answers[i] || '').trim() || '—')}</div>
              </div>
            `).join('')}
          </div>
        `).join('')}
    </div>`;
  } catch (e) {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:#c0197f">Ошибка загрузки</div>';
  }
}

// ─── UTILS ───────────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function shakeInput(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.animation = 'none';
  el.offsetHeight; // reflow
  el.style.borderColor = '#e91e8c';
  el.style.animation = 'shake 0.4s ease';
  setTimeout(() => {
    el.style.borderColor = '';
    el.style.animation = '';
  }, 600);
}

function showToast(msg) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position:fixed; bottom:24px; left:50%; transform:translateX(-50%);
    background:linear-gradient(135deg,#e91e8c,#c0197f); color:white;
    padding:12px 24px; border-radius:20px; font-family:'Dancing Script',cursive;
    font-size:1.1rem; z-index:9998; box-shadow:0 4px 16px rgba(192,25,127,0.4);
    animation: fadeInUp 0.3s ease;
  `;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Add shake keyframes dynamically
const style = document.createElement('style');
style.textContent = `
  @keyframes shake {
    0%,100% { transform: translateX(0); }
    20% { transform: translateX(-6px); }
    40% { transform: translateX(6px); }
    60% { transform: translateX(-4px); }
    80% { transform: translateX(4px); }
  }
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateX(-50%) translateY(10px); }
    to { opacity: 1; transform: translateX(-50%) translateY(0); }
  }
`;
document.head.appendChild(style);
