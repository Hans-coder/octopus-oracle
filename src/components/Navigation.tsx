'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, CalendarDays, BarChart3, BookOpen, Info } from 'lucide-react';

const links = [
  { href: '/', label: '首頁', icon: Home },
  { href: '/matches', label: '賽程', icon: CalendarDays },
  { href: '/leaderboard', label: '準確率', icon: BarChart3 },
  { href: '/methodology', label: '方法論', icon: BookOpen },
  { href: '/about', label: '關於', icon: Info },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <>
      {/* ── 頂部 Header ── */}
      <header className="sticky top-0 z-40 border-b border-slate-700 bg-slate-900/98 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-2xl group-hover:scale-110 transition transform">🐙</span>
            <span className="text-lg font-bold tracking-wide bg-gradient-to-r from-cyan-300 to-cyan-500 bg-clip-text text-transparent group-hover:from-cyan-200 group-hover:to-cyan-400 transition-all">
              章魚哥 Oracle
            </span>
          </Link>

          {/* 桌面版導覽（sm 以上顯示） */}
          <ul className="hidden sm:flex items-center gap-0.5">
            {links.map(({ href, label, icon: Icon }) => {
              const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition
                      ${isActive
                        ? 'bg-cyan-500/15 text-cyan-300'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-cyan-300'
                      }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>

      {/* ── 手機版底部 Tab Bar ── */}
      <nav
        className="sm:hidden fixed bottom-0 inset-x-0 z-40 border-t border-slate-700 bg-slate-900/98 backdrop-blur"
        aria-label="主要導覽"
      >
        <ul className="grid grid-cols-5">
          {links.map(({ href, label, icon: Icon }) => {
            const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition
                    ${isActive
                      ? 'text-cyan-300'
                      : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                  <Icon
                    className={`h-5 w-5 transition ${isActive ? 'text-cyan-400' : ''}`}
                  />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
