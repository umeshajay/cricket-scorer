import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { fetchPlayers, fetchMatches, createMatch, fetchMatchById, fetchSetting, upsertSetting } from '../lib/supabase';

const PIN_KEY = 'scorer_authenticated';

export default function SetupMatch() {
  const router = useRouter();
  const today = new Date();
  const dateStr = `${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}${String(today.getDate()).padStart(2,'0')}`;
  const [allPlayers, setAllPlayers] = useState([]);
  const [form, setForm] = useState({ matchId: `${dateStr}/1`, overs: '6', teamA: 'Team A', teamB: 'Team B' });
  const [playersPerTeam, setPlayersPerTeam] = useState(5);
  const [teamA, setTeamA] = useState([]);
  const [teamB, setTeamB] = useState([]);
  const [msg, setMsg] = useState({ ok: false, text: '' });
  const [busy, setBusy] = useState(false);
  const [authed, setAuthed] = useState(null);
  const [pinInput, setPinInput] = useState('');
  const [pinErr, setPinErr] = useState('');
  const [showPlayers, setShowPlayers] = useState(false);

  useEffect(() => {
    const fallback = setTimeout(() => { if (authed === null) setAuthed(true); }, 200);
    if (sessionStorage.getItem(PIN_KEY)) {
      clearTimeout(fallback);
      setAuthed(true);
    } else {
      fetchSetting('scorer_pin').then((pin) => {
        clearTimeout(fallback);
        if (!pin) setAuthed('setup');
        else setAuthed(false);
      }).catch(() => {
        clearTimeout(fallback);
        setAuthed(true);
      });
    }
    return () => clearTimeout(fallback);
  }, []);

  useEffect(() => {
    if (authed !== true) return;
    fetchPlayers().then(setAllPlayers).catch(() => {});
    // set a default match ID immediately, then try to find the next number from DB
    setForm((prev) => ({ ...prev, matchId: `${dateStr}/1` }));
    fetchMatches().then((list) => {
      const prefix = `${dateStr}/`;
      const nums = list.filter((m) => m.match_id?.startsWith(prefix)).map((m) => parseInt(m.match_id.slice(prefix.length), 10) || 0);
      const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
      setForm((prev) => ({ ...prev, matchId: `${dateStr}/${next}` }));
    }).catch(() => {});
  }, [authed]);

  const handlePinSubmit = async () => {
    setPinErr('');
    const pin = await fetchSetting('scorer_pin').catch(() => null);
    if (!pin) {
      setPinErr('No PIN configured. Contact admin.');
      return;
    }
    if (pinInput.trim() !== pin) {
      setPinErr('Incorrect PIN');
      return;
    }
    sessionStorage.setItem(PIN_KEY, '1');
    setAuthed(true);
  };

  const handleSetupPin = async () => {
    if (pinInput.trim().length < 3) {
      setPinErr('PIN must be at least 3 characters');
      return;
    }
    try {
      await upsertSetting('scorer_pin', pinInput.trim());
      sessionStorage.setItem(PIN_KEY, '1');
      setAuthed(true);
    } catch {
      setPinErr('Failed to save PIN');
    }
  };

  const usedIds = new Set([...teamA.map((p) => p.id), ...teamB.map((p) => p.id)]);
  const available = allPlayers.filter((p) => !usedIds.has(p.id));

  const addTo = (team) => {
    const sel = document.getElementById('player-select');
    const pid = sel?.value;
    if (!pid) return;
    const p = allPlayers.find((x) => x.id === pid);
    if (!p) return;
    if (team === 'A') {
      if (teamA.length >= playersPerTeam) return;
      setTeamA((prev) => [...prev, p]);
    } else {
      if (teamB.length >= playersPerTeam) return;
      setTeamB((prev) => [...prev, p]);
    }
  };

  const removeFrom = (team, id) => {
    if (team === 'A') setTeamA((prev) => prev.filter((p) => p.id !== id));
    else setTeamB((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg({ ok: false, text: '' });
    if (!form.matchId || !form.teamA || !form.teamB) return setMsg({ ok: false, text: 'Fill all fields.' });

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
        players_per_team: playersPerTeam,
        status: 'upcoming',
      });
      setMsg({ ok: true, text: `Match ${form.matchId} created!` });
      setForm({ overs: '6', teamA: 'Team A', teamB: 'Team B', matchId: `${dateStr}/1` });
      setTeamA([]);
      setTeamB([]);
      // regenerate next match ID
      fetchMatches().then((list) => {
        const nums = list.filter((m) => m.match_id?.startsWith(`${dateStr}/`)).map((m) => parseInt(m.match_id.slice(dateStr.length+1), 10) || 0);
        const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
        setForm((prev) => ({ ...prev, matchId: `${dateStr}/${next}` }));
      }).catch(() => {});
    } catch (e) {
      setMsg({ ok: false, text: e.message });
    }
    setBusy(false);
  };

  if (authed === null) return null;

  if (authed === 'setup') {
    return (
      <div className="max-w-sm mx-auto mt-12">
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Set Scorer PIN</h1>
          <p className="text-sm text-gray-500 mb-4">Create a PIN to restrict match creation.</p>
          <input value={pinInput} onChange={(e) => setPinInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSetupPin()}
            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-center text-gray-700 focus:outline-none focus:border-cyan-500 mb-3"
            placeholder="Enter a PIN" type="password" />
          {pinErr && <p className="text-red-500 text-xs mb-3">{pinErr}</p>}
          <button onClick={handleSetupPin} className="bg-cyan-500 hover:bg-cyan-600 text-white px-5 py-2 rounded-lg font-semibold text-sm transition shadow-sm w-full">
            Set PIN
          </button>
        </div>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="max-w-sm mx-auto mt-12">
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Scorer PIN Required</h1>
          <p className="text-sm text-gray-500 mb-4">Enter the scorer PIN to create a match.</p>
          <input value={pinInput} onChange={(e) => setPinInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()}
            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-center text-gray-700 focus:outline-none focus:border-cyan-500 mb-3"
            placeholder="PIN" type="password" />
          {pinErr && <p className="text-red-500 text-xs mb-3">{pinErr}</p>}
          <button onClick={handlePinSubmit} className="bg-cyan-500 hover:bg-cyan-600 text-white px-5 py-2 rounded-lg font-semibold text-sm transition shadow-sm w-full">
            Unlock
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">New Match</h1>
        <button onClick={() => { sessionStorage.removeItem(PIN_KEY); setAuthed(false); }}
          className="text-xs text-gray-400 hover:text-gray-600">Lock</button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Match ID</label>
            <input value={form.matchId} readOnly
              className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
              placeholder="Auto-generated" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Overs</label>
            <select value={form.overs} onChange={(e) => setForm({ ...form, overs: e.target.value })}
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-cyan-500">
              {[4, 5, 6, 7].map((o) => <option key={o} value={o}>{o} Overs</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Players per Team</label>
            <select value={playersPerTeam} onChange={(e) => setPlayersPerTeam(Number(e.target.value))}
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-cyan-500">
              {[3, 4, 5, 6, 7, 8, 9, 10, 11].map((n) => <option key={n} value={n}>{n} players</option>)}
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
          <button type="button" onClick={() => setShowPlayers(!showPlayers)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition">
            <span>{showPlayers ? '▼' : '▶'}</span>
            Assign Players <span className="text-xs text-gray-400">(optional)</span>
          </button>
        </div>

        {showPlayers && (<>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Assign Players</label>
          <div className="flex gap-2">
            <select id="player-select" className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-cyan-500">
              <option value="">-- Select --</option>
              {available.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button type="button" onClick={() => addTo('A')}
              disabled={teamA.length >= playersPerTeam}
              className="bg-cyan-500 hover:bg-cyan-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg text-sm font-medium transition">→ A</button>
            <button type="button" onClick={() => addTo('B')}
              disabled={teamB.length >= playersPerTeam}
              className="bg-cyan-500 hover:bg-cyan-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg text-sm font-medium transition">→ B</button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TeamBox name="Team A" players={teamA} max={playersPerTeam} color="cyan" onRemove={(id) => removeFrom('A', id)} />
          <TeamBox name="Team B" players={teamB} max={playersPerTeam} color="amber" onRemove={(id) => removeFrom('B', id)} />
        </div>
        </>)}

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

function TeamBox({ name, players, max, color, onRemove }) {
  const border = color === 'cyan' ? 'border-cyan-200' : 'border-amber-200';
  const chip = color === 'cyan' ? 'bg-cyan-100 text-cyan-700' : 'bg-amber-100 text-amber-700';
  const full = players.length >= max;
  return (
    <div className={`bg-gray-50 rounded-lg border ${border} p-3 ${full ? 'ring-2 ring-emerald-300' : ''}`}>
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold text-sm text-gray-700">{name}</h3>
        <span className={`text-xs ${full ? 'text-emerald-600 font-semibold' : 'text-gray-400'}`}>
          {players.length}/{max} players
        </span>
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
