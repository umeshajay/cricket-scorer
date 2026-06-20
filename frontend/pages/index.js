import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchMatches } from '../lib/api';

const statusBadge = (s) => {
  const m = {
    upcoming: 'bg-blue-100 text-blue-700',
    ongoing: 'bg-green-100 text-green-700',
    completed: 'bg-gray-100 text-gray-500'
  };
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
      <div className="text-center py-8">
        <h1 className="text-3xl font-bold text-gray-900">Cricket Scorer</h1>
        <div className="flex gap-3 justify-center mt-4">
          <Link href="/setup-match" className="bg-cyan-500 hover:bg-cyan-600 text-white px-5 py-2 rounded-lg font-semibold transition shadow-sm">
            New Match
          </Link>
          <Link href="/dashboard" className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-lg font-semibold transition shadow-sm">
            Live Score
          </Link>
          <Link href="/leaderboard" className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2 rounded-lg font-semibold transition shadow-sm">
            Leaderboard
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Recent Matches</h2>
        {err && <p className="text-red-500 text-sm">{err}</p>}
        {!err && matches.length === 0 && (
          <p className="text-gray-400 text-sm">No matches yet. Create one!</p>
        )}
        {matches.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 uppercase text-xs border-b border-gray-200">
                  <th className="text-left py-2 pr-3">Match</th>
                  <th className="text-left py-2 pr-3">Teams</th>
                  <th className="text-left py-2 pr-3">Overs</th>
                  <th className="text-left py-2 pr-3">Status</th>
                  <th className="text-left py-2" />
                </tr>
              </thead>
              <tbody>
                {matches.map((m) => (
                  <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 pr-3 font-semibold">{m.match_id}</td>
                    <td className="py-2 pr-3 text-gray-600">{m.team_a_name} vs {m.team_b_name}</td>
                    <td className="py-2 pr-3 text-gray-600">{m.total_overs}</td>
                    <td className="py-2 pr-3">{statusBadge(m.status)}</td>
                    <td className="py-2">
                      <Link href={`/dashboard?match=${m.match_id}`} className="text-cyan-600 hover:underline text-xs font-medium">
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
