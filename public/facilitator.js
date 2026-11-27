import { openRoom, newRoom } from './room.js';
let room;
let requestNumber = 0;
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
  els.sessionIdPill.textContent = room.owner ? 'Your classroom' : 'Classroom wall';
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
  const turn = ++requestNumber;
  try {
    const data = await room.request('state');
    if (turn === requestNumber) {
      renderTable(data.participants, data.sessionId);
      return true;
    }
  } catch {
    if (turn === requestNumber) setStatus('The wall could not refresh. Try Refresh again.');
  }
  return false;
}

async function changeTeams(action, done) {
  if (!room?.owner || els.assignButton.disabled) return;
  if (action === 'reset' && !window.confirm('Remove all saved stance cards from this classroom?')) return;
  els.assignButton.disabled = true;
  els.resetButton.disabled = true;
  try {
    await room.request(action, {method:'POST'}, true);
    if (await refreshState()) setStatus(done);
  } catch (error) { setStatus(error.message); }
  finally {
    els.assignButton.disabled = false;
    els.resetButton.disabled = false;
  }
}

els.refreshButton.addEventListener('click', refreshState);
els.assignButton.addEventListener('click', () => changeTeams('assign','Balanced teams are ready.'));
els.resetButton.addEventListener('click', () => changeTeams('reset','This classroom’s cards have been cleared.'));

document.getElementById('new-room').addEventListener('click', async () => {
  const url = new URL('/facilitator', location.origin);
  url.searchParams.set('room', await newRoom());
  location.assign(url);
});
document.getElementById('copy-link').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(room.participant);
    setStatus('Participant invitation copied.');
  } catch {
    setStatus('Copy the address of the Participant invitation link.');
  }
});

(async function init() {
  try {
    room = await openRoom();
    document.getElementById('participant-link').href = room.participant;
    document.getElementById('copy-link').disabled = false;
    document.getElementById('room-description').textContent = room.owner
      ? 'Share the participant invitation with your class. This browser holds the facilitator controls for this room.'
      : 'This is a read-only wall. You can start your own classroom to try the facilitator controls.';
    els.assignButton.disabled = !room.owner;
    els.resetButton.disabled = !room.owner;
    if (await refreshState()) setStatus('Classroom wall ready.');
    setInterval(refreshState, 2500);
  } catch (error) { setStatus(error.message); }
})();
