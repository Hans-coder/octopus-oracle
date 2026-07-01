'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Heart, MinusCircle, TrendingUp, XCircle } from 'lucide-react';
import { cn, confidenceToLabel, confidenceToRange, formatTaiwanTime } from '@/lib/utils';
import AdBanner from '@/components/AdBanner';

interface LeaderboardContentProps {
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
  recentAccuracy: {
    total: number;
    evaluated: number;
    correct: number;
    accuracy: number;
  };
  oddsBaselineAccuracy: {
    total: number;
    evaluated: number;
    correct: number;
    accuracy: number;
  };
  engineName: string;
  minEvaluated: number;
}

export function LeaderboardContent({
  accuracy,
  recentAccuracy,
  oddsBaselineAccuracy,
  engineName,
  minEvaluated,
}: LeaderboardContentProps) {
  const hasEnough = accuracy.evaluated >= minEvaluated;
  const hasEnoughRecent = recentAccuracy.evaluated >= minEvaluated;
  const baselineDelta = (accuracy.accuracy - oddsBaselineAccuracy.accuracy) * 100;

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

        <div className="mt-4 rounded-xl border border-violet-500/40 bg-violet-900/20 px-4 py-3">
          <p className="text-xs font-medium text-violet-300">近期 30 場準確率</p>
          <p className="mt-1 text-2xl font-bold text-violet-200">
            {hasEnoughRecent ? `${Math.round(recentAccuracy.accuracy * 100)}%` : '—'}
          </p>
          <p className="text-xs text-violet-200/80">
            {recentAccuracy.correct} / {recentAccuracy.evaluated} 場命中
          </p>
        </div>

        <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-900/20 px-4 py-3">
          <p className="text-xs font-medium text-emerald-300">和單看盤口相比</p>
          <p className="mt-1 text-2xl font-bold text-emerald-200">
            {oddsBaselineAccuracy.evaluated > 0
              ? baselineDelta >= 0
                ? `高 ${baselineDelta.toFixed(1)}pp`
                : `低 ${Math.abs(baselineDelta).toFixed(1)}pp`
              : '—'}
          </p>
          <p className="text-xs text-emerald-200/80">
            用來比較章魚哥是否真的比直接照盤口更有優勢。盤口基準 {Math.round(oddsBaselineAccuracy.accuracy * 100)}% · {oddsBaselineAccuracy.correct} / {oddsBaselineAccuracy.evaluated} 場
          </p>
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
        <AdBanner className="mb-4" label="準確率頁面贊助廣告" />
        <LeaderboardPredictionRecords />
      </section>
    </div>
  );
}

interface LeaderboardRecord {
  matchId: string;
  pickedTeam: string;
  pickedTeamFlag: string;
  picked: string;
  actual: string;
  correct: boolean | null;
  confidence: number;
  evaluatedAt: string;
  match: {
    utcDate: string | null;
    homeName: string | null;
    awayName: string | null;
    homeFlag: string | null;
    awayFlag: string | null;
    homeScore: number | null;
    awayScore: number | null;
  };
}

const RECORDS_PAGE_SIZE = 20;

function LeaderboardPredictionRecords() {
  const [records, setRecords] = useState<LeaderboardRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(RECORDS_PAGE_SIZE);

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const res = await fetch('/api/accuracy-records?limit=200&offset=0');
        if (!res.ok) throw new Error('無法取得預測紀錄');

        const json = await res.json();
        setRecords(Array.isArray(json.records) ? json.records : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : '讀取失敗');
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();
  }, []);

  if (loading) {
    return <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-6 text-center text-slate-400">載入預測紀錄中...</div>;
  }

  if (error) {
    return <div className="rounded-2xl border border-rose-500/40 bg-rose-900/20 p-6 text-center text-rose-300">{error}</div>;
  }

  if (records.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-600 bg-slate-800 p-8 text-center">
        <p className="text-4xl mb-2">⚽</p>
        <p className="text-sm text-slate-400">尚無可評估賽果。</p>
      </div>
    );
  }

  const visibleRecords = records.slice(0, visibleCount);
  const hasMore = visibleCount < records.length;

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {visibleRecords.map((record) => (
          <PredictionRecordRow key={record.matchId} record={record} />
        ))}
      </ul>

      <div className="flex items-center justify-between text-xs text-slate-400">
        <p>已顯示 {visibleRecords.length} / {records.length} 筆</p>
        {hasMore ? (
          <button
            onClick={() => setVisibleCount((prev) => prev + RECORDS_PAGE_SIZE)}
            className="rounded-lg border border-cyan-500/40 px-3 py-1.5 font-medium text-cyan-300 transition hover:border-cyan-400 hover:text-cyan-200"
          >
            載入更多
          </button>
        ) : (
          <span>已顯示全部</span>
        )}
      </div>
    </div>
  );
}

function PredictionRecordRow({ record }: { record: LeaderboardRecord }) {
  const [likes, setLikes] = useState(0);
  const isDrawResult = record.actual === 'DRAW';
  const displayDate = record.match.utcDate ?? record.evaluatedAt;
  const hasScore =
    typeof record.match.homeScore === 'number' &&
    typeof record.match.awayScore === 'number';
  const confidence = Math.max(0, Math.min(1, record.confidence / 100));

  return (
    <li
      className={cn(
        'rounded-2xl border-2 px-4 py-3 transition-all hover:shadow-lg backdrop-blur overflow-hidden',
        record.correct === true
          ? 'border-emerald-500/50 bg-emerald-900/20'
          : record.correct === false
            ? 'border-rose-500/50 bg-rose-900/20'
            : 'border-slate-600 bg-slate-800/40',
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-slate-100">
            <span className="text-lg">{record.match.homeFlag ?? '🏳️'}</span>
            <span className="max-w-[10rem] whitespace-normal break-words leading-tight sm:max-w-[12rem]">{record.match.homeName ?? '主隊'}</span>
            <span className="font-mono text-cyan-400 bg-slate-700/50 rounded px-2 py-1">
              {hasScore ? `${record.match.homeScore}-${record.match.awayScore}` : 'FT'}
            </span>
            <span className="max-w-[10rem] whitespace-normal break-words leading-tight sm:max-w-[12rem]">{record.match.awayName ?? '客隊'}</span>
            <span className="text-lg">{record.match.awayFlag ?? '🏳️'}</span>
          </div>

          <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
            <span>{formatTaiwanTime(displayDate)}</span>
            {isDrawResult && (
              <span className="inline-flex items-center gap-1 bg-slate-700/50 px-2 py-1 rounded-full border border-slate-600">
                <MinusCircle className="h-3 w-3" /> 和局
              </span>
            )}
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:flex-nowrap sm:gap-3">
          <div className="flex min-w-0 items-center gap-2 rounded-xl border border-cyan-500/50 bg-slate-700/50 px-3 py-2">
            <span className="max-w-[9rem] whitespace-normal break-words text-sm font-semibold leading-tight text-slate-100 sm:max-w-[12rem]">
              {record.pickedTeamFlag} {record.pickedTeam}
            </span>
            {record.correct === true ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            ) : record.correct === false ? (
              <XCircle className="h-4 w-4 text-rose-400" />
            ) : null}
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-cyan-400">{confidenceToLabel(confidence)}</p>
            <p className="text-[10px] text-slate-400">{confidenceToRange(confidence)}</p>
          </div>
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
