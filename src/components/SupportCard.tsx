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
const SUPPORT_URL_FREE = process.env.NEXT_PUBLIC_SUPPORT_URL_FREE ?? '';

export default function SupportCard({ className = '' }: SupportCardProps) {
  const options = [
    { amount: 60, url: SUPPORT_URL_60 },
    { amount: 120, url: SUPPORT_URL_120 },
    { amount: 300, url: SUPPORT_URL_300 },
    { amount: '自由贊助', url: SUPPORT_URL_FREE || SUPPORT_URL_120 },
  ];

  return (
    <aside
      className={`w-full ${className}`}
      aria-label="小額贊助"
    >
      <h3 className="text-base font-bold text-white">請章魚哥喝杯珍奶 🧋</h3>
      <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
        支持伺服器與資料維運，讓賽事更新更即時。
      </p>

      <div className="mt-2.5 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {options.map((item) => (
          <a
            key={String(item.amount)}
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-lg border border-pink-300/50 bg-pink-500/15 px-2 py-1.5 text-xs font-semibold text-pink-100 transition hover:bg-pink-500/25"
          >
            {typeof item.amount === 'number' ? `NT$${item.amount}` : item.amount}
          </a>
        ))}
      </div>

      {!SUPPORT_URL_FREE && (
        <p className="mt-1.5 text-[10px] text-slate-400">
          可選填 NEXT_PUBLIC_SUPPORT_URL_FREE 作為自由贊助連結。
        </p>
      )}
    </aside>
  );
}
