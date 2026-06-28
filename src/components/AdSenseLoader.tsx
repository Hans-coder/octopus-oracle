'use client';

import { useEffect } from 'react';

const ADSENSE_CLIENT_ID =
  process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID ?? 'ca-pub-4662523495462452';

/**
 * 在 useEffect (瀏覽器端) 動態插入 AdSense script。
 * - 不使用 next/script，避免 Next.js 注入 data-nscript attribute，
 *   該屬性會被 AdSense 驗證器警告。
 * - 因為只在 useEffect 執行，完全不影響 SSR / hydration。
 */
export default function AdSenseLoader() {
  useEffect(() => {
    const existing = document.querySelector(
      'script[src*="adsbygoogle.js"]'
    );
    if (existing) return;

    const script = document.createElement('script');
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`;
    script.async = true;
    script.crossOrigin = 'anonymous';
    document.head.appendChild(script);
  }, []);

  return null;
}
