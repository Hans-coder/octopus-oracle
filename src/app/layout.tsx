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
  title: 'Octopus Oracle | 2026 World Cup Predictions',
  description:
    'World Cup 2026 prediction dashboard built with odds model, Elo signals, and optional LLM analysis.',
  keywords: ['World Cup', 'football prediction', 'odds model', 'Elo'],
  openGraph: {
    title: 'Octopus Oracle',
    description: 'World Cup prediction dashboard',
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
        <Navigation />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-200 bg-white py-5 text-center text-xs text-slate-500">
          <p>Prediction outputs are for product demonstration and entertainment use.</p>
          <p className="mt-1">Data source: ESPN public scoreboard endpoint. Odds are internally modeled.</p>
        </footer>
      </body>
    </html>
  );
}
