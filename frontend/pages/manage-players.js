import { useState, useEffect } from 'react';
import { fetchPlayers } from '../lib/api';

export default function ManagePlayers() {
  const [players, setPlayers] = useState([]);
  const [err, setErr] = useState('');

  const load = () => fetchPlayers().then(setPlayers).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">Players</h1>

      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
        Players are read-only on this page. To add/remove, edit <code className="bg-yellow-100 px-1 rounded">bot/data.json</code> directly in the GitHub repo.
      </div>

      {err && <p className="text-red-500 text-sm">{err}</p>}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {players.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-8">No players yet.</p>
        )}
        {players.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500">
                <th className="px-4 py-2 font-medium">#</th>
                <th className="px-4 py-2 font-medium">Name</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p, i) => (
                <tr key={p.id} className="border-t border-gray-100">
                  <td className="px-4 py-2 text-gray-400">{i + 1}</td>
                  <td className="px-4 py-2 text-gray-700">{p.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
