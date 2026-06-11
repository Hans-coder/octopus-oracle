import Link from 'next/link';
import { ArrowRight, Waves } from 'lucide-react';
import { getMatches } from '@/lib/football-api';
import { getOddsForMatches, oddsToMap } from '@/lib/lottery-scraper';
import {
  predictMany,
  evaluatePrediction,
  calculateAccuracy,
} from '@/lib/octopus';
import { isToday, isPast, formatTaiwanDate } from '@/lib/utils';
import MatchCard from '@/components/MatchCard';
import StatCard from '@/components/StatCard';

// 每 5 分鐘重新整理一次（ISR）
export const revalidate = 300;

export default async function Dashboard() {
  const allMatches = await getMatches();
  const odds = await getOddsForMatches(allMatches);
  const oddsMap = oddsToMap(odds);
  const predictions = predictMany(allMatches, oddsMap);
  const predictionMap = new Map(predictions.map((p) => [p.matchId, p]));

  // 統計章魚哥準確率（基於已結束比賽）
  const results = predictions.map((p) => {
    const match = allMatches.find((m) => m.id === p.matchId)!;
    return evaluatePrediction(p, match);
  });
  const stats = calculateAccuracy(results);

  // 今日比賽
  const todayMatches = allMatches
    .filter((m) => isToday(m.utcDate))
    .sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime());

  // 即將開賽（未來、非今日，取前 6 場）
  const upcomingMatches = allMatches
    .filter((m) => !isPast(m.utcDate) && !isToday(m.utcDate))
    .sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime())
    .slice(0, 6);

  const todayPrediction = todayMatches[0]
    ? predictionMap.get(todayMatches[0].id)
    : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-slate-900/80 via-blue-950/60 to-cyan-950/60 px-6 py-10 sm:px-12 sm:py-16">
        <div className="absolute -right-10 -top-10 text-[200px] opacity-10 sm:text-[280px]">
          🐙
        </div>

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-300">
            <Waves className="h-3.5 w-3.5" />
            2026 FIFA World Cup · 深海神諭啟動中
          </div>

          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-white sm:text-6xl">
            章魚哥<span className="text-cyan-300">神諭</span>
          </h1>
          <p className="mt-3 max-w-xl text-base text-slate-300 sm:text-lg">
            致敬傳奇章魚保羅 🐙　透過深海神祕力量為每場世界杯指引方向，
            結合台灣運彩即時賠率，讓朋友圈一起來看誰預測得準！
          </p>

          {todayPrediction && (
            <div className="mt-6 inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 backdrop-blur">
              <span className="text-3xl">{todayPrediction.pickedTeamFlag}</span>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-cyan-300/80">
                  今日首戰章魚哥神諭
                </div>
                <div className="text-base font-bold text-white">
                  {todayPrediction.pickedTeamName} 將勝出
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 統計卡 */}
      <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <StatCard
          icon="📅"
          label="今日賽事"
          value={todayMatches.length}
          hint={formatTaiwanDate(new Date().toISOString())}
          accent="cyan"
        />
        <StatCard
          icon="🐙"
          label="累積預測"
          value={stats.total}
          hint={`已驗證 ${stats.evaluated} 場`}
          accent="emerald"
        />
        <StatCard
          icon="🎯"
          label="神準率"
          value={
            stats.evaluated === 0
              ? '—'
              : `${Math.round(stats.accuracy * 100)}%`
          }
          hint={`${stats.correct} / ${stats.evaluated} 命中`}
          accent="amber"
        />
        <StatCard
          icon="⚡"
          label="即將開賽"
          value={upcomingMatches.length}
          hint="未來 7 天"
          accent="rose"
        />
      </section>

      {/* 今日比賽 */}
      <section className="mt-10">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="flex items-center gap-2 text-2xl font-bold text-white sm:text-3xl">
            <span>🔥</span> 今日賽程
          </h2>
          <Link
            href="/matches"
            className="inline-flex items-center gap-1 text-sm text-cyan-300 hover:text-cyan-200"
          >
            查看全部 <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {todayMatches.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-slate-900/40 p-12 text-center">
            <div className="text-5xl">🦑</div>
            <p className="mt-3 text-slate-400">
              今天沒有賽事，章魚哥正在深海冥想中…
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {todayMatches.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                odds={oddsMap.get(m.id)}
                prediction={predictionMap.get(m.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* 即將開賽 */}
      {upcomingMatches.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-white sm:text-3xl">
            <span>📅</span> 即將開賽
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingMatches.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                odds={oddsMap.get(m.id)}
                prediction={predictionMap.get(m.id)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
