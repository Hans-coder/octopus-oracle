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

  const isMock = /模擬|mock/i.test(odds.source);

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
