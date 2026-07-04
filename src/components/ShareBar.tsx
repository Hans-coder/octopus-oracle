'use client';

import { useState } from 'react';
import { Share2, Check } from 'lucide-react';

interface ShareBarProps {
  url?: string;
  title?: string;
  className?: string;
}

export default function ShareBar({
  url,
  title = '章魚哥 Oracle｜2026 世界盃預測',
  className = '',
}: ShareBarProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl =
    url ?? (typeof window !== 'undefined' ? window.location.href : 'https://octopus-oracle.vercel.app');
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(title);

  const shareLinks = [
    {
      id: 'threads',
      label: 'Threads',
      emoji: '🧵',
      // Threads 使用 Instagram 的分享 intent
      href: `https://www.threads.net/intent/post?text=${encodedTitle}%0A${encodedUrl}`,
      color: 'border-white/20 bg-white/5 text-white hover:bg-white/10',
    },
    {
      id: 'line',
      label: 'LINE',
      emoji: '💬',
      href: `https://line.me/R/msg/text/?${encodedTitle}%0A${encodedUrl}`,
      color: 'border-green-500/30 bg-green-500/10 text-green-300 hover:bg-green-500/20',
    },
    {
      id: 'twitter',
      label: 'X / Twitter',
      emoji: '🐦',
      href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
      color: 'border-sky-500/30 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20',
    },
    {
      id: 'facebook',
      label: 'Facebook',
      emoji: '📘',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      color: 'border-blue-500/30 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20',
    },
  ];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: do nothing
    }
  };

  // 優先嘗試 Web Share API（手機原生分享）
  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, url: shareUrl });
        return;
      } catch {
        // user cancelled, ignore
      }
    }
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
        <Share2 className="h-3 w-3" />
        分享
      </div>

      {/* 手機：優先顯示原生分享按鈕 */}
      <button
        onClick={handleNativeShare}
        className="sm:hidden inline-flex items-center gap-1.5 rounded-full border border-cyan-400/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-500/20"
      >
        <Share2 className="h-3 w-3" />
        分享給朋友
      </button>

      {/* 桌面：各平台按鈕 */}
      <div className="hidden sm:flex flex-wrap gap-1.5">
        {shareLinks.map((link) => (
          <a
            key={link.id}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition ${link.color}`}
            aria-label={`分享到 ${link.label}`}
          >
            <span>{link.emoji}</span>
            <span>{link.label}</span>
          </a>
        ))}
      </div>

      {/* 複製連結 */}
      <button
        onClick={handleCopy}
        className="inline-flex items-center gap-1 rounded-full border border-slate-600/50 bg-slate-700/30 px-2.5 py-1 text-xs font-medium text-slate-300 transition hover:bg-slate-700/50"
        aria-label="複製連結"
      >
        {copied ? (
          <>
            <Check className="h-3 w-3 text-emerald-400" />
            <span className="text-emerald-300">已複製！</span>
          </>
        ) : (
          <>
            <span>🔗</span>
            <span>複製連結</span>
          </>
        )}
      </button>
    </div>
  );
}
