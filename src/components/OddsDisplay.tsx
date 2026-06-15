'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Odds, PredictionPick } from '@/types';
import { cn } from '@/lib/utils';

interface OddsDisplayProps {
  odds?: Odds;
  highlight?: PredictionPick;
  /** 是否顯示 highlight；false 時即使有 highlight 也不會套用樣式（避免提前破梗） */
  showHighlight?: boolean;
}

export default function OddsDisplay({
  odds,
  highlight,
  showHighlight = false,
}: OddsDisplayProps) {
  const [expanded, setExpanded] = useState(false);

  if (!odds) {
    return (
      <div className="rounded-xl border border-white/10 bg-slate-900/50 p-3 text-center text-xs text-slate-400">
        賠率資料載入中…
      </div>
    );
  }

  const cells: Array<{ key: PredictionPick; label: string; value: number }> = [
    { key: 'HOME', label: '主勝', value: odds.homeWin },
    { key: 'DRAW', label: '和局', value: odds.draw },
    { key: 'AWAY', label: '客勝', value: odds.awayWin },
  ];

  // 「章魚推算盤」是誘明的稱呼，不算 mock；只有舊「模擬」 / mock 才要警告
  const isMock = /模擬|mock/i.test(odds.source);
  const hasExtras =
    !!odds.markets &&
    !!(
      odds.markets.overUnder ||
      odds.markets.btts ||
      odds.markets.halfTime ||
      odds.markets.handicap ||
      odds.markets.totalGoals ||
      odds.markets.correctScore
    );

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-3 gap-1.5">
        {cells.map((c) => {
          const isHighlight = showHighlight && highlight === c.key;
          return (
            <div
              key={c.key}
              className={cn(
                'flex flex-col items-center rounded-lg border px-2 py-2 transition duration-500',
                isHighlight
                  ? 'border-cyan-400/60 bg-cyan-400/15 shadow-[0_0_15px_-3px_rgba(34,211,238,0.5)]'
                  : 'border-white/10 bg-slate-900/40',
              )}
            >
              <span className="text-[10px] uppercase tracking-wider text-slate-400">
                {c.label}
              </span>
              <span
                className={cn(
                  'font-mono text-base font-bold tabular-nums transition-colors duration-500',
                  isHighlight ? 'text-cyan-300' : 'text-white',
                )}
              >
                {c.value.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>

      {/* 更多玩法（可折疊） */}
      {hasExtras && (
        <div className="rounded-lg border border-white/5 bg-slate-900/30">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex w-full items-center justify-between px-2.5 py-1.5 text-[10px] font-medium text-slate-400 transition hover:text-cyan-200"
            aria-expanded={expanded}
          >
            <span>📊 更多玩法（{countMarkets(odds)} 種）</span>
            <ChevronDown
              className={cn(
                'h-3 w-3 transition-transform',
                expanded && 'rotate-180',
              )}
            />
          </button>
          {expanded && (
            <div className="grid gap-1.5 px-2 pb-2 pt-1 sm:grid-cols-2">
              {odds.markets?.overUnder && (
                <OUCell market={odds.markets.overUnder} />
              )}
              {odds.markets?.btts && <BTTSCell market={odds.markets.btts} />}
              {odds.markets?.halfTime && (
                <HTCell market={odds.markets.halfTime} />
              )}
              {odds.markets?.handicap && (
                <AHCell market={odds.markets.handicap} />
              )}
              {odds.markets?.totalGoals && (
                <TotalGoalsCell market={odds.markets.totalGoals} />
              )}
              {odds.markets?.correctScore && (
                <CorrectScoreCell market={odds.markets.correctScore} />
              )}
            </div>
          )}
        </div>
      )}

      <p
        className={cn(
          'text-center text-[10px]',
          isMock ? 'text-amber-400/70' : 'text-slate-500',
        )}
      >
        {isMock && '⚠️ '}
        資料來源：{odds.source}
      </p>
    </div>
  );
}

/* ─────────────── 子元件 ─────────────── */

function MarketCell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-white/5 bg-slate-900/50 px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-wider text-slate-500">
        {title}
      </div>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}

function TwoCol({
  left,
  leftLabel,
  right,
  rightLabel,
}: {
  left: number;
  leftLabel: string;
  right: number;
  rightLabel: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2 font-mono text-xs">
      <span className="text-slate-200">
        {leftLabel}{' '}
        <span className="text-white tabular-nums">{left.toFixed(2)}</span>
      </span>
      <span className="text-slate-200">
        {rightLabel}{' '}
        <span className="text-white tabular-nums">{right.toFixed(2)}</span>
      </span>
    </div>
  );
}

function OUCell({
  market,
}: {
  market: NonNullable<NonNullable<Odds['markets']>['overUnder']>;
}) {
  return (
    <MarketCell title={`大小分 ${market.line}`}>
      <TwoCol
        leftLabel="大"
        left={market.overOdds}
        rightLabel="小"
        right={market.underOdds}
      />
    </MarketCell>
  );
}

function BTTSCell({
  market,
}: {
  market: NonNullable<NonNullable<Odds['markets']>['btts']>;
}) {
  return (
    <MarketCell title="雙方均得分">
      <TwoCol
        leftLabel="是"
        left={market.yesOdds}
        rightLabel="否"
        right={market.noOdds}
      />
    </MarketCell>
  );
}

function HTCell({
  market,
}: {
  market: NonNullable<NonNullable<Odds['markets']>['halfTime']>;
}) {
  return (
    <MarketCell title="上半場不讓分">
      <div className="grid grid-cols-3 gap-1 font-mono text-[11px]">
        <span className="text-center text-slate-400">
          主<span className="block tabular-nums text-white">{market.homeWin.toFixed(2)}</span>
        </span>
        <span className="text-center text-slate-400">
          和<span className="block tabular-nums text-white">{market.draw.toFixed(2)}</span>
        </span>
        <span className="text-center text-slate-400">
          客<span className="block tabular-nums text-white">{market.awayWin.toFixed(2)}</span>
        </span>
      </div>
    </MarketCell>
  );
}

function AHCell({
  market,
}: {
  market: NonNullable<NonNullable<Odds['markets']>['handicap']>;
}) {
  const sign = market.line > 0 ? '+' : '';
  return (
    <MarketCell title={`讓分盤 主 ${sign}${market.line}`}>
      <TwoCol
        leftLabel="主"
        left={market.homeOdds}
        rightLabel="客"
        right={market.awayOdds}
      />
    </MarketCell>
  );
}

function TotalGoalsCell({
  market,
}: {
  market: NonNullable<NonNullable<Odds['markets']>['totalGoals']>;
}) {
  return (
    <MarketCell title="總進球數">
      <div className="grid grid-cols-4 gap-0.5 font-mono text-[10px]">
        {market.brackets.map((b) => (
          <span
            key={b.label}
            className="rounded bg-slate-800/40 px-1 py-0.5 text-center"
          >
            <span className="block text-slate-400">{b.label}</span>
            <span className="tabular-nums text-white">{b.odds.toFixed(1)}</span>
          </span>
        ))}
      </div>
    </MarketCell>
  );
}

function CorrectScoreCell({
  market,
}: {
  market: NonNullable<NonNullable<Odds['markets']>['correctScore']>;
}) {
  const top4 = market.scores.slice(0, 4);
  return (
    <MarketCell title="波膽 Top 4">
      <div className="grid grid-cols-4 gap-0.5 font-mono text-[10px]">
        {top4.map((s, i) => (
          <span
            key={i}
            className="rounded bg-slate-800/40 px-1 py-0.5 text-center"
          >
            <span className="block text-slate-300">
              {s.home}-{s.away}
            </span>
            <span className="tabular-nums text-white">{s.odds.toFixed(1)}</span>
          </span>
        ))}
      </div>
    </MarketCell>
  );
}

function countMarkets(odds: Odds): number {
  if (!odds.markets) return 0;
  return [
    odds.markets.overUnder,
    odds.markets.btts,
    odds.markets.halfTime,
    odds.markets.handicap,
    odds.markets.totalGoals,
    odds.markets.correctScore,
  ].filter(Boolean).length;
}
