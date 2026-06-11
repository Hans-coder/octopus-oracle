import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Navigation from '@/components/Navigation';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: '章魚哥神諭 · 2026 世界杯預測 🐙',
  description:
    '致敬章魚保羅！透過深海神諭預測 2026 FIFA 世界杯每場賽事，整合台灣運彩賠率，純娛樂用途。',
  keywords: ['世界杯', 'World Cup 2026', '章魚哥', '足球預測', '台灣運彩', '賠率'],
  openGraph: {
    title: '章魚哥神諭 🐙',
    description: '深海預言家為 2026 世界杯每場比賽指引方向',
    type: 'website',
  },
  icons: {
    icon: [
      {
        url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ctext y=".9em" font-size="90"%3E🐙%3C/text%3E%3C/svg%3E',
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="zh-Hant"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Navigation />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-white/5 py-6 text-center text-xs text-slate-500">
          <p>
            ⚠️ 本站僅供娛樂用途・賠率資料僅供參考・請理性觀賽，未滿 18 歲請勿購買運彩
          </p>
          <p className="mt-1">
            🐙 致敬 Paul the Octopus (2008–2010) · Made with Next.js + Tailwind
          </p>
        </footer>
      </body>
    </html>
  );
}
