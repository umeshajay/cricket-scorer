import { useState, useEffect } from 'react';
import Link from 'next/link';

const REPO = 'umeshajay/cricket-scorer';
const BRANCH = 'main';
const DATA_PATH = 'bot/data.json';

function store() {
  if (typeof window === 'undefined') return null;
  let s = localStorage.getItem('gh_pat');
  if (s) return s;
  return null;
}

async function ghApi(path, token, method = 'GET', body = null) {
  const opts = { headers: { Authorization: `token ${token}` } };
  if (body) { opts.method = method; opts.body = JSON.stringify(body); opts.headers['Content-Type'] = 'application/json'; }
  const r = await fetch(`https://api.github.com${path}`, opts);
  if (!r.ok) { const e = await r.json().catch(() => ({ message: r.statusText })); throw new Error(e.message); }
  return r.json();
}

async function loadData(token) {
  const r = await ghApi(`/repos/${REPO}/contents/${DATA_PATH}`, token);
  const raw = atob(r.content.replace(/\n/g, ''));
  return { data: JSON.parse(raw), sha: r.sha };
}

async function saveData(token, sha, data) {
  await ghApi(`/repos/${REPO}/contents/${DATA_PATH}`, token, 'PUT', {
    message: 'Score update [skip ci]',
    content: btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2)))),
    sha,
    branch: BRANCH,
  });
}

function freshId(data) {
  let max = 0;
  Object.values(data.balls || {}).forEach(b => { const n = parseInt(b.id); if (n > max) max = n; });
  return String(max + 1);
}

function nextBall(data, matchId, inc) {
  const balls = Object.values(data.balls || {}).filter(b => b.match_id === matchId);
  if (!balls.length) return [1.1, 1];
  const last = balls.sort((a, bb) => (bb.id || '0').localeCompare(a.id || '0'))[0];
  const ov = Math.floor(last.over_number);
  const bn = last.ball_number;
  if (inc === 0) return [ov + bn / 10, bn];
  if (bn >= 6) return [ov + 1.1, 1];
  return [ov + (bn + 1) / 10, bn + 1];
}

function updateInnings(data, matchId, innId, addRuns, addWkts, addExtras, addLegal) {
  const inn = Object.values(data.innings || {}).find(i => i.match_id === matchId && i.innings_no === 1);
  if (!inn) return;
  inn.total_runs = (inn.total_runs || 0) + addRuns + addExtras;
  inn.total_wickets = (inn.total_wickets || 0) + addWkts;
  inn.total_balls = (inn.total_balls || 0) + addLegal;
  inn.extras = (inn.extras || 0) + addExtras;
}

function ensureInnings(data, matchId, match) {
  const key = `${matchId}_1`;
  if (data.innings && data.innings[key]) return data.innings[key];
  if (!data.innings) data.innings = {};
  data.innings[key] = {
    id: key, match_id: matchId, innings_no: 1,
    batting_team: match.team_a_name,
    bowling_team: match.team_b_name,
    total_runs: 0, total_wickets: 0, total_balls: 0, extras: 0, is_complete: false,
    created_at: new Date().toISOString(),
  };
  return data.innings[key];
}

const btn = (text, cb, color = 'bg-gray-100') => (
  <button key={cb} onClick={() => cb()} className={`${color} text-gray-800 font-bold text-xl rounded-xl py-4 px-2 shadow-sm active:scale-95 transition border border-gray-200`}>{text}</button>
);

export default function Scorer() {
  const [token, setToken] = useState('');
  const [saved, setSaved] = useState(false);
  const [matches, setMatches] = useState([]);
  const [selMid, setSelMid] = useState('');
  const [match, setMatch] = useState(null);
  const [data, setData] = useState(null);
  const [sha, setSha] = useState('');
  const [log, setLog] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = store();
    if (t) { setToken(t); setSaved(true); }
  }, []);

  const saveToken = () => {
    if (token.length < 10) return;
    localStorage.setItem('gh_pat', token);
    setSaved(true);
  };

  const load = async () => {
    if (!token) return;
    setBusy(true);
    try {
      const { data: d, sha: s } = await loadData(token);
      setData(d);
      setSha(s);
      const list = Object.values(d.matches || {});
      setMatches(list);
      if (list.length > 0 && !selMid) setSelMid(list[0].match_id);
      setLog('Loaded');
    } catch (e) { setLog('Load error: ' + e.message); }
    setBusy(false);
  };

  useEffect(() => { if (saved) load(); }, [saved]);

  useEffect(() => {
    if (!data || !selMid) return;
    setMatch((data.matches || {})[selMid] || null);
  }, [selMid, data]);

  const score = async (fn) => {
    if (!data || !sha || !match) return;
    setBusy(true);
    try {
      const d = JSON.parse(JSON.stringify(data));
      fn(d, selMid, match);
      const enc = new TextEncoder();
      const bytes = enc.encode(JSON.stringify(d, null, 2));
      const b64 = btoa(String.fromCharCode(...new Uint8Array(bytes)));
      await ghApi(`/repos/${REPO}/contents/${DATA_PATH}`, token, 'PUT', {
        message: 'Score update [skip ci]',
        content: b64,
        sha,
        branch: BRANCH,
      });
      const { sha: s } = await loadData(token);
      setSha(s);
      setData(d);
      setLog('Saved ✓');
    } catch (e) { setLog('Error: ' + e.message); }
    setBusy(false);
  };

  const doRun = (runs) => score((d, mid, m) => {
    const [ov, bn] = nextBall(d, mid, 1);
    const inn = ensureInnings(d, mid, m);
    const id = freshId(d);
    if (!d.balls) d.balls = {};
    d.balls[id] = { id, match_id: mid, innings_id: inn.id, over_number: ov, ball_number: bn, runs, extras: 0, extra_type: null, is_wicket: false, total_runs_ball: runs, created_at: new Date().toISOString() };
    updateInnings(d, mid, inn.id, runs, 0, 0, 1);
  });

  const doWide = (bat) => score((d, mid, m) => {
    const [ov, bn] = nextBall(d, mid, 0);
    const inn = ensureInnings(d, mid, m);
    const id = freshId(d);
    if (!d.balls) d.balls = {};
    d.balls[id] = { id, match_id: mid, innings_id: inn.id, over_number: ov, ball_number: bn, runs: 0, extras: bat, extra_type: 'wide', is_wicket: false, total_runs_ball: bat, created_at: new Date().toISOString() };
    updateInnings(d, mid, inn.id, 0, 0, bat, 0);
  });

  const doNoball = (bat) => score((d, mid, m) => {
    const [ov, bn] = nextBall(d, mid, 0);
    const inn = ensureInnings(d, mid, m);
    const id = freshId(d);
    if (!d.balls) d.balls = {};
    d.balls[id] = { id, match_id: mid, innings_id: inn.id, over_number: ov, ball_number: bn, runs: bat, extras: 0, extra_type: 'noball', is_wicket: false, total_runs_ball: bat, created_at: new Date().toISOString() };
    updateInnings(d, mid, inn.id, bat, 0, 0, 0);
  });

  const doWicket = (wkt) => score((d, mid, m) => {
    const [ov, bn] = nextBall(d, mid, 1);
    const inn = ensureInnings(d, mid, m);
    const id = freshId(d);
    if (!d.balls) d.balls = {};
    d.balls[id] = { id, match_id: mid, innings_id: inn.id, over_number: ov, ball_number: bn, runs: 0, extras: 0, extra_type: null, is_wicket: true, wicket_type: wkt, total_runs_ball: 0, created_at: new Date().toISOString() };
    updateInnings(d, mid, inn.id, 0, 1, 0, 1);
  });

  if (!saved) {
    return (
      <div className="max-w-sm mx-auto mt-12 space-y-4">
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Scorer Setup</h1>
          <p className="text-sm text-gray-500 mb-4">Enter your GitHub Personal Access Token (classic, with <code className="bg-gray-100 px-1 rounded">repo</code> scope)</p>
          <input value={token} onChange={e => setToken(e.target.value)} className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-center text-gray-700 focus:outline-none focus:border-cyan-500 mb-3" placeholder="ghp_..." type="password" />
          <button onClick={saveToken} className="w-full bg-cyan-500 hover:bg-cyan-600 text-white py-2 rounded-lg font-semibold text-sm transition shadow-sm">Save Token</button>
        </div>
      </div>
    );
  }

  const inn = data ? Object.values(data.innings || {}).find(i => i.match_id === selMid) : null;
  const ovStr = inn ? `${Math.floor(inn.total_balls / 6)}.${inn.total_balls % 6}` : '0.0';

  return (
    <div className="max-w-md mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <select value={selMid} onChange={e => setSelMid(e.target.value)} className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500">
          <option value="">Select match</option>
          {matches.map(m => <option key={m.match_id} value={m.match_id}>{m.match_id} — {m.team_a_name} vs {m.team_b_name}</option>)}
        </select>
        <button onClick={load} className="bg-gray-100 border border-gray-300 px-3 py-2 rounded-lg text-sm" disabled={busy}>↻</button>
      </div>

      {match && inn && (
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm text-center">
          <div className="text-2xl font-black text-cyan-600">{inn.total_runs}/{inn.total_wickets}</div>
          <div className="text-xs text-gray-500">Over {ovStr} · Extras {inn.extras}</div>
          <div className="text-sm font-semibold text-gray-700 mt-1">{match.team_a_name} vs {match.team_b_name}</div>
        </div>
      )}

      {log && <div className={`text-xs text-center ${log.includes('Error') ? 'text-red-500' : 'text-green-600'}`}>{log}</div>}

      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm space-y-2">
        <div className="font-semibold text-sm text-gray-500 mb-1">Runs</div>
        <div className="grid grid-cols-6 gap-2">
          {[[0,'Dot'],[1,'1'],[2,'2'],[3,'3'],[4,'4'],[6,'6']].map(([r, lbl]) => btn(lbl, () => doRun(r), r === 4 ? 'bg-blue-100' : r === 6 ? 'bg-purple-100' : 'bg-gray-50'))}
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm space-y-2">
        <div className="font-semibold text-sm text-gray-500 mb-1">Extras</div>
        <div className="grid grid-cols-4 gap-2">
          {btn('Wide +0', () => doWide(0), 'bg-yellow-50')}
          {btn('Wide +1', () => doWide(1), 'bg-yellow-50')}
          {btn('Wide +2', () => doWide(2), 'bg-yellow-50')}
          {btn('Wide +4', () => doWide(4), 'bg-yellow-50')}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {btn('NB +0', () => doNoball(0), 'bg-orange-50')}
          {btn('NB +1', () => doNoball(1), 'bg-orange-50')}
          {btn('NB +2', () => doNoball(2), 'bg-orange-50')}
          {btn('NB +4', () => doNoball(4), 'bg-orange-50')}
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm space-y-2">
        <div className="font-semibold text-sm text-gray-500 mb-1">Wicket</div>
        <div className="grid grid-cols-3 gap-2">
          {[['Bowled','bowled'],['Caught','caught'],['Run Out','run_out'],['LBW','lbw'],['Stumped','stumped']].map(([lbl, val]) => btn(lbl, () => doWicket(val), 'bg-red-50'))}
        </div>
      </div>

      <div className="text-center">
        <Link href="/dashboard" className="text-cyan-600 hover:underline text-xs font-medium">View Live Dashboard →</Link>
      </div>
    </div>
  );
}
