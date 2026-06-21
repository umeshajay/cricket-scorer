// Browser localStorage-based storage — zero setup, no auth needed
// Optional GitHub sync — set GITHUB_TOKEN + GITHUB_REPO in settings to enable

const STORAGE_KEY = 'cricket_scorer_data';
const SETTINGS_KEY = 'cricket_scorer_settings';

function defaultData() {
  return { matches: {}, innings: {}, balls: {}, players: [], settings: {}, ball_id_seq: 0 };
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : defaultData();
  } catch { return defaultData(); }
}

function save(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ── GitHub Settings ─────────────────────────────────────
// Stored in a separate localStorage key so the viewer can configure their own token.

export function getGitHubSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : { token: '', repo: '' };
  } catch { return { token: '', repo: '' }; }
}

export function setGitHubSettings(token, repo) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ token, repo }));
}

export function hasGitHubSettings() {
  const s = getGitHubSettings();
  return !!(s.token && s.repo);
}

/**
 * Push all match data to GitHub as a single JSON file.
 * Uses the GitHub Contents API (commit a file).
 */
export async function syncToGitHub() {
  const settings = getGitHubSettings();
  if (!settings.token || !settings.repo) throw new Error('GitHub token and repo not configured');

  const data = load();
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
  const url = `https://api.github.com/repos/${settings.repo}/contents/data/match-data.json`;
  const headers = {
    Authorization: `Bearer ${settings.token}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };

  // Try to get existing file SHA (for update)
  let sha = null;
  try {
    const getRes = await fetch(url, { headers });
    if (getRes.ok) {
      const existing = await getRes.json();
      sha = existing.sha;
    }
  } catch { /* file doesn't exist yet */ }

  const body = { message: 'Update match data', content };
  if (sha) body.sha = sha;

  const res = await fetch(url, { method: 'PUT', headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.message || `GitHub sync failed (${res.status})`);
  }
  return true;
}

/**
 * Pull match data from GitHub and merge into localStorage.
 */
export async function syncFromGitHub() {
  const settings = getGitHubSettings();
  if (!settings.token || !settings.repo) throw new Error('GitHub token and repo not configured');

  const url = `https://api.github.com/repos/${settings.repo}/contents/data/match-data.json`;
  const headers = {
    Authorization: `Bearer ${settings.token}`,
    Accept: 'application/vnd.github.v3+json',
  };

  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Failed to fetch remote data (${res.status})`);

  const data = await res.json();
  const decoded = JSON.parse(decodeURIComponent(escape(atob(data.content))));
  save(decoded);
  return decoded;
}

/**
 * Get the raw URL for viewing match data (no auth needed if repo is public).
 */
export function getDataRawUrl() {
  const settings = getGitHubSettings();
  if (!settings.repo) return '';
  return `https://raw.githubusercontent.com/${settings.repo}/main/data/match-data.json`;
}

/**
 * Build a shareable viewer URL for a specific match.
 */
export function getMatchShareUrl(matchId) {
  const settings = getGitHubSettings();
  const base = window.location.origin + '/cricket-scorer/dashboard';
  const params = new URLSearchParams({ match: matchId });
  if (settings.repo) params.set('repo', settings.repo);
  return `${base}?${params.toString()}`;
}

/**
 * Fetch match data from the raw GitHub URL (no auth needed for public repos).
 * Replaces localStorage data with remote data.
 */
export async function fetchFromPublicGitHub(repo, matchId) {
  const rawUrl = `https://raw.githubusercontent.com/${repo}/main/data/match-data.json`;
  const res = await fetch(rawUrl);
  if (!res.ok) throw new Error('No synced data found on GitHub');
  const remote = await res.json();
  // Merge remote data into localStorage
  save(remote);
  return remote;
}

// ── Matches ────────────────────────────────────────────

export async function fetchMatches() {
  const data = load();
  return Object.values(data.matches || {}).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
}

export async function fetchMatchById(matchId) {
  const data = load();
  return (data.matches || {})[matchId] || null;
}

export async function createMatch(matchObj) {
  const data = load();
  const mid = matchObj.match_id;
  if (data.matches[mid]) throw new Error('Match ID already exists');
  data.matches[mid] = { id: mid, match_id: mid, ...matchObj, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  if (!data.innings) data.innings = {};
  const innKey = `${mid}_1`;
  data.innings[innKey] = {
    id: innKey, match_id: mid, innings_no: 1,
    batting_team: matchObj.team_a_name || 'Team A',
    bowling_team: matchObj.team_b_name || 'Team B',
    total_runs: 0, total_wickets: 0, total_balls: 0, extras: 0, is_complete: false,
    created_at: new Date().toISOString(),
  };
  save(data);
  return data.matches[mid];
}

// ── Innings & Balls ─────────────────────────────────────

export async function fetchInnings(matchId) {
  const data = load();
  return Object.values(data.innings || {}).filter(i => i.match_id === matchId).sort((a, b) => (a.innings_no || 0) - (b.innings_no || 0));
}

export async function fetchBalls(matchId) {
  const data = load();
  return Object.values(data.balls || {}).filter(b => b.match_id === matchId).sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
}

export async function insertBall(matchId, ballData) {
  const data = load();
  if (!data.balls) data.balls = {};
  data.ball_id_seq = (data.ball_id_seq || 0) + 1;
  const id = String(data.ball_id_seq);
  ballData.id = id;
  ballData.match_id = matchId;
  ballData.created_at = new Date().toISOString();
  data.balls[id] = ballData;
  save(data);
  return ballData;
}

export async function deleteBall(ballId) {
  const data = load();
  delete data.balls[ballId];
  save(data);
}

export async function updateInnings(matchId, inningsNo, updates) {
  const data = load();
  const key = `${matchId}_${inningsNo}`;
  if (data.innings[key]) {
    Object.assign(data.innings[key], updates);
    save(data);
  }
}

// ── Players ────────────────────────────────────────────

export async function fetchPlayers() {
  const data = load();
  return (data.players || []).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

export async function addPlayer(name) {
  const data = load();
  const pid = (data.players || []).reduce((m, p) => Math.max(m, p.id || 0), 0) + 1;
  const player = { id: pid, name: name.trim(), created_at: new Date().toISOString() };
  if (!data.players) data.players = [];
  data.players.push(player);
  save(data);
  return player;
}

export async function deletePlayer(id) {
  const data = load();
  data.players = (data.players || []).filter(p => p.id !== id);
  save(data);
}

// ── Settings ────────────────────────────────────────────

export async function fetchSetting(key) {
  const data = load();
  return (data.settings || {})[key] || null;
}

export async function upsertSetting(key, value) {
  const data = load();
  data.settings[key] = value;
  save(data);
}

// ── Leaderboard ─────────────────────────────────────────

export async function fetchTopRunScorers() {
  const data = load();
  const balls = Object.values(data.balls || {});
  const players = data.players || [];
  const nameMap = {};
  players.forEach(p => { nameMap[p.id] = p.name; });
  const runs = {};
  balls.forEach(b => {
    const bid = b.batsman_id || b.player_id;
    if (bid) runs[bid] = (runs[bid] || 0) + (b.bat_runs || 0) + (b.runs || 0);
  });
  return Object.entries(runs).map(([id, r]) => ({ name: nameMap[id] || `Player ${id}`, runs: r })).sort((a, b) => b.runs - a.runs).slice(0, 10);
}

export async function fetchTopWicketTakers() {
  const data = load();
  const balls = Object.values(data.balls || {});
  const players = data.players || [];
  const nameMap = {};
  players.forEach(p => { nameMap[p.id] = p.name; });
  const wkts = {};
  balls.forEach(b => {
    if (b.is_wicket) {
      const wid = b.bowler_id || b.player_id;
      if (wid) wkts[wid] = (wkts[wid] || 0) + 1;
    }
  });
  return Object.entries(wkts).map(([id, w]) => ({ name: nameMap[id] || `Player ${id}`, wickets: w })).sort((a, b) => b.wickets - a.wickets).slice(0, 10);
}
