import { CheckCircle2, XCircle, MinusCircle } from 'lucide-react';
import { getMatches } from '@/lib/football-api';
import { getOddsForMatches, oddsToMap } from '@/lib/lottery-scraper';
import {
  predictMany,
  evaluatePrediction,
  calculateAccuracy,
} from '@/lib/octopus';
import { cn, formatTaiwanTime } from '@/lib/utils';
import StatCard from '@/components/StatCard';

export const revalidate = 300;

export default async function LeaderboardPage() {
  const matches = await getMatches();
  const odds = await getOddsForMatches(matches);
  const oddsMap = oddsToMap(odds);
  const predictions = predictMany(matches, oddsMap);

  const evaluated = predictions
    .map((p) => {
      const m = matches.find((x) => x.id === p.matchId)!;
      return { match: m, ...evaluatePrediction(p, m) };
    })
    .sort(
      (a, b) =>
        new Date(b.match.utcDate).getTime() -
        new Date(a.match.utcDate).getTime(),
    );

  const stats = calculateAccuracy(evaluated);
  const finished = evaluated.filter((e) => e.correct !== null);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8">
        <h1 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          <span className="text-4xl">🏆</span>
          神準排行
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          章魚哥的累積戰績・讓我們看看牠是否能超越傳奇前輩
        </p>
      </header>

      <section className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <StatCard icon="🐙" label="總預測" value={stats.total} accent="cyan" />
        <StatCard
          icon="✅"
          label="命中"
          value={stats.correct}
          accent="emerald"
        />
        <StatCard
          icon="❌"
          label="未中"
          value={stats.evaluated - stats.correct}
          accent="rose"
        />
        <StatCard
          icon="🎯"
          label="準確率"
          value={
            stats.evaluated === 0
              ? '—'
              : `${Math.round(stats.accuracy * 100)}%`
          }
          hint={`基於 ${stats.evaluated} 場`}
          accent="amber"
        />
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold text-white">最近預測紀錄</h2>

        {finished.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-slate-900/40 p-12 text-center">
            <div className="text-5xl">🦑</div>
            <p className="mt-3 text-slate-400">
              還沒有結束的比賽，預測戰績統計中…
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {finished.map(({ match, prediction, actual, correct }) => (
              <li
                key={match.id}
                className={cn(
                  'flex items-center gap-4 rounded-2xl border bg-slate-900/50 px-4 py-3 transition',
                  correct
                    ? 'border-emerald-500/30 hover:bg-emerald-500/5'
                    : 'border-rose-500/30 hover:bg-rose-500/5',
                )}
              >
                <div className="shrink-0">
                  {correct ? (
                    <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                  ) : (
                    <XCircle className="h-6 w-6 text-rose-400" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm font-medium text-white">
                    <span>{match.homeTeam.flag}</span>
                    <span className="truncate">{match.homeTeam.name}</span>
                    <span className="font-mono text-slate-400">
                      {match.score?.fullTime.home} : {match.score?.fullTime.away}
                    </span>
                    <span className="truncate">{match.awayTeam.name}</span>
                    <span>{match.awayTeam.flag}</span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
                    <span>{formatTaiwanTime(match.utcDate)}</span>
                    <span>·</span>
                    <span>
                      🐙 預測：{prediction.pickedTeamFlag}{' '}
                      {prediction.pickedTeamName}
                    </span>
                    {actual === 'DRAW' && (
                      <>
                        <span>·</span>
                        <span className="inline-flex items-center gap-0.5">
                          <MinusCircle className="h-3 w-3" /> 實際和局
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
