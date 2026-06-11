import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** className 合併工具 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Mulberry32 — 種子化偽隨機數產生器
 * 確保相同 match 永遠得到相同的章魚哥預測，避免畫面閃爍
 */
export function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function stringToSeed(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** 格式化成台灣時區時間字串 */
export function formatTaiwanTime(iso: string): string {
  return new Date(iso).toLocaleString('zh-TW', {
    timeZone: 'Asia/Taipei',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hour12: false,
  });
}

export function formatTaiwanDate(iso: string): string {
  return new Date(iso).toLocaleDateString('zh-TW', {
    timeZone: 'Asia/Taipei',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
}

export function isSameTaiwanDay(a: string, b: string): boolean {
  const fmt = (s: string) =>
    new Date(s).toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
  return fmt(a) === fmt(b);
}

export function isToday(iso: string): boolean {
  return isSameTaiwanDay(iso, new Date().toISOString());
}

export function isPast(iso: string): boolean {
  return new Date(iso).getTime() < Date.now();
}

/** 將 stage 翻成中文 */
export function stageToChinese(stage: string): string {
  const map: Record<string, string> = {
    GROUP_STAGE: '小組賽',
    LAST_32: '32 強',
    LAST_16: '16 強',
    QUARTER_FINALS: '8 強',
    SEMI_FINALS: '4 強',
    THIRD_PLACE: '季軍戰',
    FINAL: '冠軍戰',
  };
  return map[stage] ?? stage;
}

/** 將 status 翻成中文 */
export function statusToChinese(status: string): string {
  const map: Record<string, string> = {
    SCHEDULED: '尚未開賽',
    TIMED: '尚未開賽',
    LIVE: '進行中',
    IN_PLAY: '進行中',
    PAUSED: '中場休息',
    FINISHED: '已結束',
    POSTPONED: '延期',
    SUSPENDED: '暫停',
    CANCELLED: '取消',
  };
  return map[status] ?? status;
}
