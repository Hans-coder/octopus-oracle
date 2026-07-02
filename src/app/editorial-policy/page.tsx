export const metadata = {
  title: '編輯政策與更新紀錄 | Octopus Oracle',
  description: 'Octopus Oracle 的內容編輯原則、修正流程與版本更新紀錄。',
};

const updateLogs = [
  {
    date: '2026-07-02',
    title: '新增方法論與內容型頁面',
    notes: '補充模型流程、站點定位與審核導向內容，提升資訊完整度。',
  },
  {
    date: '2026-06-29',
    title: '加入近期/歷史準確率與基準比較',
    notes: '新增最近樣本表現與純盤口基準，避免單一指標誤導。',
  },
  {
    date: '2026-06-24',
    title: '上線賽事預測主流程',
    notes: '整合賽程、機率計算與預測卡片展示。',
  },
];

export default function EditorialPolicyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 text-slate-200 sm:px-6">
      <h1 className="text-3xl font-bold text-cyan-300">編輯政策與更新紀錄</h1>
      <p className="mt-3 text-sm leading-7 text-slate-300">
        本站採取可追溯的內容更新流程。任何模型邏輯、資料來源或介面文字的重要變更，都會在此頁保留紀錄，
        讓讀者能清楚知道內容何時更新、更新了什麼、以及為何更新。
      </p>

      <section className="mt-8 rounded-2xl border border-slate-700 bg-slate-900/40 p-5">
        <h2 className="text-lg font-semibold text-white">編輯政策</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-300">
          <li>一致性原則：同類比賽使用同一套預測流程，不做人為挑選。</li>
          <li>可檢驗原則：保留歷史紀錄，包含準確與失誤，不只展示最佳結果。</li>
          <li>透明原則：公開資料來源、模型摘要、更新時間與主要限制。</li>
          <li>修正原則：若發現錯誤，優先修正並在更新紀錄註明修正原因。</li>
          <li>商業分離原則：廣告與贊助內容不影響模型輸出邏輯。</li>
        </ul>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-700 bg-slate-900/40 p-5">
        <h2 className="text-lg font-semibold text-white">更新紀錄</h2>
        <div className="mt-4 space-y-3">
          {updateLogs.map((item) => (
            <article key={`${item.date}-${item.title}`} className="rounded-xl border border-slate-700/70 bg-slate-800/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">{item.date}</p>
              <h3 className="mt-1 text-sm font-semibold text-white">{item.title}</h3>
              <p className="mt-1 text-sm text-slate-300">{item.notes}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
