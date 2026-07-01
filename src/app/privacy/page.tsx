export const metadata = {
  title: '隱私權政策 | Octopus Oracle',
  description: 'Octopus Oracle 隱私權政策與資料使用說明。',
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 text-slate-200 sm:px-6">
      <h1 className="text-3xl font-bold text-cyan-300">隱私權政策</h1>
      <div className="mt-6 space-y-6 text-sm leading-7 text-slate-300">
        <section>
          <h2 className="text-lg font-semibold text-white">1. 資料蒐集</h2>
          <p className="mt-2">
            本站可能蒐集基本瀏覽紀錄、裝置資訊、Cookie 與互動事件，用於網站維運、流量分析、廣告審核與功能優化。
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-white">2. 資料用途</h2>
          <p className="mt-2">
            蒐集到的資料僅用於改善內容品質、維持服務穩定、檢視預測模型表現，以及第三方廣告與金流服務所需的基本技術流程。
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-white">3. 第三方服務</h2>
          <p className="mt-2">
            本站可能使用 Google AdSense、PayPal、綠界等第三方服務。相關資料處理將依各服務商的隱私政策與法規要求進行。
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-white">4. 聯絡方式</h2>
          <p className="mt-2">
            若對本政策有疑問，請透過聯絡頁提供的方式與我們聯繫。
          </p>
        </section>
      </div>
    </div>
  );
}