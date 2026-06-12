'use client';

import { Clock, MapPin, CheckCircle2, XCircle, Trophy } from 'lucide-react';
import type { Match, Odds, Prediction } from '@/types';
import { cn, formatTaiwanTime, statusToChinese } from '@/lib/utils';
import { useRevealed } from '@/lib/use-revealed';
import { actualPickFromMatch } from '@/lib/octopus';
import OctopusPredictor from './OctopusPredictor';
import OddsDisplay from './OddsDisplay';

interface MatchCardProps {
  match: Match;
  odds?: Odds;
  prediction?: Prediction;
}

export default function MatchCard({ match, odds, prediction }: MatchCardProps) {
  const isFinished = match.status === 'FINISHED';
  const isLive = match.status === 'LIVE' || match.status === 'IN_PLAY';
  const winner = match.score?.winner;

  const autoReveal = isFinished || isLive;
  const { revealed, hydrated, markRevealed } = useRevealed(match.id, autoReveal);

  const actual = isFinished ? actualPickFromMatch(match) : null;
  const isCorrect =
    isFinished && prediction && actual ? prediction.pick === actual : null;

  return (
    <article
      className={cn(
        'group flex flex-col gap-4 rounded-3xl border bg-slate-900/60 p-5 backdrop-blur-sm transition',
        isFinished
          ? 'border-white/15 hover:border-amber-400/30 hover:shadow-[0_0_30px_-15px_rgba(251,191,36,0.4)]'
          : isLive
            ? 'border-red-500/30 shadow-[0_0_25px_-10px_rgba(248,113,113,0.5)]'
            : 'border-white/10 hover:border-cyan-400/30 hover:shadow-[0_0_30px_-15px_rgba(34,211,238,0.4)]',
      )}
    >
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

      <div
        className={cn(
          'grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl p-1 transition',
          isFinished &&
            'bg-gradient-to-r from-transparent via-slate-800/40 to-transparent',
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
                isFinished
                  ? 'text-3xl drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]'
                  : 'text-2xl',
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

      {match.venue && (
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <MapPin className="h-3 w-3" />
          <span className="truncate">{match.venue}</span>
        </div>
      )}

      {isFinished && prediction && isCorrect !== null && (
        <PredictionVerdict prediction={prediction} isCorrect={isCorrect} />
      )}

      <OddsDisplay
        odds={odds}
        highlight={prediction?.pick}
        showHighlight={hydrated && revealed}
      />

      {prediction && (
        <OctopusPredictor
          prediction={prediction}
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
/*  PredictionVerdict — 賽後章魚哥對錯總結                   */
/* ────────────────────────────────────────────────────────── */
function PredictionVerdict({
  prediction,
  isCorrect,
}: {
  prediction: Prediction;
  isCorrect: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2 rounded-2xl border px-3 py-2',
        isCorrect
          ? 'border-amber-400/40 bg-amber-500/10'
          : 'border-rose-500/30 bg-rose-500/5',
      )}
    >
      <div className="flex items-center gap-1.5 text-[11px]">
        {isCorrect ? (
          <Trophy className="h-3.5 w-3.5 text-amber-300" />
        ) : (
          <XCircle className="h-3.5 w-3.5 text-rose-300" />
        )}
        <span
          className={cn(
            'font-medium',
            isCorrect ? 'text-amber-200' : 'text-rose-200',
          )}
        >
          {isCorrect ? '章魚哥神準命中！' : '章魚哥這次失準 🥲'}
        </span>
      </div>
      <div
        className={cn(
          'flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]',
          isCorrect
            ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200'
            : 'border-rose-400/30 bg-rose-500/10 text-rose-200',
        )}
        title={`章魚哥選了 ${prediction.pickedTeamName}`}
      >
        <span>🐙</span>
        <span>{prediction.pickedTeamFlag}</span>
        {isCorrect ? (
          <CheckCircle2 className="h-2.5 w-2.5" />
        ) : (
          <XCircle className="h-2.5 w-2.5" />
        )}
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
