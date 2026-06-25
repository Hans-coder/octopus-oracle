type SupportCardProps = {
  className?: string;
};

const SUPPORT_URL_60 =
  process.env.NEXT_PUBLIC_SUPPORT_URL_60 ??
  'https://www.paypal.com/ncp/payment/9QCA832QU7HFS';
const SUPPORT_URL_120 =
  process.env.NEXT_PUBLIC_SUPPORT_URL_120 ??
  'https://www.paypal.com/ncp/payment/62QWVWR7TYALJ';
const SUPPORT_URL_300 =
  process.env.NEXT_PUBLIC_SUPPORT_URL_300 ??
  'https://www.paypal.com/ncp/payment/Z4MJ5H4FVT4MJ';

export default function SupportCard({ className = '' }: SupportCardProps) {
  const options = [
    { amount: 60, url: SUPPORT_URL_60 },
    { amount: 120, url: SUPPORT_URL_120 },
    { amount: 300, url: SUPPORT_URL_300 },
  ];

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
        {options.map((item) => (
          <a
            key={item.amount}
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-lg border border-pink-300/50 bg-pink-500/15 px-2 py-1.5 text-xs font-semibold text-pink-100 transition hover:bg-pink-500/25"
          >
            NT${item.amount}
          </a>
        ))}
      </div>

      <a
        href={SUPPORT_URL_120}
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-flex w-full items-center justify-center rounded-lg bg-pink-500 px-3 py-2 text-xs font-bold text-white transition hover:bg-pink-400"
      >
        立即贊助
      </a>
    </aside>
  );
}
