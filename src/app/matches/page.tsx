import { getAggregatedData } from '@/lib/page-data';
import { formatTaiwanDate } from '@/lib/utils';
import MatchCard from '@/components/MatchCard';

export const revalidate = 300;

export default async function MatchesPage() {
  const { matches, oddsMap, predictions } = await getAggregatedData();

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
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-8">
        <h1 className="flex items-center gap-3 text-3xl font-bold text-slate-900 sm:text-4xl">
          <span className="text-4xl">⚽</span>
          賽程一覽
        </h1>
        <p className="mt-2 text-slate-600">共 <span className="font-semibold">{matches.length}</span> 場，含章魚哥的神諭與即時賠率。</p>
      </header>

      {Object.entries(grouped).map(([dateKey, items]) => (
        <section key={dateKey} className="mb-8">
          <h2 className="mb-4 text-base font-bold text-cyan-400 uppercase tracking-wide border-l-4 border-cyan-500 pl-3">
            📅 {formatTaiwanDate(items[0].utcDate)}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

      {matches.length === 0 && (
        <div className="rounded-3xl border-2 border-slate-200 bg-slate-50 p-8 text-center">
          <p className="text-4xl mb-3">😴</p>
          <p className="text-slate-600">暫無賽程資料。</p>
        </div>
      )}
    </div>
  );
}
