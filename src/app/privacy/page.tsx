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
          <h2 className="text-lg font-semibold text-white">3. Google 廣告與 Cookie</h2>
          <p className="mt-2">
            本站使用 Google AdSense。Google 與其合作夥伴可能會使用 Cookie、網路信標、IP 位址或其他裝置識別資訊，
            依據你造訪本站及其他網站的情況提供、投放與衡量廣告。
          </p>
          <p className="mt-2">
            你可以前往 Google 的廣告設定管理個人化廣告偏好，也可以參考 Google 對合作夥伴網站資料使用方式的說明。
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-white">4. 第三方服務</h2>
          <p className="mt-2">
            本站可能使用 Google AdSense、PayPal、綠界等第三方服務。相關資料處理將依各服務商的隱私政策與法規要求進行。
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-white">5. 聯絡方式</h2>
          <p className="mt-2">
            若對本政策有疑問，請透過聯絡頁提供的方式與我們聯繫。
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-white">6. 參考連結</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <a
                href="https://policies.google.com/technologies/partner-sites"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-300 underline decoration-cyan-500/40 underline-offset-2"
              >
                Google 如何運用合作夥伴網站或應用程式中的資訊
              </a>
            </li>
            <li>
              <a
                href="https://myadcenter.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-300 underline decoration-cyan-500/40 underline-offset-2"
              >
                Google 廣告設定
              </a>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}