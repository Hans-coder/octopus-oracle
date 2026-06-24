'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

type AdBannerProps = {
  className?: string;
  label?: string;
};

const ADSENSE_CLIENT_ID =
  process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID ?? 'ca-pub-4662523495462452';
const ADSENSE_SLOT_ID =
  process.env.NEXT_PUBLIC_ADSENSE_SLOT_ID ?? '7355293133';

export default function AdBanner({
  className = '',
  label = '贊助廣告',
}: AdBannerProps) {
  const clientId = ADSENSE_CLIENT_ID;
  const slotId = ADSENSE_SLOT_ID;

  useEffect(() => {
    if (!clientId || !slotId) return;

    try {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
    } catch {
      // Ignore ad script push errors so UI keeps rendering.
    }
  }, [clientId, slotId]);

  return (
    <section
      aria-label={label}
      className={`overflow-hidden rounded-2xl border border-cyan-500/40 bg-slate-900/50 p-3 ${className}`}
    >
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-cyan-300/90">
        {label}
      </p>
      <ins
        className="adsbygoogle block min-h-[90px] w-full"
        style={{ display: 'block' }}
        data-ad-client={clientId}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </section>
  );
}
