'use client';

import { Clock, MapPin, CheckCircle2, XCircle, Trophy } from 'lucide-react';
import type { Match, Odds, PredictionBundle, EngineId } from '@/types';
import { cn, formatTaiwanTime, statusToChinese } from '@/lib/utils';
import { useRevealed } from '@/lib/use-revealed';
import { ENGINE_META, actualPickFromMatch } from '@/lib/octopus';
import OctopusPredictor from './OctopusPredictor';
import OddsDisplay from './OddsDisplay';

interface MatchCardProps {
  match: Match;
  odds?: Odds;
  bundle?: PredictionBundle;
}

export default function MatchCard({ match, odds, bundle }: MatchCardProps) {
  const isFinished = match.status === 'FINISHED';
  const isLive = match.status === 'LIVE' || match.status === 'IN_PLAY';
  const winner = match.score?.winner;

  // 已結束 / 進行中的比賽自動揭曉，避免使用者要按按鈕
  const autoReveal = isFinished || isLive;
  const { revealed, hydrated, markRevealed } = useRevealed(match.id, autoReveal);

  // 神諭主角（決定 odds highlight 用哪一隻的 pick）：章魚哥本人
  const heroPick = bundle?.paul.pick;

  // 比賽結果評估（只在 finished 時有意義）
  const actual = isFinished ? actualPickFromMatch(match) : null;
  const correctEngines = bundle
    ? (['paul', 'doctor', 'oracle'] as EngineId[]).filter(
        (id) => bundle[id].pick === actual,
      )
    : [];

  return (
    <article
      className={cn(
        'group flex flex-col gap-4 rounded-3xl border bg-slate-900/60 p-5 backdrop-blur-sm transition',
        // 已結束的卡邊框略亮 / live 時紅色微微脈動
        isFinished
          ? 'border-white/15 hover:border-amber-400/30 hover:shadow-[0_0_30px_-15px_rgba(251,191,36,0.4)]'
          : isLive
            ? 'border-red-500/30 shadow-[0_0_25px_-10px_rgba(248,113,113,0.5)]'
            : 'border-white/10 hover:border-cyan-400/30 hover:shadow-[0_0_30px_-15px_rgba(34,211,238,0.4)]',
      )}
    >
      {/* Header — 時間 / 狀態 + 熱身賽標籤 */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          {formatTaiwanTime(match.utcDate)}
        </span>
        <div className="flex items-center gap-1.5">
          {match.isFriendly && (
            <span
              className="rounded-full bg-slate-700/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-300"
              title="熱身賽 / 友誼賽，不計入正賽神準率"
            >
              熱身賽
            </span>
          )}
          <span
            className={cn(
              'rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider',
              isLive && 'animate-pulse bg-red-500/20 text-red-300',
              isFinished &&
                'bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/30',
              !isLive && !isFinished && 'bg-cyan-500/20 text-cyan-300',
            )}
          >
            {isLive && '● '}
            {isFinished && '🏁 '}
            {statusToChinese(match.status)}
          </span>
        </div>
      </div>

      {/* 雙方對戰 — 已結束時放大比分 + 加贏家框 */}
      <div
        className={cn(
          'grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl p-1 transition',
          isFinished && 'bg-gradient-to-r from-transparent via-slate-800/40 to-transparent',
        )}
      >
        <TeamBlock
          flag={match.homeTeam.flag}
          name={match.homeTeam.name}
          tla={match.homeTeam.tla}
          isWinner={winner === 'HOME_TEAM'}
          isFinished={isFinished}
          align="right"
        />

        <div className="flex flex-col items-center">
          {isFinished || isLive ? (
            <div
              className={cn(
                'font-mono font-bold text-white tabular-nums',
                isFinished ? 'text-3xl drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]' : 'text-2xl',
              )}
            >
              <span
                className={cn(
                  winner === 'HOME_TEAM' && 'text-amber-300',
                  winner === 'AWAY_TEAM' && 'text-slate-400',
                )}
              >
                {match.score?.fullTime.home ?? '-'}
              </span>
              <span className="mx-1 text-slate-500">:</span>
              <span
                className={cn(
                  winner === 'AWAY_TEAM' && 'text-amber-300',
                  winner === 'HOME_TEAM' && 'text-slate-400',
                )}
              >
                {match.score?.fullTime.away ?? '-'}
              </span>
            </div>
          ) : (
            <div className="text-xl font-bold text-slate-400">VS</div>
          )}
          {match.group && (
            <span className="mt-0.5 text-[10px] tracking-wider text-slate-500">
              GROUP {match.group}
            </span>
          )}
          {isFinished && winner === 'DRAW' && (
            <span className="mt-0.5 rounded-full bg-slate-700/40 px-1.5 py-0.5 text-[9px] font-medium text-slate-300">
              和局
            </span>
          )}
        </div>

        <TeamBlock
          flag={match.awayTeam.flag}
          name={match.awayTeam.name}
          tla={match.awayTeam.tla}
          isWinner={winner === 'AWAY_TEAM'}
          isFinished={isFinished}
          align="left"
        />
      </div>

      {/* 場館 */}
      {match.venue && (
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <MapPin className="h-3 w-3" />
          <span className="truncate">{match.venue}</span>
        </div>
      )}

      {/* 比賽結束 — 章魚哥神諭審判結果（在賠率之上） */}
      {isFinished && bundle && actual && (
        <PredictionVerdict
          bundle={bundle}
          actual={actual}
          correctCount={correctEngines.length}
        />
      )}

      {/* 賠率 — 只有揭曉後才 highlight 章魚哥（hero）選的那項 */}
      <OddsDisplay
        odds={odds}
        highlight={heroPick}
        showHighlight={hydrated && revealed}
      />

      {/* 三隻章魚哥神諭 */}
      {bundle && (
        <OctopusPredictor
          bundle={bundle}
          match={match}
          revealed={revealed}
          hydrated={hydrated}
          onRevealComplete={markRevealed}
          actual={actual}
        />
      )}
    </article>
  );
}

/* ────────────────────────────────────────────────────────── */
/*  PredictionVerdict — 賽後三隻章魚哥對錯總結               */
/* ────────────────────────────────────────────────────────── */
function PredictionVerdict({
  bundle,
  actual,
  correctCount,
}: {
  bundle: PredictionBundle;
  actual: 'HOME' | 'DRAW' | 'AWAY';
  correctCount: number;
}) {
  const engines: EngineId[] = ['paul', 'doctor', 'oracle'];
  const allCorrect = correctCount === 3;
  const allWrong = correctCount === 0;

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2 rounded-2xl border px-3 py-2',
        allCorrect && 'border-amber-400/40 bg-amber-500/10',
        allWrong && 'border-rose-500/30 bg-rose-500/5',
        !allCorrect && !allWrong && 'border-emerald-500/25 bg-emerald-500/5',
      )}
    >
      <div className="flex items-center gap-1.5 text-[11px]">
        {allCorrect ? (
          <Trophy className="h-3.5 w-3.5 text-amber-300" />
        ) : allWrong ? (
          <XCircle className="h-3.5 w-3.5 text-rose-300" />
        ) : (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
        )}
        <span
          className={cn(
            'font-medium',
            allCorrect && 'text-amber-200',
            allWrong && 'text-rose-200',
            !allCorrect && !allWrong && 'text-emerald-200',
          )}
        >
          {allCorrect && '三隻全猜中！'}
          {allWrong && '三隻全槓龜 🥲'}
          {!allCorrect && !allWrong && `${correctCount} / 3 隻猜中`}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        {engines.map((id) => {
          const p = bundle[id];
          const meta = ENGINE_META[id];
          const correct = p.pick === actual;
          return (
            <div
              key={id}
              className={cn(
                'flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px]',
                correct
                  ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200'
                  : 'border-rose-400/30 bg-rose-500/10 text-rose-200',
              )}
              title={`${meta.name}：${p.pickedTeamName}${correct ? '（命中）' : '（未中）'}`}
            >
              <span>{meta.emoji}</span>
              {correct ? (
                <CheckCircle2 className="h-2.5 w-2.5" />
              ) : (
                <XCircle className="h-2.5 w-2.5" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TeamBlock({
  flag,
  name,
  tla,
  isWinner,
  isFinished,
  align,
}: {
  flag: string;
  name: string;
  tla: string;
  isWinner?: boolean;
  isFinished?: boolean;
  align: 'left' | 'right';
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-xl px-1 py-1 transition',
        align === 'right' ? 'flex-row-reverse text-right' : 'text-left',
        isFinished &&
          isWinner &&
          'bg-amber-400/10 ring-1 ring-amber-400/30',
      )}
    >
      <span className="text-3xl drop-shadow-md sm:text-4xl">{flag}</span>
      <div className="min-w-0">
        <div
          className={cn(
            'truncate text-sm font-bold sm:text-base',
            isWinner ? 'text-amber-200' : isFinished ? 'text-slate-400' : 'text-white',
          )}
        >
          {name}
          {isFinished && isWinner && (
            <Trophy className="ml-1 inline h-3 w-3 text-amber-300" />
          )}
        </div>
        <div className="text-[10px] tracking-wider text-slate-500">{tla}</div>
      </div>
    </div>
  );
}
