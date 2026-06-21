import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { fetchMatches, fetchMatchById, fetchInnings, fetchBalls, hasGitHubSettings, getGitHubSettings, syncFromGitHub, fetchFromPublicGitHub } from '../lib/api';

export default function Dashboard() {
  const router = useRouter();
  const [matches, setMatches] = useState([]);
  const [selId, setSelId] = useState('');
  const [match, setMatch] = useState(null);
  const [innings, setInnings] = useState([]);
  const [balls, setBalls] = useState([]);
  const [err, setErr] = useState('');
  const [repoInput, setRepoInput] = useState('');
  const [ghMsg, setGhMsg] = useState('');
  const [busy, setBusy] = useState(false);

  // Pull data from GitHub
  const pullFromGitHub = useCallback(async (repo) => {
    setBusy(true);
    setGhMsg('');
    try {
      const fromUrl = router.query.repo || repo || repoInput;
      if (!fromUrl) { setGhMsg('Enter a repo (e.g. username/repo)'); setBusy(false); return; }
      await fetchFromPublicGitHub(fromUrl);
      setGhMsg('Data loaded from GitHub ✓');
      // reload matches
      const m = await fetchMatches();
      setMatches(m);
      // try to select the match from URL param
      const q = router.query.match;
      if (q && m.some(mm => mm.match_id === q)) setSelId(q);
      else if (m.length > 0) setSelId(m[0].match_id);
    } catch (e) {
      setGhMsg('Error: ' + e.message);
    }
    setBusy(false);
  }, [router.query.match, router.query.repo, repoInput]);

  // On mount, load matches from localStorage
  useEffect(() => {
    fetchMatches()
      .then((data) => {
        setMatches(data);
        const q = router.query.match;
        if (q && data.some((m) => m.match_id === q)) {
          setSelId(q);
        } else if (!q && data.length > 0) {
          const live = data.find((m) => m.status === 'ongoing');
          const next = data.find((m) => m.status === 'upcoming');
          const first = live || next || data[0];
          setSelId(first.match_id);
        }
      })
      .catch(() => {});
  }, [router.query]);

  // If ?match= is set but no local data, prompt to pull from GitHub
  useEffect(() => {
    if (router.query.match && matches.length === 0 && !err) {
      // check if repo is in URL params or settings
      const qRepo = router.query.repo;
      if (qRepo) {
        setRepoInput(qRepo);
        pullFromGitHub(qRepo);
      }
    }
  }, [router.query, matches, err, pullFromGitHub]);

  const loadData = useCallback(async () => {
    if (!selId) return;
    try {
      const [m, inns, bls] = await Promise.all([fetchMatchById(selId), fetchInnings(selId), fetchBalls(selId)]);
      setMatch(m);
      setInnings(inns || []);
      setBalls(bls || []);
      setErr('');
    } catch (e) {
      setErr(e.message);
    }
  }, [selId]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!selId) return;
    const id = setInterval(loadData, 5000);
    return () => clearInterval(id);
  }, [selId, loadData]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900">Live Score</h1>
        <select value={selId} onChange={(e) => setSelId(e.target.value)}
          className="bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:border-cyan-500 shadow-sm">
          <option value="">— Select match —</option>
          {matches.map((m) => (
            <option key={m.id} value={m.match_id}>
              {m.match_id} — {m.team_a_name} vs {m.team_b_name}
            </option>
          ))}
        </select>
        <button onClick={loadData} className="bg-white border border-gray-300 hover:bg-gray-50 px-3 py-1.5 rounded-lg text-sm text-gray-600 transition shadow-sm">
          Refresh
        </button>
      </div>

      {/* GitHub viewer panel */}
      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="text"
            value={repoInput}
            onChange={e => setRepoInput(e.target.value)}
            placeholder="GitHub repo (username/repo)"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
          />
          <button onClick={() => pullFromGitHub()} disabled={busy} className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
            {busy ? 'Loading...' : 'Load from GitHub'}
          </button>
        </div>
        {ghMsg && <p className={`text-xs ${ghMsg.includes('Error') ? 'text-red-500' : 'text-green-600'}`}>{ghMsg}</p>}
        {router.query.match && matches.length === 0 && !ghMsg && (
          <p className="text-xs text-amber-600">
            No local data found for match {router.query.match}. Enter the repo above and click Load to fetch from GitHub.
          </p>
        )}
      </div>

      {err && <p className="text-red-500 text-sm">{err}</p>}

      {!selId && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200 shadow-sm">
          <p className="text-gray-400">No matches found.</p>
          <p className="text-xs text-gray-400 mt-1">Enter a GitHub repo above and click Load to pull match data.</p>
        </div>
      )}

      {match && (
        <>
          {innings.length === 0 && (
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm text-center">
              <h2 className="text-xl font-bold text-gray-900">{match.team_a_name} vs {match.team_b_name}</h2>
              <p className="text-gray-500 text-sm mt-1">
                Match {match.match_id} &middot; {match.total_overs} overs &middot;{' '}
                <span className="text-cyan-600 font-medium">{match.status}</span>
              </p>
            </div>
          )}

          {innings.map((inn, idx) => {
            const isLive = idx === innings.length - 1 && match.status === 'ongoing';
            const ov = `${Math.floor(inn.total_balls / 6)}.${inn.total_balls % 6}`;
            const rr = inn.total_balls > 0 ? (inn.total_runs / (inn.total_balls / 6)).toFixed(2) : '0.00';
            return (
              <div key={inn.id} className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-gray-900">{inn.batting_team}</h2>
                    {isLive && <span className="w-2.5 h-2.5 rounded-full bg-green-500 live-pulse" />}
                    {isLive && <span className="text-green-600 text-xs font-medium">LIVE</span>}
                    <span className="text-gray-400 text-sm ml-1">vs {inn.bowling_team}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-black text-cyan-600">{inn.total_runs}/{inn.total_wickets}</span>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Ov {ov}/{match.total_overs}.0 &middot; CRR {rr} &middot; Extras {inn.extras}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {balls.length > 0 && (
            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Ball-by-Ball</h3>

              <div className="flex gap-3 flex-wrap text-xs text-gray-500 mb-4">
                {[{ cls: 'run', label: 'Dot' }, { cls: 'four', label: '4' }, { cls: 'six', label: '6' },
                  { cls: 'wicket', label: 'Wkt' }, { cls: 'wide', label: 'WD' }, { cls: 'noball', label: 'NB' }]
                  .map((x) => (
                    <span key={x.cls} className="flex items-center gap-1">
                      <span className={`ball-dot ${x.cls}`} style={{ width: 18, height: 18, fontSize: 9 }}>&nbsp;</span>
                      {x.label}
                    </span>
                  ))}
              </div>

              {groupByOver(balls).map(([over, bballs]) => (
                <div key={over} className="mb-3">
                  <div className="text-xs text-gray-400 mb-1">Over {over}</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {bballs.map((b, i) => {
                      const cls = ballClass(b);
                      const label = ballLabel(b);
                      return (
                        <span key={i} className={`ball-dot ${cls}`} title={ballTitle(b)}>
                          {label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function groupByOver(balls) {
  const map = {};
  balls.forEach((b) => {
    const ov = Math.floor(b.over_number);
    if (!map[ov]) map[ov] = [];
    map[ov].push(b);
  });
  return Object.entries(map).sort((a, b) => Number(a[0]) - Number(b[0]));
}

function ballClass(b) {
  if (b.is_wicket) return 'wicket';
  if (b.extra_type === 'noball') return 'noball';
  if (b.extra_type === 'wide') return 'wide';
  if (b.bat_runs === 4) return 'four';
  if (b.bat_runs === 6) return 'six';
  if (b.bat_runs > 0) return 'run';
  return 'run';
}

function ballLabel(b) {
  if (b.is_wicket) return 'W';
  if (b.extra_type === 'wide') return 'WD' + (b.bat_runs > 0 ? b.bat_runs : '');
  if (b.extra_type === 'noball') return 'NB' + (b.bat_runs > 0 ? b.bat_runs : '');
  return b.bat_runs != null ? String(b.bat_runs) : '0';
}

function ballTitle(b) {
  const parts = [];
  if (b.is_wicket) parts.push(`Wicket! ${b.wicket_type || ''}`);
  if (b.extra_type) parts.push(b.extra_type);
  if (b.bat_runs > 0) parts.push(`${b.bat_runs} runs`);
  if (b.bowler_name) parts.push(`Bowled by ${b.bowler_name}`);
  return parts.join(' · ');
}
