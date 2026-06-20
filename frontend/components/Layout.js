import Link from 'next/link';
import { useRouter } from 'next/router';

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/manage-players', label: 'Players' },
  { href: '/setup-match', label: 'New Match' },
  { href: '/dashboard', label: 'Live Score' },
  { href: '/leaderboard', label: 'Leaderboard' },
];

export default function Layout({ children }) {
  const { pathname } = useRouter();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center gap-6 flex-wrap">
        <span className="text-cyan-400 font-bold text-lg tracking-tight">🏏 Cricket Scorer</span>
        <nav className="flex gap-4 text-sm">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`transition-colors ${
                pathname === n.href
                  ? 'text-cyan-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="flex-1 px-4 py-6 max-w-5xl w-full mx-auto">{children}</main>

      <footer className="text-center text-slate-600 text-xs py-4 border-t border-slate-800">
        Cricket Scorer &mdash; Supabase + Telegram
      </footer>
    </div>
  );
}
