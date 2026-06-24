'use client';

import { useEffect } from 'react';
import Script from 'next/script';

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

type AdBannerProps = {
  className?: string;
  label?: string;
};

export default function AdBanner({
  className = '',
  label = '贊助廣告',
}: AdBannerProps) {
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  const slotId = process.env.NEXT_PUBLIC_ADSENSE_SLOT_ID;

  useEffect(() => {
    if (!clientId || !slotId) return;

    try {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
    } catch {
      // Ignore ad script push errors so UI keeps rendering.
    }
  }, [clientId, slotId]);

  if (!clientId || !slotId) {
    return (
      <div
        className={`rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4 text-xs text-amber-200 ${className}`}
      >
        <p className="font-semibold">{label}</p>
        <p className="mt-1 text-amber-100/80">
          尚未設定 Google AdSense。請加入 NEXT_PUBLIC_ADSENSE_CLIENT_ID 與
          NEXT_PUBLIC_ADSENSE_SLOT_ID。
        </p>
      </div>
    );
  }

  return (
    <section
      aria-label={label}
      className={`overflow-hidden rounded-2xl border border-cyan-500/40 bg-slate-900/50 p-3 ${className}`}
    >
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-cyan-300/90">
        {label}
      </p>
      <Script
        id="adsense-script"
        async
        strategy="afterInteractive"
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`}
        crossOrigin="anonymous"
      />
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
