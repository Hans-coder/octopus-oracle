type SupportCardProps = {
  className?: string;
};

const SUPPORT_URL = process.env.NEXT_PUBLIC_SUPPORT_URL ?? '';

function amountUrl(amount: number): string {
  if (!SUPPORT_URL) return '#';
  const separator = SUPPORT_URL.includes('?') ? '&' : '?';
  return `${SUPPORT_URL}${separator}amount=${amount}`;
}

export default function SupportCard({ className = '' }: SupportCardProps) {
  const amounts = [60, 120, 300];

  return (
    <aside
      className={`w-full rounded-2xl border border-fuchsia-400/40 bg-slate-900/70 p-4 backdrop-blur ${className}`}
      aria-label="小額贊助"
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-fuchsia-300">
        小額專案贊助
      </p>
      <h3 className="mt-2 text-lg font-bold text-white">支持章魚哥持續更新</h3>
      <p className="mt-1 text-xs leading-relaxed text-slate-300">
        伺服器、資料抓取與功能優化都需要成本，你的支持能讓專案走更久。
      </p>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {amounts.map((amount) => (
          <a
            key={amount}
            href={amountUrl(amount)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-lg border border-fuchsia-300/50 bg-fuchsia-500/15 px-2 py-2 text-xs font-semibold text-fuchsia-100 transition hover:bg-fuchsia-500/25"
            aria-disabled={!SUPPORT_URL}
          >
            NT${amount}
          </a>
        ))}
      </div>

      {!SUPPORT_URL && (
        <p className="mt-2 rounded-lg border border-amber-400/50 bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-200">
          尚未設定贊助連結：請在 Vercel 加入 NEXT_PUBLIC_SUPPORT_URL
        </p>
      )}

      <div className="mt-3 rounded-xl border border-slate-600/70 bg-slate-950/50 p-2.5">
        <p className="text-[11px] font-semibold text-cyan-300">贊助注意事項（避免爭議）</p>
        <ul className="mt-1.5 space-y-1 text-[11px] leading-relaxed text-slate-300">
          <li>1. 贊助為自願支持，非投資、非購買保證收益服務。</li>
          <li>2. 預測內容僅供娛樂參考，不構成任何投資或下注建議。</li>
          <li>3. 贊助不影響預測結果，亦不提供命中率或報酬保證。</li>
          <li>4. 若有退款或爭議，依支付平台規則與流程處理。</li>
        </ul>
      </div>
    </aside>
  );
}
