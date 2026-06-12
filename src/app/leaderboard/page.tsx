import { CheckCircle2, XCircle, MinusCircle, Info, Trophy } from 'lucide-react';
import { getAggregatedData } from '@/lib/page-data';
import { ENGINE, evaluatePrediction } from '@/lib/octopus';
import { cn, formatTaiwanTime } from '@/lib/utils';
import type { Match, Prediction } from '@/types';

export const revalidate = 300;

const MIN_EVALUATED = 5;

export default async function LeaderboardPage() {
  const { matches, predictions, accuracy } = await getAggregatedData();

  // 最近 finished 比賽（依時間倒序）— 僅顯示正賽
  const finishedMatches = matches
    .filter((m) => m.status === 'FINISHED' && m.score?.winner && !m.isFriendly)
    .sort(
      (a, b) =>
        new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime(),
    );

  const hasEnough = accuracy.evaluated >= MIN_EVALUATED;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8">
        <h1 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          <Trophy className="h-8 w-8 text-amber-300" />
          神準紀錄
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          章魚哥的命中紀錄・致敬傳奇前輩 Paul 🐙
        </p>
      </header>

      {/* 章魚哥神準率主卡 */}
      <section className="mb-8">
        <div
          className={cn(
            'relative overflow-hidden rounded-3xl border-2 bg-slate-900/50 p-6 backdrop-blur sm:p-8',
            hasEnough
              ? 'border-cyan-400/40 bg-cyan-500/10'
              : 'border-white/10',
          )}
        >
          <div className="absolute -right-4 -top-4 text-[160px] opacity-10">
            🐙
          </div>

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            <div className="text-7xl">{ENGINE.emoji}</div>

            <div className="flex-1">
              <div className="text-sm font-bold text-cyan-300">
                {ENGINE.name}
              </div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500">
                {ENGINE.title}
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {ENGINE.description}
              </p>
            </div>

            <div className="text-right">
              <div className="font-mono text-5xl font-bold tabular-nums text-cyan-200">
                {hasEnough ? `${Math.round(accuracy.accuracy * 100)}%` : '—'}
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                {accuracy.correct} / {accuracy.evaluated} 場命中
              </div>
              {hasEnough && (
                <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                  <Trophy className="h-3 w-3" />
                  正賽神準率
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 樣本不足提示 */}
      {!hasEnough && (
        <div className="mb-8 flex items-start gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-200/90">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div>
            <strong>正賽神準率尚不穩定：</strong>
            目前只有 {accuracy.evaluated} 場正賽結果可評估，
            少於 {MIN_EVALUATED} 場時樣本太少容易誤導，正賽打完後神準率才會穩定下來。
          </div>
        </div>
      )}

      {/* 正賽紀錄 */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-white">
          <span className="text-amber-300">🏟️</span>
          正賽紀錄
          <span className="text-xs font-normal text-slate-500">
            ({finishedMatches.length} 場)
          </span>
        </h2>
        {finishedMatches.length === 0 ? (
          <EmptyHint text="正賽尚未開打，章魚哥正在深海冥想中…" />
        ) : (
          <PredictionList matches={finishedMatches} predictions={predictions} />
        )}
      </section>
    </div>
  );
}

/* ─────────────── 預測紀錄列表 ─────────────── */
function PredictionList({
  matches,
  predictions,
}: {
  matches: Match[];
  predictions: Map<string, Prediction>;
}) {
  return (
    <ul className="space-y-2">
      {matches.map((m) => {
        const prediction = predictions.get(m.id);
        if (!prediction) return null;
        return (
          <PredictionRow key={m.id} match={m} prediction={prediction} />
        );
      })}
    </ul>
  );
}

function PredictionRow({
  match,
  prediction,
}: {
  match: Match;
  prediction: Prediction;
}) {
  const { correct } = evaluatePrediction(prediction, match);
  const isDrawResult = match.score?.winner === 'DRAW';

  return (
    <li
      className={cn(
        'flex flex-col gap-2 rounded-2xl border bg-slate-900/50 px-4 py-3 transition sm:flex-row sm:items-center sm:gap-4',
        correct
          ? 'border-emerald-500/30 bg-emerald-500/5'
          : 'border-rose-500/20',
      )}
    >
      {/* 比賽資訊 */}
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
          {isDrawResult && (
            <span className="inline-flex items-center gap-0.5">
              <MinusCircle className="h-3 w-3" /> 和局
            </span>
          )}
        </div>
      </div>

      {/* 章魚哥預測結果 */}
      <div
        className={cn(
          'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs',
          correct
            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
            : 'border-rose-500/30 bg-rose-500/5 text-rose-300',
        )}
        title={`章魚哥：${prediction.pickedTeamName}`}
      >
        <span className="text-base">🐙</span>
        <span>{prediction.pickedTeamFlag}</span>
        <span className="hidden font-medium sm:inline">
          {prediction.pickedTeamName}
        </span>
        {correct ? (
          <CheckCircle2 className="h-3.5 w-3.5" />
        ) : (
          <XCircle className="h-3.5 w-3.5" />
        )}
      </div>
    </li>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900/40 p-10 text-center">
      <div className="text-4xl">🦑</div>
      <p className="mt-2 text-sm text-slate-400">{text}</p>
    </div>
  );
}
