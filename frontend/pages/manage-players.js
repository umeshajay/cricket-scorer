import { useState, useEffect } from 'react';
import { fetchPlayers, addPlayer, deletePlayer } from '../lib/supabase';

export default function ManagePlayers() {
  const [players, setPlayers] = useState([]);
  const [name, setName] = useState('');
  const [err, setErr] = useState('');

  const load = () => fetchPlayers().then(setPlayers).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setErr('');
    try {
      await addPlayer(name.trim());
      setName('');
      await load();
    } catch (e) { setErr(e.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this player?')) return;
    try {
      await deletePlayer(id);
      await load();
    } catch (e) { setErr(e.message); }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">Players</h1>

      <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm flex gap-3 items-end">
        <div className="flex-1">
          <label className="text-xs text-gray-500 block mb-1">Player name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-cyan-500"
            placeholder="Enter name..."
          />
        </div>
        <button onClick={handleAdd} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold text-sm transition shadow-sm whitespace-nowrap">
          + Add
        </button>
      </div>

      {err && <p className="text-red-500 text-sm">{err}</p>}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {players.length === 0 ? (
          <p className="p-5 text-gray-400 text-sm">No players yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {players.map((p, i) => (
              <li key={p.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 text-xs w-5">{i + 1}.</span>
                  <span className="font-medium text-gray-800">{p.name}</span>
                </div>
                <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-600 text-xs font-medium">
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
