'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

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
const SUPPORT_URL_FREE =
  process.env.NEXT_PUBLIC_SUPPORT_URL_FREE ??
  'https://www.paypal.com/ncp/payment/6ZQLBUR9VTV3J';

export default function SupportCard({ className = '' }: SupportCardProps) {
  const [burstKey, setBurstKey] = useState(0);
  const [activeLabel, setActiveLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!activeLabel) return;

    const timer = window.setTimeout(() => {
      setActiveLabel(null);
    }, 950);

    return () => window.clearTimeout(timer);
  }, [activeLabel]);

  const triggerBurst = (label: string) => {
    setBurstKey((prev) => prev + 1);
    setActiveLabel(label);
  };

  const options = [
    { amount: 60, url: SUPPORT_URL_60, label: 'NT$60' },
    { amount: 120, url: SUPPORT_URL_120, label: 'NT$120' },
    { amount: 300, url: SUPPORT_URL_300, label: 'NT$300' },
    {
      amount: '自由贊助',
      url: SUPPORT_URL_FREE,
      label: '自由贊助',
    },
  ];

  return (
    <aside
      className={`relative w-full overflow-hidden ${className}`}
      aria-label="小額贊助"
    >
      <h3 className="text-base font-bold text-white">請章魚哥喝杯珍奶 🧋</h3>
      <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
        支持伺服器與資料維運，讓賽事更新更即時。
      </p>

      <AnimatePresence>
        {activeLabel && (
          <motion.div
            key={`${burstKey}-${activeLabel}`}
            className="pointer-events-none absolute right-2 top-0 text-xs font-semibold text-pink-300"
            initial={{ opacity: 0, y: 6, scale: 0.9 }}
            animate={{ opacity: 1, y: -12, scale: 1 }}
            exit={{ opacity: 0, y: -24, scale: 1.05 }}
            transition={{ duration: 0.85, ease: 'easeOut' }}
          >
            謝謝支持 {activeLabel} ✨
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-2.5 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {options.map((item) => (
          <motion.a
            key={String(item.amount)}
            href={item.url}
            target="_blank"
            rel="noreferrer"
            onClick={() => triggerBurst(item.label)}
            className="inline-flex items-center justify-center rounded-lg border border-pink-300/50 bg-pink-500/15 px-2 py-1.5 text-xs font-semibold text-pink-100 transition hover:bg-pink-500/25"
            whileHover={{ y: -1, scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
          >
            {typeof item.amount === 'number' ? `NT$${item.amount}` : item.amount}
          </motion.a>
        ))}
      </div>


    </aside>
  );
}
