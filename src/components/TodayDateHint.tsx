'use client';

import { useState, useEffect } from 'react';
import { formatTaiwanDate } from '@/lib/utils';

/**
 * 客戶端渲染今日日期，避免 Server Component 使用 new Date()
 * 導致 build time 與 runtime 不一致，觸發 React hydration error #418。
 */
export default function TodayDateHint() {
  const [label, setLabel] = useState('');

  useEffect(() => {
    setLabel(formatTaiwanDate(new Date().toISOString()));
  }, []);

  return <>{label}</>;
}
