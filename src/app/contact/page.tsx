export const metadata = {
  title: '聯絡我們 | Octopus Oracle',
  description: 'Octopus Oracle 聯絡方式、合作洽詢、錯誤回報與廣告合作。',
};

const categories = [
  {
    icon: '🐛',
    title: '資料錯誤回報',
    desc: '若發現賽事資料或賠率有誤，請來信描述問題場次與時間，我們會盡快確認並修正。',
  },
  {
    icon: '🤝',
    title: '商業合作 / 廣告',
    desc: '歡迎體育相關品牌、媒體或工具洽談合作廣告、內容贊助或數據授權方案。',
  },
  {
    icon: '💡',
    title: '功能建議',
    desc: '對網站功能、預測呈現方式或賽事涵蓋範圍有想法？隨時歡迎告訴我們。',
  },
  {
    icon: '🔒',
    title: '隱私與資料',
    desc: '若對本站的資料蒐集或隱私政策有疑問，請寄信，我們會在 3 個工作天內回覆。',
  },
];

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 text-slate-200 sm:px-6">
      <h1 className="text-3xl font-bold text-cyan-300">聯絡我們</h1>
      <p className="mt-3 text-sm leading-7 text-slate-300">
        有任何問題、建議或合作需求，都可以透過以下方式與我們聯絡。我們是一個小型獨立開發團隊，
        致力於提供可追蹤、透明的足球預測資訊。
      </p>

      {/* 聯絡資訊卡 */}
      <div className="mt-8 rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-slate-800/60 to-slate-900/60 p-6">
        <div className="flex items-center gap-3">
          <span className="text-3xl">📬</span>
          <div>
            <p className="text-sm font-semibold text-white">Email</p>
            <a
              href="mailto:mon850927@gmail.com"
              className="text-cyan-400 underline underline-offset-2 hover:text-cyan-300 transition text-sm"
            >
              mon850927@gmail.com
            </a>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-300 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-3">
            <p className="font-semibold text-white">服務項目</p>
            <p className="mt-1 leading-6">體育數據網站・預測工具・網頁開發</p>
          </div>
          <div className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-3">
            <p className="font-semibold text-white">回覆時間</p>
            <p className="mt-1 leading-6">一般於 3 個工作天內回覆</p>
          </div>
          <div className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-3 col-span-2 sm:col-span-1">
            <p className="font-semibold text-white">語言</p>
            <p className="mt-1 leading-6">中文（繁體）/ English</p>
          </div>
        </div>
      </div>

      {/* 聯絡類別 */}
      <h2 className="mt-10 text-lg font-bold text-white">可以聯絡我們的事項</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {categories.map((cat) => (
          <div
            key={cat.title}
            className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-4"
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">{cat.icon}</span>
              <p className="text-sm font-semibold text-white">{cat.title}</p>
            </div>
            <p className="mt-2 text-xs leading-6 text-slate-300">{cat.desc}</p>
          </div>
        ))}
      </div>

      {/* 補充說明 */}
      <div className="mt-8 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs leading-6 text-slate-300">
        <p>
          ⚠️ 本站預測內容僅供娛樂參考，若需回報關於結果保證、投注建議的誤解性資訊，請直接來信，
          我們會認真處理。
        </p>
      </div>
    </div>
  );
}