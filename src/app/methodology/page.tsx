export const metadata = {
  title: '模型方法論 | Octopus Oracle',
  description: '章魚哥預測模型的資料來源、計算流程、評估指標與限制說明。',
};

export default function MethodologyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 text-slate-200 sm:px-6">
      <h1 className="text-3xl font-bold text-cyan-300">模型方法論</h1>
      <p className="mt-3 text-sm leading-7 text-slate-300">
        這個頁面完整說明章魚哥預測引擎如何產生每場比賽的機率，包含資料來源、特徵權重、評估方式與已知限制。
        我們希望讓所有預測都可被檢查、可被質疑，而不是黑箱結論。
      </p>

      <div className="mt-8 space-y-6 text-sm leading-7 text-slate-300">
        <section>
          <h2 className="text-lg font-semibold text-white">1. 資料來源</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>賽程與完賽比分：ESPN 公開資料端點。</li>
            <li>盤口資訊：以可取得的國際盤口資料整合，並保留更新時間戳。</li>
            <li>球隊強度：以 Elo 作為長期強度基礎。</li>
            <li>近期狀態：納入近況與基本狀態因子，避免只看歷史等級。</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">2. 預測流程</h2>
          <p className="mt-2">
            每場比賽先建立主勝、和局、客勝三向機率，再做合理化與校正，最後輸出信心分級與文字解讀。
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>盤口隱含機率：反映市場共識。</li>
            <li>Elo 對戰機率：反映隊伍長期實力差。</li>
            <li>近期狀態調整：反映短期變化。</li>
            <li>賽事階段權重：淘汰賽與分組賽使用不同保守程度。</li>
            <li>信心校正：降低過度自信，提升可解釋性。</li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">3. 透明度與評估</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>公開歷史命中率與近期 30 場命中率。</li>
            <li>對比純盤口基準，檢查模型是否真的有額外價值。</li>
            <li>提供 Brier Score 與 Log Loss，避免只看命中率。</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">4. 已知限制</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>即時傷病、臨場陣容與突發事件可能無法完整即時反映。</li>
            <li>樣本不足時，短期準確率波動會明顯放大。</li>
            <li>本模型提供的是機率推估，不是保證結果。</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white">5. 使用原則</h2>
          <p className="mt-2">
            本站內容僅供資訊與娛樂用途，不構成投資或投注建議。請遵守所在地法規並理性參與。
          </p>
        </section>
      </div>
    </div>
  );
}
