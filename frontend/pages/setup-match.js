import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { fetchPlayers, createMatch, fetchMatchById } from '../lib/supabase';

export default function SetupMatch() {
  const router = useRouter();
  const [allPlayers, setAllPlayers] = useState([]);
  const [form, setForm] = useState({ matchId: '', overs: '6', teamA: '', teamB: '' });
  const [teamA, setTeamA] = useState([]);
  const [teamB, setTeamB] = useState([]);
  const [msg, setMsg] = useState({ ok: false, text: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => { fetchPlayers().then(setAllPlayers).catch(() => {}); }, []);

  const usedIds = new Set([...teamA.map((p) => p.id), ...teamB.map((p) => p.id)]);
  const available = allPlayers.filter((p) => !usedIds.has(p.id));

  const addTo = (team) => {
    const sel = document.getElementById('player-select');
    const pid = sel?.value;
    if (!pid) return;
    const p = allPlayers.find((x) => x.id === pid);
    if (!p) return;
    if (team === 'A') setTeamA((prev) => [...prev, p]);
    else setTeamB((prev) => [...prev, p]);
  };

  const removeFrom = (team, id) => {
    if (team === 'A') setTeamA((prev) => prev.filter((p) => p.id !== id));
    else setTeamB((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg({ ok: false, text: '' });
    if (!form.matchId || !form.teamA || !form.teamB) return setMsg({ ok: false, text: 'Fill all fields.' });
    if (teamA.length < 1 || teamB.length < 1) return setMsg({ ok: false, text: 'Each team needs at least one player.' });

    setBusy(true);
    try {
      const existing = await fetchMatchById(form.matchId);
      if (existing) {
        setMsg({ ok: false, text: 'Match ID already exists.' });
        setBusy(false);
        return;
      }
    } catch (_) {}

    try {
      await createMatch({
        match_id: form.matchId,
        total_overs: parseInt(form.overs),
        team_a_name: form.teamA,
        team_b_name: form.teamB,
        team_a_players: teamA.map((p) => p.id),
        team_b_players: teamB.map((p) => p.id),
        status: 'upcoming',
      });
      setMsg({ ok: true, text: `Match ${form.matchId} created!` });
      setForm({ matchId: '', overs: '6', teamA: '', teamB: '' });
      setTeamA([]);
      setTeamB([]);
    } catch (e) {
      setMsg({ ok: false, text: e.message });
    }
    setBusy(false);
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">New Match</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Match ID</label>
            <input value={form.matchId} onChange={(e) => setForm({ ...form, matchId: e.target.value })}
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-cyan-500"
              placeholder="M001" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Overs</label>
            <select value={form.overs} onChange={(e) => setForm({ ...form, overs: e.target.value })}
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-cyan-500">
              {[4, 5, 6, 7].map((o) => <option key={o} value={o}>{o} Overs</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Team A</label>
            <input value={form.teamA} onChange={(e) => setForm({ ...form, teamA: e.target.value })}
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-cyan-500"
              placeholder="Eagles" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Team B</label>
            <input value={form.teamB} onChange={(e) => setForm({ ...form, teamB: e.target.value })}
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-cyan-500"
              placeholder="Hawks" />
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500 block mb-1">Assign Players</label>
          <div className="flex gap-2">
            <select id="player-select" className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-cyan-500">
              <option value="">-- Select --</option>
              {available.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button type="button" onClick={() => addTo('A')} className="bg-cyan-500 hover:bg-cyan-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition">→ A</button>
            <button type="button" onClick={() => addTo('B')} className="bg-cyan-500 hover:bg-cyan-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition">→ B</button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TeamBox name="Team A" players={teamA} color="cyan" onRemove={(id) => removeFrom('A', id)} />
          <TeamBox name="Team B" players={teamB} color="amber" onRemove={(id) => removeFrom('B', id)} />
        </div>

        <button type="submit" disabled={busy}
          className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white py-3 rounded-lg font-bold transition shadow-sm">
          {busy ? 'Creating…' : 'Create Match'}
        </button>
      </form>

      {msg.text && (
        <div className={`rounded-xl p-4 text-sm font-medium shadow-sm ${msg.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {msg.ok ? '✓ ' : '✗ '}{msg.text}
          {msg.ok && (
            <button onClick={() => router.push(`/dashboard?match=${form.matchId}`)} className="ml-3 underline font-semibold">
              Go to Live Score →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function TeamBox({ name, players, color, onRemove }) {
  const border = color === 'cyan' ? 'border-cyan-200' : 'border-amber-200';
  const chip = color === 'cyan' ? 'bg-cyan-100 text-cyan-700' : 'bg-amber-100 text-amber-700';
  return (
    <div className={`bg-gray-50 rounded-lg border ${border} p-3`}>
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold text-sm text-gray-700">{name}</h3>
        <span className="text-xs text-gray-400">{players.length} players</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {players.length === 0 && <span className="text-xs text-gray-400">No players added</span>}
        {players.map((p) => (
          <span key={p.id} className={`inline-flex items-center gap-1 ${chip} text-xs px-2 py-1 rounded-full`}>
            {p.name}
            <button type="button" onClick={() => onRemove(p.id)} className="hover:opacity-70">&times;</button>
          </span>
        ))}
      </div>
    </div>
  );
}
