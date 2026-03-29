const els = {
  refreshButton: document.getElementById('refresh-button'),
  assignButton: document.getElementById('assign-button'),
  resetButton: document.getElementById('reset-button'),
  facilitatorStatus: document.getElementById('facilitator-status'),
  sessionIdPill: document.getElementById('session-id-pill'),
  participantCount: document.getElementById('participant-count'),
  signalCount: document.getElementById('signal-count'),
  stewardCount: document.getElementById('steward-count'),
  updatedPill: document.getElementById('updated-pill'),
  tableWrap: document.getElementById('facilitator-table-wrap')
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
  els.facilitatorStatus.textContent = message;
}

function renderTable(participants = [], sessionId = '') {
  els.sessionIdPill.textContent = `Live ${sessionId}`;
  els.updatedPill.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  els.participantCount.textContent = String(participants.length);
  els.signalCount.textContent = String(participants.filter((item) => item.finalGroup === 'signal').length);
  els.stewardCount.textContent = String(participants.filter((item) => item.finalGroup === 'stewardship').length);

  if (!participants.length) {
    els.tableWrap.innerHTML = '<div class="empty-state">No submissions yet.</div>';
    return;
  }

  els.tableWrap.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Score</th>
          <th>Temporary lean</th>
          <th>Final team</th>
          <th>Summary</th>
          <th>Public excerpt</th>
          <th>Strength</th>
        </tr>
      </thead>
      <tbody>
        ${participants.map((item) => `
          <tr>
            <td>${escapeHtml(item.name)}</td>
            <td>${item.stanceScore}</td>
            <td>${escapeHtml(item.temporaryLeanLabel)}</td>
            <td>${escapeHtml(item.finalGroupLabel || 'Not assigned')}</td>
            <td>${escapeHtml(item.shortSummary)}</td>
            <td>${escapeHtml(item.publicExcerpt)}</td>
            <td>${escapeHtml(item.compliment)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

async function refreshState() {
  const res = await fetch('/api/state');
  const data = await res.json();
  renderTable(data.participants || [], data.sessionId || 'live');
}

async function buildTeams() {
  setStatus('Building balanced teams...');
  const res = await fetch('/api/assign', { method: 'POST' });
  const data = await res.json();
  renderTable(data.participants || [], data.sessionId || 'live');
  setStatus('Balanced teams are ready.');
}

async function resetSession() {
  const confirmed = window.confirm('Reset the session and remove all saved cards?');
  if (!confirmed) return;
  setStatus('Clearing session...');
  await fetch('/api/reset', { method: 'POST' });
  await refreshState();
  setStatus('Session cleared.');
}

els.refreshButton.addEventListener('click', refreshState);
els.assignButton.addEventListener('click', buildTeams);
els.resetButton.addEventListener('click', resetSession);

(async function init() {
  await refreshState();
  setStatus('Live dashboard ready.');
  setInterval(refreshState, 2500);
})();
