export const metadata = {
  title: '常見問題 FAQ | Octopus Oracle',
  description: 'Octopus Oracle 的常見問題與使用說明。',
};

const faqs = [
  {
    question: '這個網站是保證獲利的投注工具嗎？',
    answer:
      '不是。本站提供的是機率資訊與模型觀點，僅供研究與娛樂用途，不構成投注建議。',
  },
  {
    question: '你們的預測是怎麼算出來的？',
    answer:
      '主要結合盤口隱含機率、Elo 強度與近期狀態，再做階段權重與信心校正。完整流程可看模型方法論頁。',
  },
  {
    question: '為什麼有時候預測會錯？',
    answer:
      '足球賽事存在高隨機性，臨場傷病、紅牌、戰術調整都會影響結果。模型提供的是機率，不是確定答案。',
  },
  {
    question: '為什麼你們會同時公開近期與歷史準確率？',
    answer:
      '近期表現可觀察短期狀態，歷史表現可避免短期波動誤導，兩者一起看更完整。',
  },
  {
    question: '資料多久更新一次？',
    answer:
      '網站會定期更新賽程與盤口資訊，首頁會顯示最新更新時間。若來源延遲，頁面會保留可追溯時間戳。',
  },
  {
    question: '可以聯絡你們回報問題或合作嗎？',
    answer:
      '可以，請到聯絡我們頁面寄信，通常 3 個工作天內回覆。',
  },
];

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 text-slate-200 sm:px-6">
      <h1 className="text-3xl font-bold text-cyan-300">常見問題 FAQ</h1>
      <p className="mt-3 text-sm leading-7 text-slate-300">
        這裡整理使用者最常問的問題，包含模型原理、資料更新與風險聲明。
      </p>

      <div className="mt-8 space-y-3">
        {faqs.map((faq) => (
          <details key={faq.question} className="group rounded-xl border border-slate-700 bg-slate-900/40 p-4 open:border-cyan-500/40">
            <summary className="cursor-pointer list-none text-sm font-semibold text-white">
              {faq.question}
            </summary>
            <p className="mt-2 text-sm leading-7 text-slate-300">{faq.answer}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
