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
      className={`w-full rounded-2xl border border-pink-400/40 bg-gradient-to-r from-pink-900/20 via-slate-900/60 to-pink-900/20 p-3 backdrop-blur ${className}`}
      aria-label="小額贊助"
    >
      <h3 className="text-base font-bold text-white">請章魚哥喝杯珍奶 🧋</h3>
      <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
        支持伺服器與資料維運，讓賽事更新更即時。
      </p>

      <div className="mt-2.5 grid grid-cols-3 gap-1.5">
        {amounts.map((amount) => (
          <a
            key={amount}
            href={amountUrl(amount)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-lg border border-pink-300/50 bg-pink-500/15 px-2 py-1.5 text-xs font-semibold text-pink-100 transition hover:bg-pink-500/25"
            aria-disabled={!SUPPORT_URL}
          >
            NT${amount}
          </a>
        ))}
      </div>

      <a
        href={SUPPORT_URL || '#'}
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-pink-500 px-3 py-2 text-xs font-bold text-white transition hover:bg-pink-400"
        aria-disabled={!SUPPORT_URL}
      >
        立即贊助
      </a>

      {!SUPPORT_URL && (
        <p className="mt-2 rounded-lg border border-amber-400/50 bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-200">
          尚未設定贊助連結：請在 Vercel 加入 NEXT_PUBLIC_SUPPORT_URL
        </p>
      )}
    </aside>
  );
}
