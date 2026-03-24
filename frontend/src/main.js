import { fetchScheduleStatus, fetchScheduleSigners, ScheduleStatusPoller, } from '@browser';
// ── Config ────────────────────────────────────────────────────────────────────
// In production (Vercel) set VITE_API_BASE to point to your own server.
// Read-only features (status, signers, watch, viz) work without it.
const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3001';
let currentTab = 'status';
let currentScheduleId = '';
let currentNetwork = 'testnet';
let activePoller = null;
let createFormVisible = false;
let createMode = 'single';
// ── Elements ──────────────────────────────────────────────────────────────────
const networkSelect = document.getElementById('network-select');
const scheduleInput = document.getElementById('schedule-input');
const searchBtn = document.getElementById('search-btn');
const createBtn = document.getElementById('create-btn');
const registryBtn = document.getElementById('registry-btn');
const tabsEl = document.getElementById('tabs');
const panelEl = document.getElementById('panel');
const createFormEl = document.getElementById('create-form');
// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(iso) {
    if (!iso)
        return '—';
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
function timeNow() {
    return new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
function badgeClass(state) {
    if (state === 'EXECUTED')
        return 'badge-executed';
    if (state === 'DELETED')
        return 'badge-deleted';
    return 'badge-pending';
}
function showLoading(msg = 'Fetching…') {
    panelEl.innerHTML = `<div class="loading"><div class="spinner"></div>${msg}</div>`;
}
function showError(msg) {
    panelEl.innerHTML = `<div class="error-box">${msg}</div>`;
}
// ── Backend API ───────────────────────────────────────────────────────────────
async function apiPost(path, body) {
    const res = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok)
        throw new Error(data.error ?? `Server error ${res.status}`);
    return data;
}
async function apiGet(path) {
    const res = await fetch(`${API_BASE}${path}`);
    const data = await res.json();
    if (!res.ok)
        throw new Error(data.error ?? `Server error ${res.status}`);
    return data;
}
// ── Create form ───────────────────────────────────────────────────────────────
function toggleCreateForm() {
    createFormVisible = !createFormVisible;
    createFormEl.style.display = createFormVisible ? 'block' : 'none';
    createBtn.textContent = createFormVisible ? '✕ Cancel' : '+ Create';
    createBtn.classList.toggle('cancel', createFormVisible);
    if (createFormVisible)
        renderCreateForm();
}
function renderCreateForm() {
    createFormEl.innerHTML = `
    <div class="create-form-inner">
      <h3 class="form-title">Create Scheduled Transfer</h3>
      <p class="form-note">⚠️ Local dev only — credentials are sent to your local server at port 3001.</p>

      <div class="mode-toggle">
        <button class="mode-btn ${createMode === 'single' ? 'active' : ''}" data-mode="single">Single Transfer</button>
        <button class="mode-btn ${createMode === 'recurring' ? 'active' : ''}" data-mode="recurring">Recurring</button>
      </div>

      <div class="form-section-label">Your Credentials (Payer)</div>
      <div class="form-row">
        <div class="form-field">
          <label>Account ID</label>
          <input id="cf-account" type="text" placeholder="0.0.12345" spellcheck="false" />
        </div>
        <div class="form-field">
          <label>Private Key</label>
          <input id="cf-key" type="password" placeholder="302e020100..." spellcheck="false" />
        </div>
      </div>

      <div class="form-section-label">Transfer Details</div>
      <div class="form-row">
        <div class="form-field">
          <label>Recipient Account ID</label>
          <input id="cf-to" type="text" placeholder="0.0.67890" spellcheck="false" />
        </div>
        <div class="form-field">
          <label>Amount (tinybars)</label>
          <input id="cf-amount" type="text" placeholder="100000000" spellcheck="false" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-field">
          <label>Memo (optional)</label>
          <input id="cf-memo" type="text" placeholder="Payment for..." maxlength="100" />
        </div>
        <div class="form-field">
          <label>Expiry (seconds)</label>
          <input id="cf-expiry" type="number" placeholder="2592000" value="2592000" min="1" />
        </div>
      </div>

      ${createMode === 'recurring' ? `
      <div class="form-section-label">Recurring Options</div>
      <div class="form-row">
        <div class="form-field">
          <label>Number of Payments</label>
          <input id="cf-count" type="number" placeholder="12" value="3" min="1" max="50" />
        </div>
        <div class="form-field">
          <label>Interval Between Payments (seconds)</label>
          <input id="cf-interval" type="number" placeholder="2592000" value="2592000" min="1" />
        </div>
      </div>` : ''}

      <div class="form-actions">
        <button id="cf-submit" class="btn-primary">
          ${createMode === 'recurring' ? 'Create Recurring Schedules →' : 'Create Schedule →'}
        </button>
        <div id="cf-status" class="form-status"></div>
      </div>
    </div>
  `;
    document.querySelectorAll('.mode-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            createMode = btn.dataset['mode'];
            renderCreateForm();
        });
    });
    document.getElementById('cf-submit').addEventListener('click', () => {
        if (createMode === 'recurring')
            void handleRecurring();
        else
            void handleCreate();
    });
}
async function handleCreate() {
    const submitBtn = document.getElementById('cf-submit');
    const statusEl = document.getElementById('cf-status');
    const accountId = document.getElementById('cf-account').value.trim();
    const privateKey = document.getElementById('cf-key').value.trim();
    const to = document.getElementById('cf-to').value.trim();
    const amount = document.getElementById('cf-amount').value.trim();
    const memo = document.getElementById('cf-memo').value.trim();
    const expiry = parseInt(document.getElementById('cf-expiry').value, 10);
    if (!accountId || !privateKey || !to || !amount) {
        statusEl.innerHTML = '<span class="form-error">All fields except memo are required.</span>';
        return;
    }
    submitBtn.disabled = true;
    statusEl.innerHTML = '<span class="form-info"><span class="spinner-inline"></span> Submitting to Hedera…</span>';
    try {
        const result = await apiPost('/api/schedules', {
            accountId, privateKey, network: currentNetwork,
            to, amount, memo: memo || undefined, expirySeconds: expiry || 2592000,
        });
        statusEl.innerHTML = `<span class="form-success">✓ Created: <strong>${result.scheduleId}</strong></span>`;
        setTimeout(() => {
            toggleCreateForm();
            scheduleInput.value = result.scheduleId;
            currentScheduleId = result.scheduleId;
            tabsEl.style.display = 'flex';
            setActiveTab('status');
            void renderStatus();
        }, 1200);
    }
    catch (err) {
        statusEl.innerHTML = `<span class="form-error">✗ ${err.message}</span>`;
        submitBtn.disabled = false;
    }
}
async function handleRecurring() {
    const submitBtn = document.getElementById('cf-submit');
    const statusEl = document.getElementById('cf-status');
    const accountId = document.getElementById('cf-account').value.trim();
    const privateKey = document.getElementById('cf-key').value.trim();
    const to = document.getElementById('cf-to').value.trim();
    const amount = document.getElementById('cf-amount').value.trim();
    const memo = document.getElementById('cf-memo').value.trim();
    const expiry = parseInt(document.getElementById('cf-expiry').value, 10);
    const count = parseInt(document.getElementById('cf-count').value, 10);
    const interval = parseInt(document.getElementById('cf-interval').value, 10);
    if (!accountId || !privateKey || !to || !amount || !count) {
        statusEl.innerHTML = '<span class="form-error">All fields except memo are required.</span>';
        return;
    }
    submitBtn.disabled = true;
    statusEl.innerHTML = `<span class="form-info"><span class="spinner-inline"></span> Creating ${count} schedules…</span>`;
    try {
        const result = await apiPost('/api/schedules/recurring', {
            accountId, privateKey, network: currentNetwork,
            to, amount, count, memo: memo || undefined,
            firstExpirySeconds: expiry || 2592000,
            intervalSeconds: interval || 2592000,
        });
        const rows = result.results.map((r) => `<tr><td>${r.index}</td><td class="mono">${r.scheduleId}</td><td><span class="badge badge-pending">PENDING</span></td></tr>`).join('');
        const errRows = result.errors.map((e) => `<tr><td>${e.index}</td><td colspan="2" class="form-error">${e.error}</td></tr>`).join('');
        statusEl.innerHTML = `
      <div style="margin-top:14px">
        <span class="form-success">✓ ${result.succeeded} of ${result.total} schedules created</span>
        <table class="signers-table" style="margin-top:10px">
          <thead><tr><th>#</th><th>Schedule ID</th><th>State</th></tr></thead>
          <tbody>${rows}${errRows}</tbody>
        </table>
      </div>
    `;
        submitBtn.disabled = false;
    }
    catch (err) {
        statusEl.innerHTML = `<span class="form-error">✗ ${err.message}</span>`;
        submitBtn.disabled = false;
    }
}
// ── Registry view ─────────────────────────────────────────────────────────────
async function showRegistry() {
    if (createFormVisible)
        toggleCreateForm();
    tabsEl.style.display = 'none';
    currentScheduleId = '';
    showLoading('Loading registry…');
    try {
        const entries = await apiGet('/api/registry');
        if (entries.length === 0) {
            panelEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">◈</div>
          <p>No schedules in local registry yet. Create one to get started.</p>
        </div>`;
            return;
        }
        const rows = entries.map((e) => `
      <tr class="registry-row" data-id="${e.scheduleId}" data-network="${e.network}">
        <td class="mono">${e.scheduleId}</td>
        <td>${e.network}</td>
        <td><span class="badge ${badgeClass(e.state)}">${e.state}</span></td>
        <td>${fmt(e.createdAt)}</td>
        <td>${fmt(e.expiresAt ?? null)}</td>
        <td>${(e.tags ?? []).map((t) => `<span class="tag">${t}</span>`).join(' ') || '—'}</td>
      </tr>
    `).join('');
        panelEl.innerHTML = `
      <div class="registry-header">
        <span class="form-title">Local Registry</span>
        <span class="signers-count">${entries.length} schedule(s)</span>
      </div>
      <p class="registry-hint">Click a row to load that schedule.</p>
      <table class="signers-table">
        <thead>
          <tr>
            <th>Schedule ID</th><th>Network</th><th>State</th>
            <th>Created</th><th>Expires</th><th>Tags</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
        document.querySelectorAll('.registry-row').forEach((row) => {
            row.addEventListener('click', () => {
                const id = row.dataset['id'];
                const net = row.dataset['network'];
                scheduleInput.value = id;
                currentScheduleId = id;
                currentNetwork = net;
                networkSelect.value = net;
                tabsEl.style.display = 'flex';
                setActiveTab('status');
                void renderStatus();
            });
        });
    }
    catch (err) {
        showError(`Could not load registry — is the local server running?\n${err.message}`);
    }
}
// ── Sign section ──────────────────────────────────────────────────────────────
function signSectionHTML() {
    return `
    <div class="sign-section">
      <div class="sign-title">Sign this Schedule</div>
      <div class="form-row">
        <div class="form-field">
          <label>Account ID</label>
          <input id="sign-account" type="text" placeholder="0.0.12345" spellcheck="false" />
        </div>
        <div class="form-field">
          <label>Private Key</label>
          <input id="sign-key" type="password" placeholder="302e020100..." spellcheck="false" />
        </div>
      </div>
      <div class="form-actions">
        <button id="sign-submit" class="btn-primary">Sign →</button>
        <div id="sign-status" class="form-status"></div>
      </div>
    </div>
  `;
}
function bindSignSection() {
    document.getElementById('sign-submit')?.addEventListener('click', () => void handleSign());
}
async function handleSign() {
    const submitBtn = document.getElementById('sign-submit');
    const statusEl = document.getElementById('sign-status');
    const accountId = document.getElementById('sign-account').value.trim();
    const privateKey = document.getElementById('sign-key').value.trim();
    if (!accountId || !privateKey) {
        statusEl.innerHTML = '<span class="form-error">Account ID and private key are required.</span>';
        return;
    }
    submitBtn.disabled = true;
    statusEl.innerHTML = '<span class="form-info"><span class="spinner-inline"></span> Signing…</span>';
    try {
        await apiPost(`/api/schedules/${currentScheduleId}/sign`, { accountId, privateKey, network: currentNetwork });
        statusEl.innerHTML = '<span class="form-success">✓ Signed — refreshing status…</span>';
        setTimeout(() => void renderStatus(), 1500);
    }
    catch (err) {
        statusEl.innerHTML = `<span class="form-error">✗ ${err.message}</span>`;
        submitBtn.disabled = false;
    }
}
// ── Tab renderers ─────────────────────────────────────────────────────────────
async function renderStatus() {
    showLoading();
    try {
        const s = await fetchScheduleStatus(currentScheduleId, currentNetwork);
        panelEl.innerHTML = statusHTML(s) + (s.state === 'PENDING' ? signSectionHTML() : '');
        if (s.state === 'PENDING')
            bindSignSection();
    }
    catch (e) {
        showError(e.message);
    }
}
function statusHTML(s) {
    return `
    <div class="status-grid">
      <div class="stat-card">
        <div class="stat-label">State</div>
        <div class="stat-value"><span class="badge ${badgeClass(s.state)}">${s.state}</span></div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Signatures Collected</div>
        <div class="stat-value">${s.signaturesCollected}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Schedule ID</div>
        <div class="stat-value">${s.scheduleId}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Network</div>
        <div class="stat-value">${s.network}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Created At</div>
        <div class="stat-value">${fmt(s.createdAt)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Expires At</div>
        <div class="stat-value">${fmt(s.expiresAt)}</div>
      </div>
      ${s.memo ? `<div class="stat-card memo-card"><div class="stat-label">Memo</div><div class="stat-value">${s.memo}</div></div>` : ''}
    </div>
  `;
}
async function renderSigners() {
    showLoading();
    try {
        const s = await fetchScheduleSigners(currentScheduleId, currentNetwork);
        panelEl.innerHTML = signersHTML(s);
    }
    catch (e) {
        showError(e.message);
    }
}
function signersHTML(s) {
    const rows = s.signatures.length === 0
        ? `<tr><td colspan="4" class="no-signers">No signatures collected yet.</td></tr>`
        : s.signatures.map((sig, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${sig.publicKeyPrefix || '—'}</td>
          <td>${sig.type}</td>
          <td>${sig.consensusTimestamp
            ? fmt(new Date(Number(sig.consensusTimestamp.split('.')[0]) * 1000).toISOString())
            : '—'}</td>
        </tr>`).join('');
    return `
    <div class="signers-header">
      <span class="badge ${badgeClass(s.state)}">${s.state}</span>
      <span class="signers-count">${s.signaturesCollected} signature(s) collected</span>
    </div>
    <table class="signers-table">
      <thead><tr><th>#</th><th>Public Key Prefix</th><th>Type</th><th>Signed At</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}
async function renderViz() {
    showLoading();
    try {
        const s = await fetchScheduleStatus(currentScheduleId, currentNetwork);
        panelEl.innerHTML = vizHTML(s);
    }
    catch (e) {
        showError(e.message);
    }
}
function vizHTML(s) {
    const stateIcon = s.state === 'EXECUTED' ? '✓' :
        s.state === 'DELETED' ? '✗' : '⏳';
    // Timeline bar
    let timelineBar = '';
    let pctLabel = '';
    if (s.createdAt && s.expiresAt) {
        const created = new Date(s.createdAt).getTime();
        const expires = new Date(s.expiresAt).getTime();
        const now = Date.now();
        const pct = Math.max(0, Math.min(100, ((now - created) / (expires - created)) * 100));
        const filled = Math.round(pct / 100 * 40);
        const empty = 40 - filled;
        timelineBar = '█'.repeat(filled) + '░'.repeat(empty);
        pctLabel = `${Math.round(pct)}% of expiry window elapsed`;
    }
    // Sig bar
    const sigBar = s.signaturesCollected > 0
        ? '█'.repeat(Math.min(s.signaturesCollected * 5, 40)) + '░'.repeat(Math.max(0, 40 - s.signaturesCollected * 5))
        : '░'.repeat(40);
    const WIDTH = 64;
    const line = '─'.repeat(WIDTH);
    const rows = [
        `┌${line}┐`,
        `│  Schedule Lifecycle: ${s.scheduleId.padEnd(WIDTH - 22)}  │`,
        `├${line}┤`,
        `│                                                                  │`,
        `│  CREATED ──────────── PENDING ──────────── ${`${stateIcon} ${s.state}`.padEnd(18)}│`,
        `│                                                                  │`,
        `├${line}┤`,
        `│  State:         ${s.state.padEnd(WIDTH - 17)}│`,
        `│  Signatures:    ${String(s.signaturesCollected).padEnd(WIDTH - 17)}│`,
        s.createdAt ? `│  Created:       ${new Date(s.createdAt).toLocaleString().padEnd(WIDTH - 17)}│` : null,
        s.expiresAt ? `│  Expires:       ${new Date(s.expiresAt).toLocaleString().padEnd(WIDTH - 17)}│` : null,
        s.memo ? `│  Memo:          ${s.memo.slice(0, WIDTH - 17).padEnd(WIDTH - 17)}│` : null,
        `│                                                                  │`,
        timelineBar ? `│  Time elapsed:  ${timelineBar}│` : null,
        timelineBar ? `│                 ${pctLabel.padEnd(WIDTH - 17)}│` : null,
        `│  Sig progress:  ${sigBar}│`,
        `│                                                                  │`,
        `└${line}┘`,
    ].filter(Boolean);
    return `<pre class="viz-output">${rows.join('\n')}</pre>`;
}
function renderWatch() {
    stopPoller();
    panelEl.innerHTML = watchHTML();
    bindWatchControls();
}
function watchHTML() {
    return `
    <div class="watch-controls">
      <button id="watch-start-btn">▶ Start Watching</button>
      <button id="watch-stop-btn" disabled>■ Stop</button>
      <div class="watch-interval">
        Poll every
        <input id="interval-input" type="number" value="5" min="2" max="60" />
        seconds
      </div>
    </div>
    <div class="watch-log" id="watch-log">
      <div class="log-entry">
        <span class="log-time">${timeNow()}</span>
        <span class="log-msg warn">Ready — press Start to begin polling ${currentScheduleId}</span>
      </div>
    </div>
  `;
}
function bindWatchControls() {
    const startBtn = document.getElementById('watch-start-btn');
    const stopBtn = document.getElementById('watch-stop-btn');
    const intervalInput = document.getElementById('interval-input');
    startBtn.addEventListener('click', () => {
        const intervalMs = Math.max(2, Number(intervalInput.value)) * 1000;
        startBtn.disabled = true;
        stopBtn.disabled = false;
        appendLog(`Watching ${currentScheduleId} on ${currentNetwork} every ${intervalMs / 1000}s…`, 'warn');
        startPoller(intervalMs, stopBtn, startBtn);
    });
    stopBtn.addEventListener('click', () => {
        stopPoller();
        startBtn.disabled = false;
        stopBtn.disabled = true;
        appendLog('Stopped.', 'warn');
    });
}
function appendLog(msg, cls = '') {
    const log = document.getElementById('watch-log');
    if (!log)
        return;
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `<span class="log-time">${timeNow()}</span><span class="log-msg ${cls}">${msg}</span>`;
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
}
function startPoller(intervalMs, stopBtn, startBtn) {
    activePoller = new ScheduleStatusPoller({
        scheduleId: currentScheduleId,
        network: currentNetwork,
        intervalMs,
        timeoutMs: 60 * 60 * 1000,
        onPoll: (s) => appendLog(`Poll → state: ${s.state}, signatures: ${s.signaturesCollected}`),
        onTerminal: (s) => {
            appendLog(`Terminal state reached: ${s.state}`, s.state === 'EXECUTED' ? 'success' : 'error');
            stopBtn.disabled = true;
            startBtn.disabled = false;
            activePoller = null;
        },
        onTimeout: () => {
            appendLog('Watch timed out (1 hour elapsed).', 'error');
            stopBtn.disabled = true;
            startBtn.disabled = false;
            activePoller = null;
        },
        onError: (err) => appendLog(`Error: ${err.message}`, 'error'),
    });
    activePoller.start();
}
function stopPoller() {
    activePoller?.stop();
    activePoller = null;
}
// ── Tab switching ─────────────────────────────────────────────────────────────
function setActiveTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab').forEach((el) => {
        el.classList.toggle('active', el.dataset['tab'] === tab);
    });
}
function renderCurrentTab() {
    stopPoller();
    if (currentTab === 'status')
        void renderStatus();
    if (currentTab === 'signers')
        void renderSigners();
    if (currentTab === 'watch')
        renderWatch();
    if (currentTab === 'viz')
        void renderViz();
}
// ── Search ────────────────────────────────────────────────────────────────────
function doSearch() {
    const id = scheduleInput.value.trim();
    if (!id)
        return;
    if (createFormVisible)
        toggleCreateForm();
    currentScheduleId = id;
    currentNetwork = networkSelect.value;
    currentTab = 'status';
    tabsEl.style.display = 'flex';
    setActiveTab('status');
    void renderStatus();
}
// ── Event listeners ───────────────────────────────────────────────────────────
searchBtn.addEventListener('click', doSearch);
scheduleInput.addEventListener('keydown', (e) => { if (e.key === 'Enter')
    doSearch(); });
createBtn.addEventListener('click', toggleCreateForm);
registryBtn.addEventListener('click', () => void showRegistry());
tabsEl.addEventListener('click', (e) => {
    const tab = e.target.dataset['tab'];
    if (tab && tab !== currentTab) {
        setActiveTab(tab);
        renderCurrentTab();
    }
});
networkSelect.addEventListener('change', () => {
    currentNetwork = networkSelect.value;
    if (currentScheduleId)
        renderCurrentTab();
});
