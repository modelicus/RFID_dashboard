// ─── Config ───────────────────────────────────────────────────────────────────
// Set to your backend origin in production, e.g. 'https://rfid.yourserver.com'
// Leave empty to use the same origin as the dashboard (great when proxied or co-hosted)
const API_BASE = 'http://192.168.1.234:3000'
const POLL_INTERVAL = 10   // seconds

// ─── State ────────────────────────────────────────────────────────────────────
let countdown = POLL_INTERVAL
let intervalId = null
let prevScans = null
let prevIds = null

// ─── Boot ─────────────────────────────────────────────────────────────────────
document.getElementById('app').innerHTML = buildShell()
startPolling()
fetchStats()

// ─── Shell HTML ───────────────────────────────────────────────────────────────
function buildShell() {
  return `
    <div class="wordmark">
      <div class="wordmark-diamond"></div>
      <span class="wordmark-text">RFID Command Center</span>
    </div>

    <div class="status-bar">

      <div class="backend-status">
        <span class="backend-label">Backend</span>
        <div class="backend-indicator">
          <div class="status-dot loading" id="backend-dot"></div>
          <span class="status-text loading" id="backend-status-text">CONNECTING…</span>
        </div>
      </div>

      <div style="display:flex; gap:32px;">
        <div class="stat-block">
          <span class="stat-label">Total Scans</span>
          <span class="stat-value" id="total-scans">—</span>
        </div>
        <div class="stat-block">
          <span class="stat-label">Unique IDs</span>
          <span class="stat-value" id="unique-ids">—</span>
        </div>
      </div>

      <div class="refresh-block">
        <span class="refresh-label">Next refresh</span>
        <div class="refresh-timer">
          <span class="refresh-countdown" id="refresh-countdown">${POLL_INTERVAL}</span>
          <span class="refresh-unit">SEC</span>
        </div>
        <div class="refresh-bar-track">
          <div class="refresh-bar-fill" id="refresh-bar" style="width:100%"></div>
        </div>
      </div>

    </div>

    <div class="section-head">
      <div class="section-head-line"></div>
      <span class="section-head-text">Scanning Stations</span>
      <div class="section-head-line"></div>
    </div>

    <div class="stations-grid" id="stations-grid">
      <div class="stations-empty">
        <div class="empty-icon">◈</div>
        Awaiting station data…
      </div>
    </div>
  `
}

// ─── Fetch ────────────────────────────────────────────────────────────────────
async function fetchStats() {
  try {
    const res = await fetch(`${API_BASE}/api/stats`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    renderOnline(data)
  } catch {
    renderOffline()
  }
}

// ─── Render: backend online ───────────────────────────────────────────────────
function renderOnline(data) {
  // Backend dot
  const dot = document.getElementById('backend-dot')
  const txt = document.getElementById('backend-status-text')
  dot.className = 'status-dot online'
  txt.className = 'status-text online'
  txt.textContent = 'ONLINE'

  // Stats with flash on change
  setStatValue('total-scans', data.total_scans, prevScans)
  setStatValue('unique-ids', data.unique_rfids, prevIds)
  prevScans = data.total_scans
  prevIds = data.unique_rfids

  // Stations
  renderStations(data.stations ?? [])
}

function setStatValue(id, value, prev) {
  const el = document.getElementById(id)
  if (!el) return
  const formatted = value != null ? value.toLocaleString() : '—'
  el.textContent = formatted
  if (prev != null && value !== prev) {
    el.classList.remove('updated')
    void el.offsetWidth  // force reflow to restart animation
    el.classList.add('updated')
    setTimeout(() => el.classList.remove('updated'), 800)
  }
}

// ─── Render: backend offline ──────────────────────────────────────────────────
function renderOffline() {
  const dot = document.getElementById('backend-dot')
  const txt = document.getElementById('backend-status-text')
  dot.className = 'status-dot offline'
  txt.className = 'status-text offline'
  txt.textContent = 'OFFLINE'

  document.getElementById('total-scans').textContent = '—'
  document.getElementById('unique-ids').textContent = '—'
  prevScans = null
  prevIds = null
}

// ─── Stations ─────────────────────────────────────────────────────────────────
function renderStations(stations) {
  const grid = document.getElementById('stations-grid')

  // Remove placeholder on first real data
  const placeholder = grid.querySelector('.stations-empty')
  if (placeholder && stations.length > 0) placeholder.remove()

  // Create or update each station card
  stations.forEach((s, i) => {
    const cardId = `card-${s.station}`
    let card = document.getElementById(cardId)

    if (!card) {
      card = document.createElement('div')
      card.id = cardId
      card.className = 'station-card'
      grid.appendChild(card)
      // Stagger the entrance animation
      setTimeout(() => card.classList.add('visible'), i * 60)
    }

    updateCard(card, s)
  })
}

function updateCard(card, s) {
  const isOnline = s.online
  const name = formatStationName(s.station)
  const lastSeen = formatTime(s.last_heartbeat)

  card.className = `station-card visible ${isOnline ? 'card-online' : 'card-offline'}`
  card.innerHTML = `
    <div class="card-top">
      <span class="card-station-name">${name}</span>
      <div class="indicator ${isOnline ? 'ind-online' : 'ind-offline'}"></div>
    </div>
    <div class="card-status ${isOnline ? 's-online' : 's-offline'}">
      ${isOnline ? 'ONLINE' : 'OFFLINE'}
    </div>
    <div class="card-footer">
      <span class="card-footer-label">Last heartbeat</span>
      <span class="card-footer-value">${lastSeen}</span>
    </div>
  `
}

// ─── Timer ────────────────────────────────────────────────────────────────────
function startPolling() {
  countdown = POLL_INTERVAL
  intervalId = setInterval(tick, 1000)
}

// Maps countdown 10→90%  and  1→0%  (snap handles the 100% flash on reset)
function barWidth(c) {
  return ((c - 1) / POLL_INTERVAL) * 100
}

function tick() {
  const countdownEl = document.getElementById('refresh-countdown')
  const barEl = document.getElementById('refresh-bar')

  // Check before decrementing so "0" is never computed or displayed
  if (countdown - 1 <= 0) {
    // Snap bar to full instantly (no transition), then immediately start moving
    if (barEl) {
      barEl.style.transition = 'none'
      barEl.style.width = '100%'
      barEl.offsetWidth // force reflow
      barEl.style.transition = ''
    }
    fetchStats()
    countdown = POLL_INTERVAL
    if (countdownEl) countdownEl.textContent = countdown
    if (barEl) barEl.style.width = `${barWidth(countdown)}%`
    return
  }

  countdown--
  if (countdownEl) countdownEl.textContent = countdown
  if (barEl) barEl.style.width = `${barWidth(countdown)}%`
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatStationName(id) {
  // 'station_1' → 'STATION 1'
  return id.replace(/_/g, ' ').toUpperCase()
}

function formatTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d)) return '—'
  return d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}
