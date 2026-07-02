import { getAggregatedData } from '@/lib/page-data';
import { formatTaiwanDate } from '@/lib/utils';
import MatchCard from '@/components/MatchCard';
import AdBanner from '@/components/AdBanner';

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
        <h1 className="flex items-center gap-3 text-3xl font-bold text-cyan-300 sm:text-4xl">
          <span className="text-4xl">⚽</span>
          賽程一覽
        </h1>
        <p className="mt-2 text-slate-300">共 <span className="font-semibold text-cyan-200">{matches.length}</span> 場，含章魚哥的神諭與即時賠率。</p>
      </header>

      <section className="mb-6 rounded-2xl border border-slate-700 bg-slate-900/40 p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-cyan-300">如何使用這個賽程頁</h2>
        <p className="mt-2 text-sm leading-7 text-slate-300">
          這個頁面不是單純轉貼賽程。我們把每場比賽依日期整理，並附上模型預測與盤口資訊，方便你從同一個頁面比較比賽時間、對戰組合與機率觀點。
          如果你只想快速掌握重點，可以先看今日賽事；如果你想觀察模型在不同時點的預測分布，再依日期往後檢查即將開賽的場次。
        </p>
      </section>

      <AdBanner className="mb-6" label="賽程贊助內容" />

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

      {matches.length > 0 && <AdBanner className="mt-2" label="更多足球優惠" />}

      <section className="mt-8 rounded-2xl border border-slate-700 bg-slate-900/40 p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-cyan-300">閱讀提醒</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-7 text-slate-300">
          <li>賠率與資料更新可能有時間差，請以官方來源為準。</li>
          <li>預測是機率觀點，不代表必然結果。</li>
          <li>若你要看模型長期表現，請搭配準確率頁一起閱讀。</li>
        </ul>
      </section>
    </div>
  );
}
