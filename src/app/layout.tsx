import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Link from 'next/link';
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
  title: 'Octopus Oracle | 2026 FIFA 世界盃預測',
  description:
    'AI 驅動的 2026 FIFA 世界盃預測，結合賠率模型、Elo 評分與章魚哥智能引擎。',
  keywords: ['世界盃', '足球預測', '賠率', 'Elo', '2026 World Cup', '章魚哥'],
  openGraph: {
    title: '章魚哥 Oracle｜2026 世界盃預測',
    description: '結合賠率分析、Elo 評分與 AI 的足球預測儀表板，讓你賽前掌握勝負關鍵。',
    type: 'website',
    locale: 'zh_TW',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: '章魚哥 Oracle 2026 世界盃預測',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '章魚哥 Oracle｜2026 世界盃預測',
    description: '結合賠率分析、Elo 評分與 AI 的足球預測儀表板。',
    images: ['/og-image.png'],
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
      {process.env.NEXT_PUBLIC_ADS_ENABLED === 'true' && (
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4662523495462452"
          crossOrigin="anonymous"
        />
      )}
      <body className="min-h-full flex flex-col">
        <Navigation />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-700/40 bg-slate-900/30 px-4 py-4 text-center text-xs text-slate-400">
          <div className="mb-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm">
            <Link href="/methodology" className="text-slate-300 transition hover:text-cyan-300">模型方法論</Link>
            <Link href="/about" className="text-slate-300 transition hover:text-cyan-300">關於本站</Link>
            <Link href="/editorial-policy" className="text-slate-300 transition hover:text-cyan-300">編輯政策</Link>
            <Link href="/faq" className="text-slate-300 transition hover:text-cyan-300">FAQ</Link>
            <Link href="/privacy" className="text-slate-300 transition hover:text-cyan-300">隱私權政策</Link>
            <Link href="/contact" className="text-slate-300 transition hover:text-cyan-300">聯絡我們</Link>
          </div>
          <p className="mb-1.5">⚠️ <strong>免責聲明：</strong>預測結果僅供娛樂參考，非投資建議。</p>
          <p className="mb-1">📊 盤口來源：ESPN 美國實時賠率（非台灣運彩官方數據）</p>
          <p className="mb-1">❌ 不應用於真實投注決策，請參考官方賠率。</p>
          <p className="mb-1">🧾 賠率可能有延遲，請以投注當下官方盤口與公告為準。</p>
          <p className="mb-2">🔞 請遵守所在地法規與年齡限制，理性參與、量力而為。</p>
          <p className="text-slate-600">
            官方投注請至{' '}
            <a
              href="https://www.sportslottery.com.tw"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-slate-400 transition"
            >
              台灣運彩
            </a>
          </p>
        </footer>
      </body>
    </html>
  );
}
