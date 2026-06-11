import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
  hint?: string;
  accent?: 'cyan' | 'amber' | 'emerald' | 'rose';
}

const accentMap = {
  cyan: 'from-cyan-500/20 to-cyan-500/0 text-cyan-300',
  amber: 'from-amber-500/20 to-amber-500/0 text-amber-300',
  emerald: 'from-emerald-500/20 to-emerald-500/0 text-emerald-300',
  rose: 'from-rose-500/20 to-rose-500/0 text-rose-300',
};

export default function StatCard({
  icon,
  label,
  value,
  hint,
  accent = 'cyan',
}: StatCardProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br p-4',
        accentMap[accent],
      )}
    >
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-300">
            {label}
          </div>
          <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-white sm:text-3xl">
            {value}
          </div>
          {hint && (
            <div className="mt-1 text-[11px] text-slate-400">{hint}</div>
          )}
        </div>
        <span className="text-3xl drop-shadow-md">{icon}</span>
      </div>
    </div>
  );
}
