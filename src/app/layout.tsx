import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Navigation from '@/components/Navigation';
import './globals.css';

const ADSENSE_CLIENT_ID =
  process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID ?? 'ca-pub-4662523495462452';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Octopus Oracle | 2026 FIFA 世界盃預測',
  description:
    'AI 驅動的 2026 FIFA 世界盃預測，結合賠率模型、Elo 評分與章魚哥智能引擎。',
  keywords: ['世界盃', '足球預測', '賠率', 'Elo'],
  openGraph: {
    title: 'Octopus Oracle',
    description: '2026 FIFA 世界盃預測儀表板',
    type: 'website',
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
      <head>
        <script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <Navigation />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-700/40 bg-slate-900/30 py-4 px-4 text-center text-xs text-slate-400">
          <p className="mb-1.5">⚠️ <strong>免責聲明：</strong>預測結果僅供娛樂參考，非投資建議。</p>
          <p className="mb-1">📊 盤口來源：ESPN 美國實時賠率（非台灣運彩官方數據）</p>
          <p className="mb-1">❌ 不應用於真實投注決策，請參考官方賠率。</p>
          <p className="mb-1">🧾 賠率可能有延遲，請以投注當下官方盤口與公告為準。</p>
          <p>🔞 請遵守所在地法規與年齡限制，理性參與、量力而為。</p>
        </footer>
      </body>
    </html>
  );
}
