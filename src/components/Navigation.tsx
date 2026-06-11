import Link from 'next/link';
import { Home, CalendarDays, Trophy } from 'lucide-react';

const links = [
  { href: '/', label: '今日章魚哥', icon: Home },
  { href: '/matches', label: '所有賽程', icon: CalendarDays },
  { href: '/leaderboard', label: '神準排行', icon: Trophy },
];

export default function Navigation() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="group flex items-center gap-2">
          <span className="text-3xl transition-transform group-hover:rotate-12">🐙</span>
          <div className="flex flex-col leading-tight">
            <span className="text-lg font-bold tracking-tight text-white">
              章魚哥神諭
            </span>
            <span className="text-[10px] uppercase tracking-widest text-cyan-300/70">
              Octopus Oracle · WC 2026
            </span>
          </div>
        </Link>

        <ul className="flex items-center gap-1 text-sm sm:gap-2">
          {links.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex items-center gap-1.5 rounded-full px-3 py-2 text-slate-300 transition hover:bg-white/10 hover:text-white sm:px-4"
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
