'use client';

import { useEffect, useRef } from 'react';

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
  const adRef = useRef<HTMLModElement | null>(null);

  useEffect(() => {
    if (!clientId || !slotId) return;

    let cancelled = false;
    let attempts = 0;

    const tryInitAd = () => {
      if (cancelled) return;
      attempts += 1;

      const el = adRef.current;
      if (!el) return;

      // Avoid duplicate initialization on the same ad element.
      if (el.getAttribute('data-adsbygoogle-status')) return;

      const scriptReady =
        typeof window !== 'undefined' &&
        Array.isArray(window.adsbygoogle) &&
        typeof window.adsbygoogle.push === 'function';

      if (!scriptReady) {
        if (attempts < 20) {
          window.setTimeout(tryInitAd, 300);
        }
        return;
      }

      try {
        window.adsbygoogle = window.adsbygoogle || [];
        window.adsbygoogle.push({});
      } catch {
        if (attempts < 20) {
          window.setTimeout(tryInitAd, 300);
        }
      }
    };

    // Defer slightly to avoid racing the async script injection.
    window.setTimeout(tryInitAd, 120);

    return () => {
      cancelled = true;
    };
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
        ref={adRef}
        className="adsbygoogle block min-h-[90px] w-full"
        style={{ display: 'block' }}
        data-ad-client={clientId}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
        suppressHydrationWarning
      />
    </section>
  );
}
