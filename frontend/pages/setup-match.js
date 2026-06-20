import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function SetupMatch() {
  return (
    <div className="max-w-lg mx-auto space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">New Match</h1>

      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm space-y-4">
        <div className="text-center">
          <div className="text-4xl mb-3">🤖</div>
          <p className="text-sm text-gray-500 mt-1">
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
          <p className="font-medium text-gray-700">Instructions:</p>
          <ol className="list-decimal list-inside text-gray-600 space-y-1">
            <li>Send: <code className="bg-gray-200 px-1.5 py-0.5 rounded text-xs">/create M001 5 Eagles vs Hawks</code></li>
            <li>Then: <code className="bg-gray-200 px-1.5 py-0.5 rounded text-xs">/match M001</code> to start scoring</li>
          </ol>
        </div>

        <div className="text-xs text-gray-400 text-center">
          After scoring, data auto-syncs to this website within 2 minutes.
        </div>
      </div>

      <div className="text-center">
        <Link href="/dashboard" className="text-cyan-600 hover:underline text-sm font-medium">
          Go to Live Score →
        </Link>
      </div>
    </div>
  );
}
