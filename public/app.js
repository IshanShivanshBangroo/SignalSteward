const state = {
  name: '',
  questionIndex: 0,
  started: false,
  completed: false,
  transcript: [],
  config: null,
  result: null,
  sessionId: null,
  pollTimer: null
};

const els = {
  appTitle: document.getElementById('app-title'),
  appSubtitle: document.getElementById('app-subtitle'),
  scenarioText: document.getElementById('scenario-text'),
  participantName: document.getElementById('participant-name'),
  startButton: document.getElementById('start-button'),
  resetLocalButton: document.getElementById('reset-local-button'),
  statusBox: document.getElementById('status-box'),
  chatLog: document.getElementById('chat-log'),
  messageInput: document.getElementById('message-input'),
  sendButton: document.getElementById('send-button'),
  finishButton: document.getElementById('finish-button'),
  turnPill: document.getElementById('turn-pill'),
  sessionPill: document.getElementById('session-pill'),
  resultBox: document.getElementById('result-box'),
  resultPill: document.getElementById('result-pill'),
  wallGrid: document.getElementById('wall-grid'),
  wallCountPill: document.getElementById('wall-count-pill')
};

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function setStatus(message) {
  els.statusBox.textContent = message;
}

function renderTurnPill() {
  const done = state.transcript.filter((item) => item.role === 'user').length;
  els.turnPill.textContent = `${done} of 3`;
}

function appendMessage(role, text) {
  state.transcript.push({ role, content: text });
  const item = document.createElement('div');
  item.className = `chat-bubble ${role === 'assistant' ? 'assistant' : 'user'}`;
  item.innerHTML = `<p>${escapeHtml(text).replaceAll('\n', '<br/>')}</p>`;
  els.chatLog.appendChild(item);
  els.chatLog.scrollTop = els.chatLog.scrollHeight;
  renderTurnPill();
}

function renderResult(result) {
  if (!result) return;
  const teamLabel = result.finalGroup ? result.finalGroupLabel : 'Awaiting balanced teams';
  els.resultBox.className = 'result-box';
  els.resultBox.innerHTML = `
    <div class="score-hero ${result.temporaryLean === 'signal' ? 'signal-side' : 'steward-side'}">
      <p class="score-label">Stance number</p>
      <p class="score-value">${result.stanceScore}</p>
      <p class="score-subtitle">${escapeHtml(result.temporaryLeanLabel)}</p>
    </div>
    <div class="result-copy">
      <p><strong>Your strength</strong><br/>${escapeHtml(result.compliment)}</p>
      <p><strong>Your one line case</strong><br/>${escapeHtml(result.shortSummary)}</p>
      <p><strong>Public excerpt</strong><br/>${escapeHtml(result.publicExcerpt)}</p>
      <p><strong>Current team</strong><br/>${escapeHtml(teamLabel)}</p>
    </div>
    <div class="metric-chips">
      <span class="metric-chip">Signal ${result.situationalScore}</span>
      <span class="metric-chip">Edit ${result.coordinationScore}</span>
      <span class="metric-chip">Support ${result.socialScore}</span>
    </div>
  `;
  els.resultPill.textContent = 'Saved';
  els.resultPill.classList.remove('muted');
}

function renderWall(items = []) {
  els.wallCountPill.textContent = `${items.length} cards`;
  if (!items.length) {
    els.wallGrid.innerHTML = '<div class="empty-state wall-empty">No one has finished yet.</div>';
    return;
  }
  els.wallGrid.innerHTML = items.map((item) => `
    <article class="wall-card ${item.finalGroup === 'signal' || (!item.finalGroup && item.temporaryLean === 'signal') ? 'signal-border' : 'steward-border'}">
      <div class="wall-card-head">
        <p class="wall-name">${escapeHtml(item.name)}</p>
        <span class="wall-score">${item.stanceScore}</span>
      </div>
      <p class="wall-tag">${escapeHtml(item.finalGroupLabel || item.temporaryLeanLabel)}</p>
      <p class="wall-summary">${escapeHtml(item.shortSummary)}</p>
      <p class="wall-excerpt">“${escapeHtml(item.publicExcerpt)}”</p>
      <p class="wall-compliment">${escapeHtml(item.compliment)}</p>
    </article>
  `).join('');
}

async function loadConfig() {
  const res = await fetch('/api/config');
  const data = await res.json();
  state.config = data;
  state.sessionId = data.sessionId;
  els.appTitle.textContent = data.title;
  els.appSubtitle.textContent = data.subtitle;
  els.scenarioText.textContent = data.scenario;
  els.sessionPill.textContent = `Live ${data.sessionId}`;
}

async function pollWall() {
  try {
    const res = await fetch('/api/state');
    const data = await res.json();
    renderWall(data.participants || []);
    const mine = (data.participants || []).find((item) => item.name.toLowerCase() === state.name.toLowerCase());
    if (mine && state.result && mine.finalGroup && state.result.finalGroup !== mine.finalGroup) {
      state.result = mine;
      renderResult(mine);
      setStatus(`Balanced teams are ready. You are in ${mine.finalGroupLabel}.`);
    }
  } catch {
    // ignore background poll errors
  }
}

function setComposerEnabled(enabled) {
  els.messageInput.disabled = !enabled;
  els.sendButton.disabled = !enabled;
}

async function startChat() {
  state.name = els.participantName.value.trim();
  if (!state.name) {
    setStatus('Please enter your name first.');
    return;
  }
  if (!state.config) {
    setStatus('The activity is still loading.');
    return;
  }
  state.started = true;
  state.completed = false;
  state.transcript = [];
  state.questionIndex = 0;
  els.chatLog.innerHTML = '';
  els.resultBox.className = 'result-box empty-state';
  els.resultBox.textContent = 'Your stance card will appear here after the three chat turns.';
  els.resultPill.textContent = 'Waiting';
  els.resultPill.classList.add('muted');
  appendMessage('assistant', `Hi ${state.name}. I am your digital guide. We will move through three lenses: signal, edit, and support. ${state.config.questions[0].prompt}`);
  setComposerEnabled(true);
  els.finishButton.disabled = true;
  setStatus('Answer the first prompt and send your response.');
}

async function sendMessage() {
  const message = els.messageInput.value.trim();
  if (!message) return;
  appendMessage('user', message);
  els.messageInput.value = '';
  setComposerEnabled(false);
  setStatus('Thinking about your reply...');

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: state.name,
        questionIndex: state.questionIndex,
        latestUserMessage: message,
        transcript: state.transcript,
        sessionId: state.sessionId
      })
    });
    const data = await res.json();
    appendMessage('assistant', data.reply);
    state.questionIndex = data.nextQuestionIndex;
    if (data.done) {
      els.finishButton.disabled = false;
      setStatus('You are done with the three chat turns. Press Finish and get score.');
    } else {
      setComposerEnabled(true);
      setStatus(`Nice. Now answer turn ${state.questionIndex + 1}.`);
    }
  } catch {
    setStatus('The bot did not respond. Please try again.');
    setComposerEnabled(true);
  }
}

async function finishActivity() {
  if (state.completed) return;
  setStatus('Evaluating your activity card...');
  els.finishButton.disabled = true;
  setComposerEnabled(false);
  try {
    const res = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: state.sessionId,
        name: state.name,
        transcript: state.transcript
      })
    });
    const data = await res.json();
    state.result = data.participant;
    state.completed = true;
    renderResult(data.participant);
    setStatus('Saved. Watch the live wall while the facilitator builds balanced teams.');
    await pollWall();
  } catch {
    setStatus('Your result could not be saved. Please try Finish again.');
    els.finishButton.disabled = false;
  }
}

function clearLocal() {
  state.name = '';
  state.questionIndex = 0;
  state.started = false;
  state.completed = false;
  state.transcript = [];
  state.result = null;
  els.participantName.value = '';
  els.chatLog.innerHTML = '';
  els.messageInput.value = '';
  els.resultBox.className = 'result-box empty-state';
  els.resultBox.textContent = 'Your stance card will appear here after the three chat turns.';
  els.finishButton.disabled = true;
  setComposerEnabled(false);
  setStatus('Enter your name and press Start chat.');
  renderTurnPill();
}

els.startButton.addEventListener('click', startChat);
els.sendButton.addEventListener('click', sendMessage);
els.finishButton.addEventListener('click', finishActivity);
els.resetLocalButton.addEventListener('click', clearLocal);
els.messageInput.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && !els.sendButton.disabled) {
    sendMessage();
  }
});

(async function init() {
  await loadConfig();
  clearLocal();
  state.pollTimer = setInterval(pollWall, 2500);
  await pollWall();
})();
