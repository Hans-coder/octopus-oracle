export const metadata = {
  title: '關於本站 | Octopus Oracle',
  description: 'Octopus Oracle 的目標、內容方針、更新方式與責任聲明。',
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 text-slate-200 sm:px-6">
      <h1 className="text-3xl font-bold text-cyan-300">關於本站</h1>
      <p className="mt-3 text-sm leading-7 text-slate-300">
        Octopus Oracle 是一個專注在足球賽事機率分析的內容型網站。
        我們的核心目標不是「猜中比分」本身，而是提供可追蹤、可比較、可檢驗的預測框架。
      </p>

      <div className="mt-8 space-y-6 text-sm leading-7 text-slate-300">
        <section>
          <h2 className="text-lg font-semibold text-white">內容方針</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>每場比賽都附帶同一套機率流程，避免人為挑場解讀。</li>
            <li>所有歷史成績可回看，包含命中與失誤。</li>
            <li>模型版本與更新時間公開，降低資訊不對稱。</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">更新頻率</h2>
          <p className="mt-2">
            站內資料會定期更新賽程與盤口。若來源端發生延遲或中斷，頁面會保留可追溯的時間資訊，
            讓讀者判斷資料時效性。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">廣告與贊助</h2>
          <p className="mt-2">
            本站有廣告與贊助入口以支持維運，但不會出售比賽結果或保證獲利內容。
            我們會維持編輯內容與商業訊息的可辨識界線。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">責任聲明</h2>
          <p className="mt-2">
            所有預測僅供資訊參考，不構成投注建議。使用者需自行評估風險並遵守所在地法律。
          </p>
        </section>
      </div>
    </div>
  );
}
