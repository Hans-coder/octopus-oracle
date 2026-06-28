'use client';

import { useState, useEffect } from 'react';
import { formatTaiwanDate } from '@/lib/utils';

/**
 * 客戶端渲染今日日期，避免 Server Component 使用 new Date()
 * 導致 build time 與 runtime 不一致，觸發 React hydration error #418。
 *
 * 重要：初始值必須 return null 而非 ''（空字串）。
 * JSX 的 {''} 在 SSR 產生空 text node，但瀏覽器 HTML 解析器
 * 會丟棄空 text node，導致 hydration 時 React 找不到對應 DOM → #418。
 */
export default function TodayDateHint() {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    setLabel(formatTaiwanDate(new Date().toISOString()));
  }, []);

  if (!label) return null;
  return <>{label}</>;
}

