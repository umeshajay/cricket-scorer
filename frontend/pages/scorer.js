import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchMatches, fetchMatchById, createMatch, insertBall, deleteBall, fetchInnings, fetchBalls, updateInnings, hasGitHubSettings, syncToGitHub, getMatchShareUrl, getGitHubSettings, setGitHubSettings } from '../lib/api';

const btn = (text, cb, cls = 'bg-gray-50') => (
  <button key={text} onClick={cb} className={`${cls} text-gray-800 font-bold text-xl rounded-xl py-4 px-2 shadow-sm active:scale-95 transition border border-gray-200`}>{text}</button>
);

export default function Scorer() {
  const [matches, setMatches] = useState([]);
  const [selMid, setSelMid] = useState('');
  const [match, setMatch] = useState(null);
  const [innings, setInnings] = useState([]);
  const [balls, setBalls] = useState([]);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ matchId: '', overs: '5', teamA: 'Team A', teamB: 'Team B' });
  const [showShare, setShowShare] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsToken, setSettingsToken] = useState('');
  const [settingsRepo, setSettingsRepo] = useState('');

  const load = async () => {
    const m = await fetchMatches();
    setMatches(m);
    if (m.length > 0 && !selMid) setSelMid(m[0].match_id);
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!selMid) { setMatch(null); setInnings([]); setBalls([]); return; }
    (async () => {
      setMatch(await fetchMatchById(selMid));
      setInnings(await fetchInnings(selMid));
      setBalls(await fetchBalls(selMid));
    })();
  }, [selMid]);

  useEffect(() => {
    const s = getGitHubSettings();
    setSettingsToken(s.token);
    setSettingsRepo(s.repo);
  }, []);

  const refresh = async () => {
    if (!selMid) return;
    setMatch(await fetchMatchById(selMid));
    setInnings(await fetchInnings(selMid));
    setBalls(await fetchBalls(selMid));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createForm.matchId || !createForm.teamA || !createForm.teamB) { setMsg('Fill all fields'); return; }
    setBusy(true);
    try {
      await createMatch({
        match_id: createForm.matchId.toUpperCase(),
        total_overs: parseInt(createForm.overs),
        team_a_name: createForm.teamA,
        team_b_name: createForm.teamB,
        players_per_team: 5,
        status: 'ongoing',
      });
      setMsg(`Match ${createForm.matchId.toUpperCase()} created!`);
      setShowCreate(false);
      await load();
      setSelMid(createForm.matchId.toUpperCase());
    } catch (e) { setMsg(e.message); }
    setBusy(false);
  };

  const nextBall = (inc) => {
    const b = balls.filter(b => b.match_id === selMid);
    if (!b.length) return [1, 1];
    const last = b.sort((a, bb) => Number(bb.id || 0) - Number(a.id || 0))[0];
    const ov = Math.floor(last.over_number || 0);
    const bn = last.ball_number || 0;
    if (inc === 0) return [(ov * 10 + bn) / 10, bn];
    if (bn >= 6) return [ov + 1, 1];
    return [ov, bn + 1];
  };

  const getInn = () => {
    return innings.find(i => i.match_id === selMid && i.innings_no === 1);
  };

  const doScore = async (fn) => {
    if (!match) return;
    setBusy(true);
    try {
      await fn();
      await refresh();
      setMsg('Saved ✓');
      // auto-sync to GitHub if configured
      if (hasGitHubSettings()) {
        try {
          await syncToGitHub();
        } catch { /* silent fail for auto-sync */ }
      }
    } catch (e) { setMsg('Error: ' + e.message); }
    setBusy(false);
  };

  const scoreRun = (runs) => doScore(async () => {
    const [ov, bn] = nextBall(1);
    const inn = getInn() || (await fetchInnings(selMid))[0];
    const ball = { over_number: ov, ball_number: bn, runs, extras: 0, extra_type: null, is_wicket: false, total_runs_ball: runs, innings_id: inn?.id || '' };
    await insertBall(selMid, ball);
    if (inn) await updateInnings(selMid, 1, { total_runs: (inn.total_runs || 0) + runs, total_balls: (inn.total_balls || 0) + 1 });
  });

  const scoreWide = (bat) => doScore(async () => {
    const [ov, bn] = nextBall(0);
    const inn = getInn() || (await fetchInnings(selMid))[0];
    const ball = { over_number: ov, ball_number: bn, runs: 0, extras: bat, extra_type: 'wide', is_wicket: false, total_runs_ball: bat, innings_id: inn?.id || '' };
    await insertBall(selMid, ball);
    if (inn) await updateInnings(selMid, 1, { total_runs: (inn.total_runs || 0) + bat, extras: (inn.extras || 0) + bat, total_balls: (inn.total_balls || 0) });
  });

  const scoreNoball = (bat) => doScore(async () => {
    const [ov, bn] = nextBall(0);
    const inn = getInn() || (await fetchInnings(selMid))[0];
    const ball = { over_number: ov, ball_number: bn, runs: bat, extras: 0, extra_type: 'noball', is_wicket: false, total_runs_ball: bat, innings_id: inn?.id || '' };
    await insertBall(selMid, ball);
    if (inn) await updateInnings(selMid, 1, { total_runs: (inn.total_runs || 0) + bat, total_balls: (inn.total_balls || 0) });
  });

  const scoreWicket = async (wkt) => doScore(async () => {
    const [ov, bn] = nextBall(1);
    const inn = getInn() || (await fetchInnings(selMid))[0];
    const ball = { over_number: ov, ball_number: bn, runs: 0, extras: 0, extra_type: null, is_wicket: true, wicket_type: wkt, total_runs_ball: 0, innings_id: inn?.id || '' };
    await insertBall(selMid, ball);
    if (inn) await updateInnings(selMid, 1, { total_wickets: (inn.total_wickets || 0) + 1, total_balls: (inn.total_balls || 0) + 1 });
  });

  const handleUndo = async () => {
    const b = balls.filter(b => b.match_id === selMid).sort((a, bb) => Number(bb.id || 0) - Number(a.id || 0));
    if (!b.length) { setMsg('No balls to undo'); return; }
    const last = b[0];
    await deleteBall(last.id);
    await refresh();
    const remaining = await fetchBalls(selMid);
    const inn = getInn();
    if (inn) {
      const tr = remaining.reduce((s, bb) => s + (bb.runs || 0) + (bb.extras || 0), 0);
      const tw = remaining.filter(bb => bb.is_wicket).length;
      const te = remaining.reduce((s, bb) => s + (bb.extras || 0), 0);
      const tb = remaining.filter(bb => bb.extra_type !== 'wide' && bb.extra_type !== 'noball').length;
      await updateInnings(selMid, 1, { total_runs: tr, total_wickets: tw, total_balls: tb, extras: te });
    }
    await refresh();
    setMsg('↩️ Undone');
  };

  const handleSaveSettings = () => {
    setGitHubSettings(settingsToken, settingsRepo);
    setMsg('Settings saved ✓');
    setShowSettings(false);
  };

  const shareUrl = selMid ? getMatchShareUrl(selMid) : '';

  const inn = getInn();
  const ovStr = inn ? `${Math.floor((inn.total_balls || 0) / 6)}.${(inn.total_balls || 0) % 6}` : '0.0';
  const ghOk = hasGitHubSettings();

  return (
    <div className="max-w-md mx-auto space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <select value={selMid} onChange={e => setSelMid(e.target.value)} className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500">
          <option value="">Select match</option>
          {matches.map(m => <option key={m.match_id} value={m.match_id}>{m.match_id} — {m.team_a_name} vs {m.team_b_name}</option>)}
        </select>
        <button onClick={refresh} className="bg-gray-100 border border-gray-300 px-3 py-2 rounded-lg text-sm" disabled={busy}>↻</button>
        <button onClick={() => setShowCreate(!showCreate)} className="bg-emerald-500 text-white px-3 py-2 rounded-lg text-sm font-medium">+ New</button>
        <button onClick={() => setShowSettings(!showSettings)} className="bg-gray-100 border border-gray-300 px-3 py-2 rounded-lg text-sm">{ghOk ? '⚙️✓' : '⚙️'}</button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm space-y-2">
          <input value={createForm.matchId} onChange={e => setCreateForm({ ...createForm, matchId: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Match ID (e.g. M001)" required />
          <div className="flex gap-2">
            <input value={createForm.teamA} onChange={e => setCreateForm({ ...createForm, teamA: e.target.value })} className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Team A" required />
            <input value={createForm.teamB} onChange={e => setCreateForm({ ...createForm, teamB: e.target.value })} className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Team B" required />
          </div>
          <select value={createForm.overs} onChange={e => setCreateForm({ ...createForm, overs: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
            {[3,4,5,6,7,8,9,10].map(o => <option key={o} value={o}>{o} Overs</option>)}
          </select>
          <button type="submit" disabled={busy} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg font-semibold text-sm">Create Match</button>
        </form>
      )}

      {showSettings && (
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm space-y-2">
          <h3 className="text-sm font-semibold text-gray-700">GitHub Sync Settings</h3>
          <input
            type="password"
            value={settingsToken}
            onChange={e => setSettingsToken(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
            placeholder="GitHub Token (ghp_...)"
          />
          <input
            type="text"
            value={settingsRepo}
            onChange={e => setSettingsRepo(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
            placeholder="Repo (username/repo)"
          />
          <div className="flex gap-2">
            <button onClick={handleSaveSettings} className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white py-2 rounded-lg text-sm font-medium">Save</button>
            <button onClick={() => setShowSettings(false)} className="flex-1 bg-gray-100 border border-gray-300 py-2 rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      {msg && <div className={`text-xs text-center ${msg.includes('Error') || msg.includes('Fill') ? 'text-red-500' : 'text-green-600'}`}>{msg}</div>}

      {match && inn && (
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm text-center">
          <div className="text-3xl font-black text-cyan-600">{inn.total_runs}/{inn.total_wickets}</div>
          <div className="text-xs text-gray-500">Over {ovStr}/{match.total_overs}.0 · Extras {inn.extras || 0}</div>
          <div className="text-sm font-semibold text-gray-700 mt-1">{match.team_a_name} vs {match.team_b_name}</div>
          {!ghOk && (
            <div className="mt-2 text-xs text-amber-600">
              Set ⚙️ GitHub token + repo above to share live
            </div>
          )}
        </div>
      )}

      {!match && !showCreate && (
        <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-sm text-center text-gray-400 text-sm">
          Select a match or create one.
        </div>
      )}

      {match && (
        <>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm space-y-2">
            <div className="font-semibold text-sm text-gray-500 mb-1">Runs</div>
            <div className="grid grid-cols-6 gap-2">
              {[[0,'0'],[1,'1'],[2,'2'],[3,'3'],[4,'4'],[6,'6']].map(([r, lbl]) => btn(lbl, () => scoreRun(r), r === 4 ? 'bg-blue-100' : r === 6 ? 'bg-purple-100' : 'bg-gray-50'))}
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm space-y-2">
            <div className="font-semibold text-sm text-gray-500 mb-1">Wide</div>
            <div className="grid grid-cols-4 gap-2">
              {btn('+0', () => scoreWide(0), 'bg-yellow-50')}{btn('+1', () => scoreWide(1), 'bg-yellow-50')}{btn('+2', () => scoreWide(2), 'bg-yellow-50')}{btn('+4', () => scoreWide(4), 'bg-yellow-50')}
            </div>
            <div className="font-semibold text-sm text-gray-500 mb-1">No-Ball</div>
            <div className="grid grid-cols-4 gap-2">
              {btn('+0', () => scoreNoball(0), 'bg-orange-50')}{btn('+1', () => scoreNoball(1), 'bg-orange-50')}{btn('+2', () => scoreNoball(2), 'bg-orange-50')}{btn('+4', () => scoreNoball(4), 'bg-orange-50')}
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm space-y-2">
            <div className="font-semibold text-sm text-gray-500 mb-1">Wicket</div>
            <div className="grid grid-cols-3 gap-2">
              {[['Bowled','bowled'],['Caught','caught'],['Run Out','run_out'],['LBW','lbw'],['Stumped','stumped']].map(([lbl, val]) => btn(lbl, () => scoreWicket(val), 'bg-red-50'))}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={handleUndo} className="flex-1 bg-gray-100 border border-gray-300 rounded-xl py-3 text-sm font-medium active:scale-95 transition">↩️ Undo Last Ball</button>
            <button onClick={() => { localStorage.removeItem('cricket_scorer_data'); setMsg('All data cleared!'); load(); setSelMid(''); }} className="flex-1 bg-red-50 border border-red-200 text-red-600 rounded-xl py-3 text-sm font-medium active:scale-95 transition">🗑 Clear All</button>
          </div>

          <div className="flex gap-2">
            {ghOk && (
              <button onClick={() => { syncToGitHub().then(() => setMsg('Synced to GitHub ✓')).catch(e => setMsg('Sync error: ' + e.message)); }} className="flex-1 bg-cyan-50 border border-cyan-200 text-cyan-600 rounded-xl py-3 text-sm font-medium active:scale-95 transition">
                ☁️ Sync Now
              </button>
            )}
            <button onClick={() => setShowShare(!showShare)} className={`flex-1 rounded-xl py-3 text-sm font-medium active:scale-95 transition ${ghOk ? 'bg-emerald-50 border border-emerald-200 text-emerald-600' : 'bg-gray-100 border border-gray-300 text-gray-400'}`}>
              📱 Share
            </button>
          </div>

          {showShare && (
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm space-y-2">
              <h3 className="text-sm font-semibold text-gray-700">Share Live Match</h3>
              {ghOk ? (
                <>
                  <p className="text-xs text-gray-500">Send this link to friends to watch live:</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={shareUrl}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50"
                      onClick={e => e.target.select()}
                    />
                    <button
                      onClick={() => { navigator.clipboard.writeText(shareUrl); setMsg('Link copied!'); }}
                      className="bg-cyan-500 hover:bg-cyan-600 text-white px-3 py-2 rounded-lg text-sm"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="text-xs text-gray-400">
                    Opens the Live Score dashboard for this match. Data syncs automatically to GitHub after each ball.
                  </p>
                </>
              ) : (
                <p className="text-xs text-amber-600">
                  Configure your GitHub Token and Repo in ⚙️ settings above to enable sharing.
                </p>
              )}
            </div>
          )}
        </>
      )}

      <div className="text-center">
        <Link href="/dashboard" className="text-cyan-600 hover:underline text-xs font-medium">View Live Dashboard →</Link>
      </div>
    </div>
  );
}
