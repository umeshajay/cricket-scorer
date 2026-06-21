import { useState, useEffect } from 'react';
import { getGitHubSettings, setGitHubSettings, syncToGitHub, syncFromGitHub, getDataRawUrl, getMatchShareUrl, fetchMatches } from '../lib/api';

export default function SettingsPage() {
  const [token, setToken] = useState('');
  const [repo, setRepo] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const s = getGitHubSettings();
    setToken(s.token);
    setRepo(s.repo);
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setGitHubSettings(token, repo);
    setMsg('Settings saved ✓');
  };

  const handleSyncUp = async () => {
    setBusy(true);
    try {
      await syncToGitHub();
      setMsg('Data synced to GitHub ✓');
    } catch (e) {
      setMsg('Sync failed: ' + e.message);
    }
    setBusy(false);
  };

  const handleSyncDown = async () => {
    setBusy(true);
    try {
      await syncFromGitHub();
      setMsg('Data pulled from GitHub ✓');
    } catch (e) {
      setMsg('Pull failed: ' + e.message);
    }
    setBusy(false);
  };

  const rawUrl = getDataRawUrl();

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      <form onSubmit={handleSave} className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">GitHub Personal Access Token</label>
          <input
            type="password"
            value={token}
            onChange={e => setToken(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
            placeholder="ghp_..."
          />
          <p className="text-xs text-gray-400 mt-1">Needs <code>repo</code> scope. Stored only in your browser.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">GitHub Repository</label>
          <input
            type="text"
            value={repo}
            onChange={e => setRepo(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
            placeholder="username/repo-name"
          />
          <p className="text-xs text-gray-400 mt-1">The repo where match data will be synced.</p>
        </div>

        <button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-600 text-white py-2 rounded-lg font-semibold text-sm transition">
          Save Settings
        </button>
      </form>

      {msg && <div className={`text-xs text-center ${msg.includes('fail') ? 'text-red-500' : 'text-green-600'}`}>{msg}</div>}

      <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">Sync</h2>
        <div className="flex gap-2">
          <button onClick={handleSyncUp} disabled={busy} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium transition">
            Push to GitHub
          </button>
          <button onClick={handleSyncDown} disabled={busy} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2 rounded-lg text-sm font-medium transition">
            Pull from GitHub
          </button>
        </div>

        {rawUrl && (
          <div className="bg-gray-50 rounded-lg p-3 text-xs">
            <p className="font-medium text-gray-600 mb-1">Raw data URL:</p>
            <code className="break-all text-gray-500">{rawUrl}</code>
          </div>
        )}
      </div>
    </div>
  );
}
