import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getAggregatedData } from '@/lib/page-data';
import { isToday, isPast, formatTaiwanTime } from '@/lib/utils';
import { ENGINE } from '@/lib/octopus';
import MatchCard from '@/components/MatchCard';
import StatCard from '@/components/StatCard';
import AdBanner from '@/components/AdBanner';
import SupportCard from '@/components/SupportCard';
import TodayDateHint from '@/components/TodayDateHint';

export const revalidate = 300;

const MIN_EVALUATED = 5;
const MODEL_VERSION = 'v1.0';

export default async function Dashboard() {
  const { matches, oddsMap, predictions, accuracy, llmProvider } =
    await getAggregatedData();

  const todayMatches = matches
    .filter((m) => isToday(m.utcDate))
    .sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime());

  const upcomingMatches = matches
    .filter((m) => !isPast(m.utcDate) && !isToday(m.utcDate))
    .sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime())
    .slice(0, 6);

  const accuracyLabel =
    accuracy.evaluated < MIN_EVALUATED
      ? '—'
      : `${Math.round(accuracy.accuracy * 100)}%`;
  const accuracyHint =
    accuracy.evaluated < MIN_EVALUATED
      ? `樣本不足 ${accuracy.evaluated}/${MIN_EVALUATED} 場`
      : `${accuracy.correct} / ${accuracy.evaluated} 場命中`;

  const latestOddsUpdatedAt = Array.from(oddsMap.values()).reduce<string | null>(
    (latest, o) => {
      if (!latest) return o.updatedAt;
      return new Date(o.updatedAt).getTime() > new Date(latest).getTime()
        ? o.updatedAt
        : latest;
    },
    null,
  );

  const aiStatusLabel =
    llmProvider === 'disabled' ? 'AI: OFF' : `AI: ON (${llmProvider.toUpperCase()})`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <section className="overflow-hidden rounded-3xl border-2 border-cyan-500 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 p-6 shadow-lg sm:p-8 cyber-glow">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-xs uppercase tracking-widest font-bold text-cyan-400">🏆 2026 World Cup 預測</p>
            <h1 className="mt-3 text-3xl font-bold text-cyan-300 sm:text-4xl leading-tight">
              章魚哥的神諭系統
            </h1>
            <p className="mt-3 text-sm text-slate-300 sm:text-base leading-relaxed">
              用數據和直覺預測比賽結果。我們融合賠率、Elo 等級、近期狀態，搭配選擇性 AI 分析，提供可信的預測。
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
              <span className="rounded-full border border-cyan-400/40 bg-cyan-500/10 px-2 py-1 font-semibold text-cyan-200">
                {ENGINE.name} {MODEL_VERSION}
              </span>
              <span className="rounded-full border border-slate-500/40 bg-slate-700/40 px-2 py-1 text-slate-200">
                {aiStatusLabel}
              </span>
              {latestOddsUpdatedAt && (
                <span className="rounded-full border border-slate-500/40 bg-slate-700/40 px-2 py-1 text-slate-300">
                  更新：{formatTaiwanTime(latestOddsUpdatedAt)}
                </span>
              )}
            </div>
            <SupportCard className="mt-4 max-w-xl" />
          </div>
          <div className="hidden sm:block text-8xl opacity-20 flex-shrink-0">🐙</div>
        </div>
      </section>

      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <StatCard
          icon="📅"
          label="今日賽事"
          value={todayMatches.length}
          hint={<TodayDateHint />}
          accent="cyan"
        />
        <StatCard
          icon="🧮"
          label="累積預測"
          value={accuracy.total}
          hint={`正賽 ${accuracy.total} 場`}
          accent="emerald"
        />
        <Link href="/leaderboard" className="block transform transition hover:scale-105" aria-label="查看準確率">
          <StatCard
            icon="🎯"
            label="準確率"
            value={accuracyLabel}
            hint={accuracyHint}
            accent="blue"
          />
        </Link>
        <StatCard
          icon="⏱"
          label="即將開賽"
          value={upcomingMatches.length}
          hint="未來 7 天"
          accent="purple"
        />
      </section>

      <AdBanner className="mt-4" label="合作廣告" />

      {accuracy.evaluated < MIN_EVALUATED && (
        <div className="mt-4 flex items-start gap-2 rounded-2xl border border-yellow-500/50 bg-yellow-900/20 px-4 py-3 text-xs text-yellow-400 backdrop-blur">
          <span className="text-lg">💡</span>
          <p>樣本仍偏少，建議等待更多完賽場次再解讀準確率。</p>
        </div>
      )}

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-cyan-300 flex items-center gap-2">
            <span>📅</span> 今日賽事
          </h2>
          <Link
            href="/matches"
            className="inline-flex items-center gap-1 text-sm font-medium text-cyan-500 hover:text-cyan-300 transition-colors"
          >
            查看全部 <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {todayMatches.length === 0 ? (
          <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-8 text-center text-sm text-slate-500">
            今日無賽程。
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

      {upcomingMatches.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-2xl font-bold text-cyan-300 flex items-center gap-2">
            <span>🔮</span> 即將開賽
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingMatches.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                odds={oddsMap.get(m.id)}
                prediction={predictions.get(m.id)}
              />
            ))}
          </div>
          <Link
            href="/matches"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 px-4 py-2 text-sm font-semibold text-white transition"
          >
            查看全部賽程 <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      )}

      <AdBanner className="mt-8" label="更多優惠" />

    </div>
  );
}
