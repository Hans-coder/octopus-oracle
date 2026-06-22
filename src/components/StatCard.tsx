import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
  hint?: string;
  accent?: 'cyan' | 'emerald' | 'blue' | 'purple';
}

const ACCENT_STYLE: Record<NonNullable<StatCardProps['accent']>, string> = {
  cyan: 'border-cyan-500/50 bg-cyan-900/20 text-cyan-300',
  emerald: 'border-emerald-500/50 bg-emerald-900/20 text-emerald-300',
  blue: 'border-blue-500/50 bg-blue-900/20 text-blue-300',
  purple: 'border-purple-500/50 bg-purple-900/20 text-purple-300',
};

export default function StatCard({
  icon,
  label,
  value,
  hint,
  accent = 'cyan',
}: StatCardProps) {
  return (
    <article
      className={cn(
        'rounded-2xl border-2 p-4 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 backdrop-blur',
        ACCENT_STYLE[accent],
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-bold uppercase tracking-widest opacity-75">{label}</p>
          <p className="mt-2 text-3xl font-bold tabular-nums">{value}</p>
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
      {hint && <p className="mt-2 text-xs opacity-70 leading-snug">{hint}</p>}
    </article>
  );
}
