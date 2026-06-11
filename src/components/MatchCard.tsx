'use client';

import { Clock, MapPin } from 'lucide-react';
import type { Match, Odds, PredictionBundle } from '@/types';
import { cn, formatTaiwanTime, statusToChinese } from '@/lib/utils';
import { useRevealed } from '@/lib/use-revealed';
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

  return (
    <article
      className={cn(
        'group flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-sm transition',
        'hover:border-cyan-400/30 hover:shadow-[0_0_30px_-15px_rgba(34,211,238,0.4)]',
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
              'rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider',
              isLive && 'animate-pulse bg-red-500/20 text-red-300',
              isFinished && 'bg-slate-700/50 text-slate-300',
              !isLive && !isFinished && 'bg-cyan-500/20 text-cyan-300',
            )}
          >
            {isLive && '● '}
            {statusToChinese(match.status)}
          </span>
        </div>
      </div>

      {/* 雙方對戰 */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <TeamBlock
          flag={match.homeTeam.flag}
          name={match.homeTeam.name}
          tla={match.homeTeam.tla}
          isWinner={winner === 'HOME_TEAM'}
          align="right"
        />

        <div className="flex flex-col items-center">
          {isFinished || isLive ? (
            <div className="font-mono text-2xl font-bold text-white tabular-nums">
              {match.score?.fullTime.home ?? '-'}
              <span className="mx-1 text-slate-500">:</span>
              {match.score?.fullTime.away ?? '-'}
            </div>
          ) : (
            <div className="text-xl font-bold text-slate-400">VS</div>
          )}
          {match.group && (
            <span className="mt-0.5 text-[10px] tracking-wider text-slate-500">
              GROUP {match.group}
            </span>
          )}
        </div>

        <TeamBlock
          flag={match.awayTeam.flag}
          name={match.awayTeam.name}
          tla={match.awayTeam.tla}
          isWinner={winner === 'AWAY_TEAM'}
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
        />
      )}
    </article>
  );
}

function TeamBlock({
  flag,
  name,
  tla,
  isWinner,
  align,
}: {
  flag: string;
  name: string;
  tla: string;
  isWinner?: boolean;
  align: 'left' | 'right';
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2',
        align === 'right' ? 'flex-row-reverse text-right' : 'text-left',
      )}
    >
      <span className="text-3xl drop-shadow-md sm:text-4xl">{flag}</span>
      <div className="min-w-0">
        <div
          className={cn(
            'truncate text-sm font-bold sm:text-base',
            isWinner ? 'text-cyan-300' : 'text-white',
          )}
        >
          {name}
        </div>
        <div className="text-[10px] tracking-wider text-slate-500">{tla}</div>
      </div>
    </div>
  );
}
