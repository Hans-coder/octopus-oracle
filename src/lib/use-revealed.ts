'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'octopus-revealed-v1';

function readSet(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'));
  } catch {
    return new Set();
  }
}

function writeSet(set: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    /* quota exceeded — silently ignore */
  }
}

/**
 * 章魚哥神諭揭曉狀態管理
 *
 * @param matchId 比賽 ID
 * @param autoReveal 為 true 時強制揭曉（用於已結束 / 進行中的比賽）
 *
 * 揭曉狀態會持久化在 localStorage，重整頁面後仍記得
 * 「重看一次動畫」不影響 localStorage（揭曉狀態保持）
 */
export function useRevealed(matchId: string, autoReveal = false) {
  // SSR 一律 false，等 hydration 後再讀 localStorage（避免 mismatch）
  const [revealed, setRevealed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    if (autoReveal || readSet().has(matchId)) {
      setRevealed(true);
    }
  }, [matchId, autoReveal]);

  const markRevealed = useCallback(() => {
    const set = readSet();
    set.add(matchId);
    writeSet(set);
    setRevealed(true);
  }, [matchId]);

  return { revealed, hydrated, markRevealed };
}
