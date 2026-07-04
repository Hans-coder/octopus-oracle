const ADS_ENABLED = process.env.NEXT_PUBLIC_ADS_ENABLED === 'true';

type AdBannerProps = {
  className?: string;
  label?: string;
};

export default function AdBanner({
  className = '',
  label = '贊助廣告',
}: AdBannerProps) {
  // 廣告審核中，暫時隱藏
  if (!ADS_ENABLED) return null;

  return (
    <section
      aria-label={label}
      className={`overflow-hidden rounded-2xl border border-cyan-500/40 bg-slate-900/50 p-3 ${className}`}
    >
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-cyan-300/90">
        {label}
      </p>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-4662523495462452"
        data-ad-slot="7355293133"
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
      <script
        dangerouslySetInnerHTML={{
          __html: '(adsbygoogle = window.adsbygoogle || []).push({});',
        }}
      />
    </section>
  );
}
