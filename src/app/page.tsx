import Link from 'next/link';
import { ArrowRight, Waves, Info } from 'lucide-react';
import { getAggregatedData } from '@/lib/page-data';
import { isToday, isPast, formatTaiwanDate } from '@/lib/utils';
import MatchCard from '@/components/MatchCard';
import StatCard from '@/components/StatCard';

// 每 5 分鐘重新整理一次（ISR）
export const revalidate = 300;

// 統計卡顯示「資料蒐集中」的最低樣本數
const MIN_EVALUATED = 5;

export default async function Dashboard() {
  const { matches, oddsMap, predictions, accuracy, llmProvider } =
    await getAggregatedData();

  // 今日比賽
  const todayMatches = matches
    .filter((m) => isToday(m.utcDate))
    .sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime());

  // 即將開賽（未來、非今日，取前 6 場）
  const upcomingMatches = matches
    .filter((m) => !isPast(m.utcDate) && !isToday(m.utcDate))
    .sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime())
    .slice(0, 6);

  const todayPrediction = todayMatches[0]
    ? predictions.get(todayMatches[0].id)
    : null;

  // 神準率顯示邏輯（只算正賽）
  const accuracyLabel =
    accuracy.evaluated < MIN_EVALUATED
      ? '—'
      : `${Math.round(accuracy.accuracy * 100)}%`;
  const accuracyHint =
    accuracy.evaluated < MIN_EVALUATED
      ? `樣本不足・${accuracy.evaluated}/${MIN_EVALUATED} 場`
      : `${accuracy.correct} / ${accuracy.evaluated} 場命中`;

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
            2026 FIFA World Cup · 章魚哥神諭啟動中
          </div>

          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-white sm:text-6xl">
            章魚哥<span className="text-cyan-300">神諭</span>
          </h1>
          <p className="mt-3 max-w-xl text-base text-slate-300 sm:text-lg">
            致敬傳奇章魚保羅 🐙　每場比賽召喚<strong className="text-cyan-200">深海章魚哥</strong>
            為你指引方向，賽程來自 ESPN 官方資料，賠率是「章魚推算盤」 + 多玩法神諭（不讓分 / 大小分 / 讓分盤 / 雙方均得分 / 上半場 / 波膽）。
          </p>

          {todayPrediction && (
            <div className="mt-6 inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 backdrop-blur">
              <span className="text-3xl">{todayPrediction.pickedTeamFlag}</span>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-cyan-300/80">
                  🐙 章魚哥・今日首戰
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
          value={accuracy.total}
          hint={`正賽 ${accuracy.total} 場`}
          accent="emerald"
        />
        <Link
          href="/leaderboard"
          className="block transition hover:scale-[1.02]"
          aria-label="點擊查看神準率詳細排行榜"
        >
          <StatCard
            icon="🎯"
            label="神準率"
            value={accuracyLabel}
            hint={accuracyHint}
            accent="amber"
          />
        </Link>
        <StatCard
          icon="⚡"
          label="即將開賽"
          value={upcomingMatches.length}
          hint="未來 7 天"
          accent="rose"
        />
      </section>

      {/* 樣本不足提示 */}
      {accuracy.evaluated < MIN_EVALUATED && (
        <div className="mt-3 flex items-start gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-200/90">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div>
            <strong>神準率計算中：</strong>
            目前正賽樣本只有 {accuracy.evaluated} 場，至少需要 {MIN_EVALUATED} 場才有統計意義。
            <Link
              href="/leaderboard"
              className="ml-1 underline decoration-amber-300/50 underline-offset-2 hover:text-amber-200"
            >
              查看歷史紀錄 →
            </Link>
          </div>
        </div>
      )}

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
                prediction={predictions.get(m.id)}
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
                prediction={predictions.get(m.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* LLM provider 狀態 footer */}
      <p className="mt-12 text-center text-[11px] text-slate-500">
        🐙 章魚哥 AI provider：<span className="font-mono">{llmProvider}</span>
        {llmProvider === 'mock' && '（設定 OPENAI_API_KEY 或 ANTHROPIC_API_KEY 可啟用真實 LLM）'}
      </p>
    </div>
  );
}
