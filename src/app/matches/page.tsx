import { getAggregatedData } from '@/lib/page-data';
import { formatTaiwanDate } from '@/lib/utils';
import MatchCard from '@/components/MatchCard';

export const revalidate = 300;

export default async function MatchesPage() {
  const { matches, oddsMap, predictions } = await getAggregatedData();

  // 按日期分組
  const grouped = matches
    .slice()
    .sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime())
    .reduce<Record<string, typeof matches>>((acc, m) => {
      const key = new Date(m.utcDate).toLocaleDateString('en-CA', {
        timeZone: 'Asia/Taipei',
      });
      acc[key] = acc[key] ? [...acc[key], m] : [m];
      return acc;
    }, {});

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          全部賽程
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          共 {matches.length} 場・賽程來自 ESPN 官方資料，每場附章魚哥神諭與「章魚推算盤」（含大小分 / 雙方均得分 / 上半場等台彩主要玩法）
        </p>
      </header>

      {Object.entries(grouped).map(([dateKey, items]) => (
        <section key={dateKey} className="mb-12">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-cyan-300">
            <span className="h-px flex-1 bg-gradient-to-r from-cyan-400/40 to-transparent" />
            {formatTaiwanDate(items[0].utcDate)}
            <span className="h-px flex-1 bg-gradient-to-l from-cyan-400/40 to-transparent" />
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                odds={oddsMap.get(m.id)}
                prediction={predictions.get(m.id)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
