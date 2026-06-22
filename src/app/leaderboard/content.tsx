'use client';

import { useState } from 'react';
import { MinusCircle, TrendingUp, Heart, CheckCircle2, XCircle } from 'lucide-react';
import { cn, formatTaiwanTime } from '@/lib/utils';
import type { Match, Prediction } from '@/types';

interface LeaderboardContentProps {
  matches: Match[];
  predictions: Map<string, Prediction>;
  accuracy: {
    total: number;
    evaluated: number;
    correct: number;
    accuracy: number;
    calibration?: {
      brierScore: number;
      logLoss: number;
    };
  };
  engineName: string;
  minEvaluated: number;
}

export function LeaderboardContent({
  matches,
  predictions,
  accuracy,
  engineName,
  minEvaluated,
}: LeaderboardContentProps) {
  const hasEnough = accuracy.evaluated >= minEvaluated;
  const finishedMatches = matches
    .filter((m) => m.status === 'FINISHED' && m.score?.winner && !m.isFriendly)
    .sort((a, b) => new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime());

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-8">
        <h1 className="flex items-center gap-3 text-3xl font-bold text-cyan-400 sm:text-4xl">
          <span className="text-4xl">🐙</span>
          章魚哥的神諭
        </h1>
        <p className="mt-2 text-slate-400">精準捕捉每場關鍵對決。</p>
      </header>

      <section className="mb-8 overflow-hidden rounded-3xl border-2 border-cyan-500 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 p-6 shadow-lg cyber-glow">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm font-medium text-cyan-400 uppercase tracking-wide">{engineName}</p>
            <p className="mt-3 text-5xl font-bold text-cyan-300">
              {hasEnough ? `${Math.round(accuracy.accuracy * 100)}%` : '—'}
            </p>
          </div>
          <div className="hidden sm:block text-6xl opacity-20">🐙</div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl bg-slate-700/50 px-4 py-3 border border-cyan-500/50 backdrop-blur">
            <p className="text-xs text-cyan-400 font-medium">命中場數</p>
            <p className="mt-1 text-2xl font-bold text-cyan-300">{accuracy.correct}</p>
            <p className="text-xs text-slate-400">共 {accuracy.evaluated} 場</p>
          </div>
          <div className="rounded-xl bg-slate-700/50 px-4 py-3 border border-cyan-500/50 backdrop-blur">
            <p className="text-xs text-cyan-400 font-medium">樣本規模</p>
            <p className="mt-1 text-2xl font-bold text-cyan-300">{accuracy.evaluated}</p>
            <p className="text-xs text-slate-400">已完成評估</p>
          </div>
        </div>

        {accuracy.calibration && hasEnough && (
          <div className="mt-6 space-y-3 border-t-2 border-slate-700 pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-cyan-400 font-medium">品質指標</span>
              <TrendingUp className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-semibold text-slate-400 w-20">Brier Score</span>
                <div className="flex-1 h-2 rounded-full bg-slate-700 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-400 to-blue-500"
                    style={{width: `${Math.max(5, Math.min(100, (1 - accuracy.calibration.brierScore) * 100))}%`}}
                  />
                </div>
                <code className="text-xs font-mono text-cyan-300 w-12 text-right">{accuracy.calibration.brierScore.toFixed(3)}</code>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-semibold text-slate-400 w-20">Log Loss</span>
                <div className="flex-1 h-2 rounded-full bg-slate-700 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-400 to-emerald-500"
                    style={{width: `${Math.max(5, Math.min(100, Math.max(0, (1 - accuracy.calibration.logLoss * 0.5) * 100)))}`}}
                  />
                </div>
                <code className="text-xs font-mono text-green-300 w-12 text-right">{accuracy.calibration.logLoss.toFixed(3)}</code>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-400 leading-relaxed">
              📊 <strong>Brier Score</strong> 越小越好（0 = 完美預測）。<strong>Log Loss</strong> 越小越好（衡量預測信心度）。
            </p>
          </div>
        )}
      </section>

      {!hasEnough && (
        <div className="mb-6 rounded-2xl border border-yellow-500/50 bg-yellow-900/20 px-4 py-3 text-xs text-yellow-400 flex items-start gap-2 backdrop-blur">
          <span className="text-lg">💡</span>
          <div>
            <p className="font-semibold">樣本正在累積</p>
            <p className="mt-1">需要 {minEvaluated} 場已完成賽事才能評估準確率。目前 {accuracy.evaluated} / {minEvaluated}。</p>
          </div>
        </div>
      )}

      <section>
        <h2 className="mb-4 text-xl font-bold text-cyan-300 flex items-center gap-2">
          <span>📋</span> 預測紀錄
        </h2>
        {finishedMatches.length === 0 ? (
          <div className="rounded-2xl border border-slate-600 bg-slate-800 p-8 text-center">
            <p className="text-4xl mb-2">⚽</p>
            <p className="text-sm text-slate-400">尚無可評估賽果。</p>
          </div>
        ) : (
          <PredictionList matches={finishedMatches} predictions={predictions} />
        )}
      </section>
    </div>
  );
}

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
        return <PredictionRow key={m.id} match={m} prediction={prediction} />;
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
  const correct = evaluatePrediction(prediction, match);
  const isDrawResult = match.score?.winner === 'DRAW';
  const [likes, setLikes] = useState(0);

  return (
    <li
      className={cn(
        'rounded-2xl border-2 px-4 py-3 transition-all hover:shadow-lg backdrop-blur',
        correct
          ? 'border-emerald-500/50 bg-emerald-900/20'
          : 'border-rose-500/50 bg-rose-900/20',
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          {/* 比賽資訊 */}
          <div className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-slate-100">
            <span className="text-lg">{match.homeTeam.flag}</span>
            <span className="truncate">{match.homeTeam.name}</span>
            <span className="font-mono text-cyan-400 bg-slate-700/50 rounded px-2 py-1">
              {match.score?.fullTime.home}-{match.score?.fullTime.away}
            </span>
            <span className="truncate">{match.awayTeam.name}</span>
            <span className="text-lg">{match.awayTeam.flag}</span>
          </div>

          {/* 時間和和局標籤 */}
          <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
            <span>{formatTaiwanTime(match.utcDate)}</span>
            {isDrawResult && (
              <span className="inline-flex items-center gap-1 bg-slate-700/50 px-2 py-1 rounded-full border border-slate-600">
                <MinusCircle className="h-3 w-3" /> 和局
              </span>
            )}
          </div>
        </div>

        {/* 預測結果和互動 */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="rounded-xl bg-slate-700/50 px-3 py-2 border border-cyan-500/50 flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-100">
              {prediction.pickedTeamFlag} {prediction.pickedTeamName}
            </span>
            {correct ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            ) : (
              <XCircle className="h-4 w-4 text-rose-400" />
            )}
          </div>
          <span className="text-xs font-semibold text-cyan-400 w-12 text-right">
            {Math.round(prediction.confidence * 100)}%
          </span>
          <button
            onClick={() => setLikes((prev) => prev + 1)}
            className="ml-2 flex items-center gap-1 px-2 py-1.5 rounded-lg bg-pink-900/40 hover:bg-pink-900/60 border border-pink-500/50 transition-all transform hover:scale-110"
            title="點讚"
          >
            <Heart
              className={cn(
                'h-4 w-4 transition-all',
                likes > 0 ? 'fill-pink-400 text-pink-400' : 'text-pink-400'
              )}
            />
            <span className="text-xs font-bold text-pink-400 w-5 text-right">
              {likes > 0 ? likes : ''}
            </span>
          </button>
        </div>
      </div>
    </li>
  );
}

function evaluatePrediction(prediction: Prediction, match: Match): boolean {
  if (!match.score?.winner) {
    return false;
  }

  return (
    (prediction.pick === 'HOME' && match.score.winner === 'HOME_TEAM') ||
    (prediction.pick === 'AWAY' && match.score.winner === 'AWAY_TEAM') ||
    (prediction.pick === 'DRAW' && match.score.winner === 'DRAW')
  );
}
