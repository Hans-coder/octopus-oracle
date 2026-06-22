import Link from 'next/link';
import { Home, CalendarDays, BarChart3 } from 'lucide-react';

const links = [
  { href: '/', label: '首頁', icon: Home },
  { href: '/matches', label: '賽程', icon: CalendarDays },
  { href: '/leaderboard', label: '準確率', icon: BarChart3 },
];

export default function Navigation() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-700 bg-slate-900/98 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 group">
          <span className="text-2xl group-hover:scale-110 transition transform">🐙</span>
          <div className="leading-tight">
            <p className="text-sm font-bold text-cyan-400 sm:text-base tracking-tight">章魚哥</p>
            <p className="text-[10px] text-cyan-600 font-medium">ORACLE</p>
          </div>
        </Link>

        <ul className="flex items-center gap-0.5">
          {links.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-cyan-300"
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
