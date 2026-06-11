'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'octopus-revealed-v1';

function readRawSnapshot(): string {
  if (typeof window === 'undefined') return '[]';
  return localStorage.getItem(STORAGE_KEY) ?? '[]';
}

function writeRawSnapshot(value: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* quota exceeded — silently ignore */
  }
}

// 多分頁同步 + 內部廣播
const listeners = new Set<() => void>();
function notify() {
  for (const cb of listeners) cb();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) cb();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', onStorage);
  };
}

// 快取 snapshot 避免 useSyncExternalStore 無限渲染
let cachedSnapshot = '[]';
function getSnapshot() {
  const raw = readRawSnapshot();
  if (raw !== cachedSnapshot) cachedSnapshot = raw;
  return cachedSnapshot;
}
function getServerSnapshot() {
  return '[]';
}

/**
 * 章魚哥神諭揭曉狀態管理（React 19 / Next.js 16 SSR-safe）
 *
 * 使用 useSyncExternalStore 直接訂閱 localStorage，
 * 避免 useEffect + setState 造成 cascading render。
 *
 * @param matchId 比賽 ID
 * @param autoReveal 為 true 時強制揭曉（用於已結束 / 進行中的比賽）
 */
export function useRevealed(matchId: string, autoReveal = false) {
  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const set = useMemo<Set<string>>(() => {
    try {
      return new Set<string>(JSON.parse(snapshot) as string[]);
    } catch {
      return new Set<string>();
    }
  }, [snapshot]);

  // SSR snapshot 永遠是 '[]' → revealed=false（不論 autoReveal）
  // client hydrate 後拿到真實 snapshot → 若 autoReveal 或已 reveal 則 true
  const hydrated = snapshot !== '[]' || (typeof window !== 'undefined' && snapshot === '[]');
  const revealed = hydrated && (autoReveal || set.has(matchId));

  const markRevealed = useCallback(() => {
    const next = new Set(set);
    next.add(matchId);
    const serialized = JSON.stringify([...next]);
    writeRawSnapshot(serialized);
    cachedSnapshot = serialized;
    notify();
  }, [matchId, set]);

  return { revealed, hydrated, markRevealed };
}
