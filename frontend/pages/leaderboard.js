import { useState, useEffect } from 'react';
import { fetchTopRunScorers, fetchTopWicketTakers } from '../lib/supabase';

const PODIUM_COLORS = ['bg-amber-500', 'bg-slate-400', 'bg-amber-700'];
const PODIUM_LABELS = ['🥇', '🥈', '🥉'];

export default function Leaderboard() {
  const [runs, setRuns] = useState([]);
  const [wickets, setWickets] = useState([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    Promise.all([fetchTopRunScorers(), fetchTopWicketTakers()])
      .then(([r, w]) => { setRuns(r || []); setWickets(w || []); })
      .catch((e) => setErr(e.message));
  }, []);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Leaderboard</h1>

      {err && <p className="text-red-400 text-sm">{err}</p>}

      {/* Top Run Scorers */}
      <section>
        <h2 className="text-lg font-bold text-cyan-400 mb-4">🏏 Top Run Scorers</h2>
        <Podium data={runs.slice(0, 3)} valueKey="total_runs" labelKey="name" />
        {runs.length > 3 && (
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 uppercase text-xs border-b border-slate-700">
                  <th className="text-left py-2 px-4">#</th>
                  <th className="text-left py-2 px-4">Player</th>
                  <th className="text-right py-2 px-4">Runs</th>
                  <th className="text-right py-2 px-4">Inns</th>
                  <th className="text-right py-2 px-4">High</th>
                  <th className="text-right py-2 px-4">Avg</th>
                </tr>
              </thead>
              <tbody>
                {runs.slice(3).map((p, i) => (
                  <tr key={p.player_id} className="border-b border-slate-800 hover:bg-slate-750">
                    <td className="py-2 px-4 text-slate-500">{i + 4}</td>
                    <td className="py-2 px-4 font-medium">{p.name}</td>
                    <td className="py-2 px-4 text-right font-bold text-cyan-400">{p.total_runs}</td>
                    <td className="py-2 px-4 text-right text-slate-400">{p.innings_played}</td>
                    <td className="py-2 px-4 text-right">{p.highest_score}</td>
                    <td className="py-2 px-4 text-right">{p.average || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {runs.length === 0 && <p className="text-slate-500 text-sm">No data yet.</p>}
      </section>

      {/* Top Wicket Takers */}
      <section>
        <h2 className="text-lg font-bold text-amber-400 mb-4">🎯 Top Wicket Takers</h2>
        <Podium data={wickets.slice(0, 3)} valueKey="wickets" labelKey="name" medal />
        {wickets.length > 3 && (
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 uppercase text-xs border-b border-slate-700">
                  <th className="text-left py-2 px-4">#</th>
                  <th className="text-left py-2 px-4">Player</th>
                  <th className="text-right py-2 px-4">Wkts</th>
                  <th className="text-right py-2 px-4">Inns</th>
                  <th className="text-right py-2 px-4">Runs</th>
                  <th className="text-right py-2 px-4">Avg</th>
                </tr>
              </thead>
              <tbody>
                {wickets.slice(3).map((p, i) => (
                  <tr key={p.player_id} className="border-b border-slate-800 hover:bg-slate-750">
                    <td className="py-2 px-4 text-slate-500">{i + 4}</td>
                    <td className="py-2 px-4 font-medium">{p.name}</td>
                    <td className="py-2 px-4 text-right font-bold text-amber-400">{p.wickets}</td>
                    <td className="py-2 px-4 text-right text-slate-400">{p.innings_bowled}</td>
                    <td className="py-2 px-4 text-right">{p.runs_conceded}</td>
                    <td className="py-2 px-4 text-right">{p.average || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {wickets.length === 0 && <p className="text-slate-500 text-sm">No data yet.</p>}
      </section>
    </div>
  );
}

// ── Podium component ────────────────────────────

function Podium({ data, valueKey, labelKey, medal }) {
  if (data.length === 0) return null;

  // Reorder for podium display: 2nd, 1st, 3rd
  const order = data.length >= 3
    ? [data[1], data[0], data[2]]
    : data.length === 2
    ? [data[1], data[0]]
    : [data[0]];

  const heights = data.length >= 3 ? ['h-20', 'h-28', 'h-16'] : data.length === 2 ? ['h-20', 'h-28'] : ['h-28'];

  const winner = data[0];

  return (
    <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
      {/* Winner highlight */}
      {winner && (
        <div className="text-center mb-6">
          <span className="text-4xl">{medal ? '🏆' : '👑'}</span>
          <p className="text-lg font-bold mt-1">{winner[labelKey]}</p>
          <p className="text-2xl font-black text-cyan-400">{winner[valueKey]}</p>
        </div>
      )}

      {/* Podium bars */}
      <div className="flex items-end justify-center gap-4 h-32">
        {order.map((p, i) => {
          const realIdx = data.indexOf(p);
          const pct = data.length > 1 ? p[valueKey] / data[0][valueKey] : 1;
          return (
            <div key={p.player_id} className="flex flex-col items-center gap-1">
              <span className="text-xs font-semibold text-slate-300">{p[labelKey]}</span>
              <div
                className={`w-16 rounded-t-lg ${PODIUM_COLORS[realIdx] || 'bg-slate-600'} flex items-center justify-center text-white font-bold`}
                style={{ height: `${Math.max(pct * 100, 30)}px` }}
              >
                {p[valueKey]}
              </div>
              <span className="text-xs">{PODIUM_LABELS[realIdx] || ''}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
