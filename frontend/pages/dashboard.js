import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { fetchMatches, fetchMatchById, fetchInnings, fetchBalls } from '../lib/supabase';

export default function Dashboard() {
  const router = useRouter();
  const [matches, setMatches] = useState([]);
  const [selId, setSelId] = useState('');
  const [match, setMatch] = useState(null);
  const [innings, setInnings] = useState([]);
  const [balls, setBalls] = useState([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    fetchMatches()
      .then((data) => {
        setMatches(data);
        const q = router.query.match;
        if (q && data.some((m) => m.match_id === q)) setSelId(q);
      })
      .catch(() => {});
  }, [router.query]);

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

  // Auto-refresh every 5s
  useEffect(() => {
    if (!selId) return;
    const id = setInterval(loadData, 5000);
    return () => clearInterval(id);
  }, [selId, loadData]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-2xl font-bold">Live Score</h1>
        <select value={selId} onChange={(e) => setSelId(e.target.value)}
          className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-cyan-500">
          <option value="">— Select match —</option>
          {matches.map((m) => (
            <option key={m.id} value={m.match_id}>
              {m.match_id} — {m.team_a_name} vs {m.team_b_name}
            </option>
          ))}
        </select>
        <button onClick={loadData} className="bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg text-sm transition">
          Refresh
        </button>
      </div>

      {err && <p className="text-red-400 text-sm">{err}</p>}

      {!selId && <p className="text-slate-500">Select a match above.</p>}

      {match && (
        <>
          {/* Scorecard headers */}
          {innings.length === 0 && (
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 text-center">
              <h2 className="text-xl font-bold">{match.team_a_name} vs {match.team_b_name}</h2>
              <p className="text-slate-500 text-sm mt-1">
                Match {match.match_id} &middot; {match.total_overs} overs &middot;{' '}
                <span className="text-blue-400">{match.status}</span>
              </p>
            </div>
          )}

          {innings.map((inn, idx) => {
            const isLive = idx === innings.length - 1 && match.status === 'ongoing';
            const ov = `${Math.floor(inn.total_balls / 6)}.${inn.total_balls % 6}`;
            const rr = inn.total_balls > 0 ? (inn.total_runs / (inn.total_balls / 6)).toFixed(2) : '0.00';
            return (
              <div key={inn.id} className="bg-slate-800 rounded-xl p-5 border border-slate-700">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold">{inn.batting_team}</h2>
                    {isLive && <span className="w-2.5 h-2.5 rounded-full bg-green-500 live-pulse" />}
                    {isLive && <span className="text-green-400 text-xs font-medium">LIVE</span>}
                    <span className="text-slate-500 text-sm ml-1">vs {inn.bowling_team}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-black text-cyan-400">{inn.total_runs}/{inn.total_wickets}</span>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Ov {ov}/{match.total_overs}.0 &middot; CRR {rr} &middot; Extras {inn.extras}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Ball-by-ball */}
          {balls.length > 0 && (
            <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Ball-by-Ball</h3>

              {/* Legend */}
              <div className="flex gap-3 flex-wrap text-xs text-slate-500 mb-4">
                {[{ cls: 'run', label: 'Dot' }, { cls: 'four', label: '4' }, { cls: 'six', label: '6' },
                  { cls: 'wicket', label: 'Wkt' }, { cls: 'wide', label: 'WD' }, { cls: 'noball', label: 'NB' }]
                  .map((x) => (
                    <span key={x.cls} className="flex items-center gap-1">
                      <span className={`ball-dot ${x.cls}`} style={{ width: 18, height: 18, fontSize: 9 }}>&nbsp;</span>
                      {x.label}
                    </span>
                  ))}
              </div>

              {/* Group by over */}
              {groupByOver(balls).map(([over, bballs]) => (
                <div key={over} className="mb-3">
                  <div className="text-xs text-slate-500 mb-1">Over {over}</div>
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

// ── Helpers ────────────────────────────────────

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
  return 'run'; // dot
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
