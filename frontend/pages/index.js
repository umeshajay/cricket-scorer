import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchMatches } from '../lib/supabase';

const statusBadge = (s) => {
  const m = { upcoming: 'bg-blue-900 text-blue-300', ongoing: 'bg-green-900 text-green-300', completed: 'bg-slate-700 text-slate-300' };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${m[s] || m.upcoming}`}>{s}</span>;
};

export default function Home() {
  const [matches, setMatches] = useState([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    fetchMatches()
      .then(setMatches)
      .catch((e) => setErr(e.message));
  }, []);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="text-center py-8">
        <h1 className="text-3xl font-bold">Cricket Scorer</h1>
        <div className="flex gap-3 justify-center mt-4">
          <Link href="/setup-match" className="bg-cyan-600 hover:bg-cyan-500 text-white px-5 py-2 rounded-lg font-semibold transition">
            New Match
          </Link>
          <Link href="/dashboard" className="bg-green-700 hover:bg-green-600 text-white px-5 py-2 rounded-lg font-semibold transition">
            Live Score
          </Link>
          <Link href="/leaderboard" className="bg-amber-700 hover:bg-amber-600 text-white px-5 py-2 rounded-lg font-semibold transition">
            Leaderboard
          </Link>
        </div>
      </div>

      {/* Recent matches */}
      <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
        <h2 className="text-lg font-semibold mb-3">Recent Matches</h2>
        {err && <p className="text-red-400 text-sm">{err}</p>}
        {!err && matches.length === 0 && (
          <p className="text-slate-500 text-sm">No matches yet. Create one!</p>
        )}
        {matches.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 uppercase text-xs border-b border-slate-700">
                  <th className="text-left py-2 pr-3">Match</th>
                  <th className="text-left py-2 pr-3">Teams</th>
                  <th className="text-left py-2 pr-3">Overs</th>
                  <th className="text-left py-2 pr-3">Status</th>
                  <th className="text-left py-2" />
                </tr>
              </thead>
              <tbody>
                {matches.map((m) => (
                  <tr key={m.id} className="border-b border-slate-800 hover:bg-slate-750">
                    <td className="py-2 pr-3 font-semibold">{m.match_id}</td>
                    <td className="py-2 pr-3">{m.team_a_name} vs {m.team_b_name}</td>
                    <td className="py-2 pr-3">{m.total_overs}</td>
                    <td className="py-2 pr-3">{statusBadge(m.status)}</td>
                    <td className="py-2">
                      <Link href={`/dashboard?match=${m.match_id}`} className="text-cyan-400 hover:underline text-xs">
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
