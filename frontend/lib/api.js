// Browser localStorage-based storage — zero setup, no auth needed

const STORAGE_KEY = 'cricket_scorer_data';

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
