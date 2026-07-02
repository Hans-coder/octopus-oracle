import Link from 'next/link';
import { Home, CalendarDays, BarChart3, BookOpen, Info, ExternalLink } from 'lucide-react';

const links = [
  { href: '/', label: '首頁', icon: Home },
  { href: '/matches', label: '賽程', icon: CalendarDays },
  { href: '/leaderboard', label: '準確率', icon: BarChart3 },
  { href: '/methodology', label: '方法論', icon: BookOpen },
  { href: '/about', label: '關於', icon: Info },
];

export default function Navigation() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-700 bg-slate-900/98 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-2xl group-hover:scale-110 transition transform">🐙</span>
          <span className="text-lg font-bold tracking-wide bg-gradient-to-r from-cyan-300 to-cyan-500 bg-clip-text text-transparent group-hover:from-cyan-200 group-hover:to-cyan-400 transition-all">
            章魚哥 Oracle
          </span>
        </Link>

        <div className="flex items-center gap-1">
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

          <a
            href="https://www.sportslottery.com.tw"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/60 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-400 transition hover:bg-emerald-500/20 hover:text-emerald-300 hover:border-emerald-400"
          >
            <span className="hidden sm:inline">台灣運彩</span>
            <span className="sm:hidden">運彩</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </nav>
    </header>
  );
}
