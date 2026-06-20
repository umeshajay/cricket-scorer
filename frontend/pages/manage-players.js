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
      <h1 className="text-2xl font-bold">Players</h1>

      {/* Add */}
      <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 flex gap-3 items-end">
        <div className="flex-1">
          <label className="text-xs text-slate-400 block mb-1">Player name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
            placeholder="Enter name..."
          />
        </div>
        <button onClick={handleAdd} className="bg-green-700 hover:bg-green-600 px-4 py-2 rounded-lg font-semibold text-sm transition whitespace-nowrap">
          + Add
        </button>
      </div>

      {err && <p className="text-red-400 text-sm">{err}</p>}

      {/* List */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        {players.length === 0 ? (
          <p className="p-5 text-slate-500 text-sm">No players yet.</p>
        ) : (
          <ul className="divide-y divide-slate-700">
            {players.map((p, i) => (
              <li key={p.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-750">
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 text-xs w-5">{i + 1}.</span>
                  <span className="font-medium">{p.name}</span>
                </div>
                <button onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-300 text-xs font-medium">
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
