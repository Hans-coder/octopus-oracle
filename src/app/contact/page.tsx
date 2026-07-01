export const metadata = {
  title: '聯絡我們 | Octopus Oracle',
  description: 'Octopus Oracle 聯絡方式與合作洽詢。',
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 text-slate-200 sm:px-6">
      <h1 className="text-3xl font-bold text-cyan-300">聯絡我們</h1>
      <div className="mt-6 space-y-4 text-sm leading-7 text-slate-300">
        <p>
          若你對網站內容、技術合作、資料授權、廣告合作或贊助方案有疑問，歡迎來信洽詢。
        </p>
        <div className="rounded-2xl border border-slate-700 bg-slate-900/50 p-4">
          <p><span className="font-semibold text-white">Email：</span> contact@octopusoracle.app</p>
          <p className="mt-2"><span className="font-semibold text-white">服務類型：</span> 體育數據網站、預測工具、網頁與 App 開發服務</p>
          <p className="mt-2"><span className="font-semibold text-white">回覆時間：</span> 一般於 3 個工作天內回覆</p>
        </div>
      </div>
    </div>
  );
}