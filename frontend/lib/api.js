// Reads match data from the raw data.json committed by the bot
const DATA_URL = 'https://raw.githubusercontent.com/umeshajay/cricket-scorer/main/bot/data.json';

let _cache = null;

async function loadData() {
  const res = await fetch(DATA_URL + '?t=' + Date.now());
  if (!res.ok) throw new Error('Failed to fetch data');
  _cache = await res.json();
  return _cache;
}

// ── Matches ────────────────────────────────────────────

export async function fetchMatches() {
  const data = await loadData();
  const list = Object.values(data.matches || {});
  return list.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
}

export async function fetchMatchById(matchId) {
  const data = await loadData();
  return (data.matches || {})[matchId] || null;
}

export async function createMatch(matchObj) {
  throw new Error('Create match via Telegram bot (/match command)');
}

// ── Innings & Balls ─────────────────────────────────────

export async function fetchInnings(matchId) {
  const data = await loadData();
  const inns = data.innings || {};
  return Object.values(inns)
    .filter(i => i.match_id === matchId)
    .sort((a, b) => (a.innings_no || 0) - (b.innings_no || 0));
}

export async function fetchBalls(matchId) {
  const data = await loadData();
  const balls = data.balls || {};
  return Object.values(balls)
    .filter(b => b.match_id === matchId)
    .sort((a, b) => (a.over_number || 0) - (b.over_number || 0) || (a.created_at || '').localeCompare(b.created_at || ''));
}

// ── Players ────────────────────────────────────────────

export async function fetchPlayers() {
  const data = await loadData();
  return (data.players || []).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

export async function addPlayer(name) {
  throw new Error('Add players via GitHub — edit bot/data.json directly');
}

export async function deletePlayer(id) {
  throw new Error('Remove players via GitHub — edit bot/data.json directly');
}

// ── Settings ────────────────────────────────────────────

export async function fetchSetting(key) {
  const data = await loadData();
  return (data.settings || {})[key] || null;
}

export async function upsertSetting(key, value) {
  throw new Error('Settings managed via GitHub secrets or direct edit');
}

// ── Leaderboard ─────────────────────────────────────────

export async function fetchTopRunScorers() {
  const data = await loadData();
  const balls = Object.values(data.balls || {});
  const players = data.players || [];
  const nameMap = {};
  players.forEach(p => { nameMap[p.id] = p.name; });
  const runs = {};
  balls.forEach(b => {
    const bid = b.batsman_id || b.player_id;
    if (bid) runs[bid] = (runs[bid] || 0) + (b.bat_runs || 0) + (b.runs || 0);
  });
  return Object.entries(runs)
    .map(([id, r]) => ({ name: nameMap[id] || `Player ${id}`, runs: r }))
    .sort((a, b) => b.runs - a.runs)
    .slice(0, 10);
}

export async function fetchTopWicketTakers() {
  const data = await loadData();
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
  return Object.entries(wkts)
    .map(([id, w]) => ({ name: nameMap[id] || `Player ${id}`, wickets: w }))
    .sort((a, b) => b.wickets - a.wickets)
    .slice(0, 10);
}
