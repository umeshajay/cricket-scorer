// Bot API URL — change this to your deployed bot's URL
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}/api${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || res.statusText);
  }
  return res.json();
}

// ── Matches ────────────────────────────────────────────

export async function fetchMatches() {
  return api('/matches');
}

export async function fetchMatchById(matchId) {
  const data = await api(`/matches/${matchId}`);
  return data.match;
}

export async function createMatch(matchObj) {
  return api('/matches', { method: 'POST', body: JSON.stringify(matchObj) });
}

// ── Innings & Balls (inline in match detail) ───────────

export async function fetchInnings(matchId) {
  const data = await api(`/matches/${matchId}`);
  return data.innings || [];
}

export async function fetchBalls(matchId) {
  const data = await api(`/matches/${matchId}`);
  return data.balls || [];
}

// ── Players ────────────────────────────────────────────

export async function fetchPlayers() {
  return api('/players');
}

export async function addPlayer(name) {
  return api('/players', { method: 'POST', body: JSON.stringify({ name }) });
}

export async function deletePlayer(id) {
  return api(`/players/${id}`, { method: 'DELETE' });
}

// ── Settings ────────────────────────────────────────────

export async function fetchSetting(key) {
  const data = await api(`/settings/${key}`);
  return data.value;
}

export async function upsertSetting(key, value) {
  return api(`/settings/${key}`, { method: 'POST', body: JSON.stringify({ value }) });
}

// ── Leaderboard ─────────────────────────────────────────

export async function fetchTopRunScorers() {
  const data = await api('/leaderboard');
  return data.batsmen || [];
}

export async function fetchTopWicketTakers() {
  const data = await api('/leaderboard');
  return data.bowlers || [];
}
