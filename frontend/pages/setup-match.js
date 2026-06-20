import Link from 'next/link';

export default function SetupMatch() {
  return (
    <div className="max-w-lg mx-auto space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">How to Score</h1>

      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm space-y-4">
        <p className="text-sm text-gray-600">
        </p>

        <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-3">
          <p className="font-medium text-gray-700">Quick start:</p>
          <ol className="list-decimal list-inside text-gray-600 space-y-2">
            <li>Go to <Link href="/scorer" className="text-cyan-600 underline">Scorer page</Link></li>
            <li>Tap <strong>+ New</strong>, type a Match ID and team names, pick overs</li>
            <li>Tap run buttons (0,1,2,3,4,6) or extras/wickets to score</li>
          </ol>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
          ⚠ Data is saved in your browser (localStorage). It stays on THIS device. Clearing browser data will lose scores.
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
