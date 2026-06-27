'use client';

import { useEffect } from 'react';

export default function AdSenseScript({ clientId }: { clientId: string }) {
  useEffect(() => {
    // Avoid inserting duplicate scripts
    const existingScript = document.querySelector(
      `script[src*="adsbygoogle.js"]`
    );
    if (existingScript) return;

    const script = document.createElement('script');
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`;
    script.async = true;
    script.crossOrigin = 'anonymous';
    document.head.appendChild(script);
  }, [clientId]);

  return null;
}
