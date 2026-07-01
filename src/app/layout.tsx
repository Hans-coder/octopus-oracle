import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import AdSenseLoader from '@/components/AdSenseLoader';
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
      <body className="min-h-full flex flex-col">
        {/* AdSense: useEffect 動態插入，無 data-nscript，無 SSR 衝突 */}
        <AdSenseLoader />
        <Navigation />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-700/40 bg-slate-900/30 px-4 py-4 text-center text-xs text-slate-400">
          <div className="mb-3 flex items-center justify-center gap-4 text-sm">
            <Link href="/privacy" className="text-slate-300 transition hover:text-cyan-300">隱私權政策</Link>
            <Link href="/contact" className="text-slate-300 transition hover:text-cyan-300">聯絡我們</Link>
          </div>
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
