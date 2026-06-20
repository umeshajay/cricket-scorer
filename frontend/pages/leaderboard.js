import { useState, useEffect } from 'react';
import { fetchTopRunScorers, fetchTopWicketTakers } from '../lib/supabase';

const PODIUM_COLORS = ['bg-amber-400', 'bg-gray-300', 'bg-amber-700'];
const PODIUM_LABELS = ['1st', '2nd', '3rd'];

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
      <h1 className="text-2xl font-bold text-gray-900">Leaderboard</h1>

      {err && <p className="text-red-500 text-sm">{err}</p>}

      <section>
        <h2 className="text-lg font-bold text-cyan-600 mb-4">Top Run Scorers</h2>
        <Podium data={runs.slice(0, 3)} valueKey="total_runs" labelKey="name" />
        {runs.length > 3 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 uppercase text-xs border-b border-gray-200">
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
                  <tr key={p.player_id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-4 text-gray-400">{i + 4}</td>
                    <td className="py-2 px-4 font-medium text-gray-800">{p.name}</td>
                    <td className="py-2 px-4 text-right font-bold text-cyan-600">{p.total_runs}</td>
                    <td className="py-2 px-4 text-right text-gray-500">{p.innings_played}</td>
                    <td className="py-2 px-4 text-right text-gray-700">{p.highest_score}</td>
                    <td className="py-2 px-4 text-right text-gray-700">{p.average || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {runs.length === 0 && <p className="text-gray-400 text-sm">No data yet.</p>}
      </section>

      <section>
        <h2 className="text-lg font-bold text-amber-600 mb-4">Top Wicket Takers</h2>
        <Podium data={wickets.slice(0, 3)} valueKey="wickets" labelKey="name" />
        {wickets.length > 3 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 uppercase text-xs border-b border-gray-200">
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
                  <tr key={p.player_id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-4 text-gray-400">{i + 4}</td>
                    <td className="py-2 px-4 font-medium text-gray-800">{p.name}</td>
                    <td className="py-2 px-4 text-right font-bold text-amber-600">{p.wickets}</td>
                    <td className="py-2 px-4 text-right text-gray-500">{p.innings_bowled}</td>
                    <td className="py-2 px-4 text-right text-gray-700">{p.runs_conceded}</td>
                    <td className="py-2 px-4 text-right text-gray-700">{p.average || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {wickets.length === 0 && <p className="text-gray-400 text-sm">No data yet.</p>}
      </section>
    </div>
  );
}

function Podium({ data, valueKey, labelKey }) {
  if (data.length === 0) return null;

  const order = data.length >= 3
    ? [data[1], data[0], data[2]]
    : data.length === 2
    ? [data[1], data[0]]
    : [data[0]];

  const winner = data[0];

  return (
    <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
      {winner && (
        <div className="text-center mb-6">
          <span className="text-4xl">👑</span>
          <p className="text-lg font-bold text-gray-900 mt-1">{winner[labelKey]}</p>
          <p className="text-2xl font-black text-cyan-600">{winner[valueKey]}</p>
        </div>
      )}

      <div className="flex items-end justify-center gap-4 h-32">
        {order.map((p, i) => {
          const realIdx = data.indexOf(p);
          const pct = data.length > 1 ? p[valueKey] / data[0][valueKey] : 1;
          return (
            <div key={p.player_id} className="flex flex-col items-center gap-1">
              <span className="text-xs font-semibold text-gray-600">{p[labelKey]}</span>
              <div
                className={`w-16 rounded-t-lg ${PODIUM_COLORS[realIdx] || 'bg-gray-400'} flex items-center justify-center text-white font-bold shadow-sm`}
                style={{ height: `${Math.max(pct * 100, 30)}px` }}
              >
                {p[valueKey]}
              </div>
              <span className="text-xs text-gray-500">{PODIUM_LABELS[realIdx] || ''}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
