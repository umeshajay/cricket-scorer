import Link from 'next/link';

export default function SetupMatch() {
  return (
    <div className="max-w-lg mx-auto space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">New Match</h1>

      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm space-y-4">
        <div className="text-center">
          <div className="text-4xl mb-3">🏏</div>
          <h2 className="text-lg font-semibold text-gray-800">Create & Score from this Website</h2>
          <p className="text-sm text-gray-500 mt-1">
            Everything runs on GitHub — no external services needed.
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
          <p className="font-medium text-gray-700">How to create a match:</p>
          <ol className="list-decimal list-inside text-gray-600 space-y-1">
            <li>Go to <Link href="/scorer" className="text-cyan-600 underline">Scorer page</Link></li>
            <li>Enter your GitHub PAT (saved locally, needed once)</li>
            <li>Select a match or create one using <code className="bg-gray-200 px-1.5 py-0.5 rounded text-xs">/create</code> format</li>
            <li>Tap buttons to score — data saves instantly to GitHub</li>
          </ol>
        </div>

        <div className="text-xs text-gray-400 text-center">
          Dashboard auto-refreshes from the raw GitHub data file.
        </div>
      </div>

      <div className="flex gap-3 justify-center">
        <Link href="/scorer" className="bg-cyan-500 hover:bg-cyan-600 text-white px-5 py-2 rounded-lg font-semibold text-sm transition shadow-sm">
          Go to Scorer
        </Link>
        <Link href="/dashboard" className="text-cyan-600 hover:underline text-sm font-medium self-center">
          Live Score →
        </Link>
      </div>
    </div>
  );
}
