import { CheckCircle2, XCircle, MinusCircle, Info, Trophy } from 'lucide-react';
import { getAggregatedData } from '@/lib/page-data';
import { ENGINES, ENGINE_META, evaluatePrediction } from '@/lib/octopus';
import { cn, formatTaiwanTime } from '@/lib/utils';
import type {
  AccuracyBucket,
  EngineAccuracy,
  EngineId,
  Match,
  PredictionBundle,
} from '@/types';

export const revalidate = 300;

const MIN_EVALUATED = 5;

const ACCENT_TEXT: Record<'cyan' | 'emerald' | 'violet', string> = {
  cyan: 'text-cyan-300',
  emerald: 'text-emerald-300',
  violet: 'text-violet-300',
};
const ACCENT_BORDER: Record<'cyan' | 'emerald' | 'violet', string> = {
  cyan: 'border-cyan-400/40',
  emerald: 'border-emerald-400/40',
  violet: 'border-violet-400/40',
};
const ACCENT_BG: Record<'cyan' | 'emerald' | 'violet', string> = {
  cyan: 'bg-cyan-500/10',
  emerald: 'bg-emerald-500/10',
  violet: 'bg-violet-500/10',
};

export default async function LeaderboardPage() {
  const { matches, bundles, accuracies } = await getAggregatedData();

  // 排序 engines by official accuracy（樣本不足者排後面）
  const rankedEngines = [...ENGINES].sort((a, b) => {
    const aA = accuracies[a.id].official;
    const bA = accuracies[b.id].official;
    const aOk = aA.evaluated >= MIN_EVALUATED;
    const bOk = bA.evaluated >= MIN_EVALUATED;
    if (aOk !== bOk) return aOk ? -1 : 1;
    return bA.accuracy - aA.accuracy;
  });

  // 最近 finished 比賽（依時間倒序）
  const finishedMatches = matches
    .filter((m) => m.status === 'FINISHED' && m.score?.winner)
    .sort(
      (a, b) =>
        new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime(),
    );

  const officialFinished = finishedMatches.filter((m) => !m.isFriendly);
  const friendlyFinished = finishedMatches.filter((m) => m.isFriendly);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8">
        <h1 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          <Trophy className="h-8 w-8 text-amber-300" />
          神準排行
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          三隻章魚哥對決・看誰能超越傳奇前輩 Paul
        </p>
      </header>

      {/* 三隻章魚哥對戰卡 */}
      <section className="mb-10 grid gap-4 sm:grid-cols-3">
        {rankedEngines.map((engine, rank) => (
          <EngineLeaderCard
            key={engine.id}
            rank={rank + 1}
            engine={engine.id}
            accuracy={accuracies[engine.id]}
          />
        ))}
      </section>

      {/* 樣本不足提示 */}
      {accuracies.paul.official.evaluated < MIN_EVALUATED && (
        <div className="mb-8 flex items-start gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-200/90">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div>
            <strong>正賽神準率尚不穩定：</strong>
            目前只有 {accuracies.paul.official.evaluated} 場正賽結果可評估，
            少於 {MIN_EVALUATED} 場時樣本太少容易誤導。下方「熱身賽紀錄」僅供示範資料完整性，
            不列入正式神準率。
          </div>
        </div>
      )}

      {/* 正賽紀錄 */}
      <section className="mb-10">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-white">
          <span className="text-amber-300">🏟️</span>
          正賽紀錄
          <span className="text-xs font-normal text-slate-500">
            ({officialFinished.length} 場)
          </span>
        </h2>
        {officialFinished.length === 0 ? (
          <EmptyHint text="正賽尚未開打，章魚哥們正在熱身…" />
        ) : (
          <PredictionList matches={officialFinished} bundles={bundles} />
        )}
      </section>

      {/* 熱身賽紀錄 */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-white">
          <span>🏃‍♂️</span>
          熱身賽紀錄
          <span className="text-xs font-normal text-slate-500">
            ({friendlyFinished.length} 場・僅供示範)
          </span>
        </h2>
        {friendlyFinished.length === 0 ? (
          <EmptyHint text="無熱身賽紀錄" />
        ) : (
          <PredictionList matches={friendlyFinished} bundles={bundles} dim />
        )}
      </section>
    </div>
  );
}

/* ─────────────── 三隻章魚哥的排行卡 ─────────────── */
function EngineLeaderCard({
  rank,
  engine,
  accuracy,
}: {
  rank: number;
  engine: EngineId;
  accuracy: EngineAccuracy;
}) {
  const meta = ENGINE_META[engine];
  const official = accuracy.official;
  const hasEnough = official.evaluated >= MIN_EVALUATED;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-3xl border-2 bg-slate-900/50 p-5 backdrop-blur',
        rank === 1 && hasEnough
          ? ACCENT_BORDER[meta.accent]
          : 'border-white/10',
        rank === 1 && hasEnough && ACCENT_BG[meta.accent],
      )}
    >
      {/* 排名徽章 */}
      <div className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-slate-300">
        #{rank}
      </div>

      <div className="flex items-start gap-3">
        <div className="text-5xl">{meta.emoji}</div>
        <div className="min-w-0 flex-1">
          <div className={cn('text-sm font-bold', ACCENT_TEXT[meta.accent])}>
            {meta.name}
          </div>
          <div className="text-[10px] uppercase tracking-widest text-slate-500">
            {meta.title}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">{meta.description}</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {/* 正賽 */}
        <BucketRow
          label="正賽"
          bucket={official}
          accentClass={ACCENT_TEXT[meta.accent]}
          showAccuracy={hasEnough}
          highlight
        />
        {/* 熱身賽 */}
        <BucketRow
          label="熱身賽"
          bucket={accuracy.friendly}
          accentClass="text-slate-400"
          showAccuracy={accuracy.friendly.evaluated > 0}
        />
      </div>

      {!hasEnough && (
        <p className="mt-3 rounded-lg bg-slate-800/50 px-2 py-1 text-[10px] text-slate-400">
          樣本不足（{official.evaluated}/{MIN_EVALUATED}）
        </p>
      )}

      {hasEnough && rank === 1 && (
        <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
          <Trophy className="h-3 w-3" />
          目前最神準
        </div>
      )}
    </div>
  );
}

function BucketRow({
  label,
  bucket,
  accentClass,
  showAccuracy,
  highlight = false,
}: {
  label: string;
  bucket: AccuracyBucket;
  accentClass: string;
  showAccuracy: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-baseline justify-between gap-2 rounded-lg px-2 py-1.5',
        highlight ? 'bg-slate-800/60' : 'bg-slate-900/40',
      )}
    >
      <span className="text-[11px] uppercase tracking-wider text-slate-400">
        {label}
      </span>
      <span className="flex items-baseline gap-1.5">
        <span
          className={cn(
            'font-mono text-lg font-bold tabular-nums',
            showAccuracy ? accentClass : 'text-slate-500',
          )}
        >
          {showAccuracy ? `${Math.round(bucket.accuracy * 100)}%` : '—'}
        </span>
        <span className="text-[10px] text-slate-500">
          {bucket.correct}/{bucket.evaluated}
        </span>
      </span>
    </div>
  );
}

/* ─────────────── 預測紀錄列表 ─────────────── */
function PredictionList({
  matches,
  bundles,
  dim = false,
}: {
  matches: Match[];
  bundles: Map<string, PredictionBundle>;
  dim?: boolean;
}) {
  return (
    <ul className={cn('space-y-2', dim && 'opacity-70')}>
      {matches.map((m) => {
        const bundle = bundles.get(m.id);
        if (!bundle) return null;
        return <PredictionRow key={m.id} match={m} bundle={bundle} />;
      })}
    </ul>
  );
}

function PredictionRow({
  match,
  bundle,
}: {
  match: Match;
  bundle: PredictionBundle;
}) {
  // 三引擎各自命中與否
  const results = (['paul', 'doctor', 'oracle'] as const).map((id) => ({
    id,
    meta: ENGINE_META[id],
    ...evaluatePrediction(bundle[id], match),
  }));

  const correctCount = results.filter((r) => r.correct).length;
  const allWrong = correctCount === 0;
  const allCorrect = correctCount === 3;
  const isDrawResult = match.score?.winner === 'DRAW';

  return (
    <li
      className={cn(
        'flex flex-col gap-2 rounded-2xl border bg-slate-900/50 px-4 py-3 transition sm:flex-row sm:items-center sm:gap-4',
        allCorrect && 'border-amber-500/40 bg-amber-500/5',
        !allCorrect && correctCount > 0 && 'border-emerald-500/20',
        allWrong && 'border-rose-500/20',
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

      {/* 三隻章魚哥的預測結果 */}
      <div className="grid grid-cols-3 gap-1.5 sm:flex sm:gap-2">
        {results.map((r) => (
          <div
            key={r.id}
            className={cn(
              'flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px]',
              r.correct
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                : 'border-rose-500/30 bg-rose-500/5 text-rose-300',
            )}
            title={`${r.meta.name}：${r.prediction.pickedTeamName}`}
          >
            <span>{r.meta.emoji}</span>
            <span>{r.prediction.pickedTeamFlag}</span>
            {r.correct ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : (
              <XCircle className="h-3 w-3" />
            )}
          </div>
        ))}
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
