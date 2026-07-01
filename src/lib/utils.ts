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

/**
 * 取得 UTC+8（台灣）時間的 Date 物件
 * 用 UTC 方法讀取，避免 toLocaleString ICU 版本差異造成 hydration #418
 */
function toTaiwanDate(iso: string): Date {
  return new Date(new Date(iso).getTime() + 8 * 60 * 60 * 1000);
}

const WEEKDAY_SHORT = ['日', '一', '二', '三', '四', '五', '六'];
const WEEKDAY_LONG  = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

/** 格式化成台灣時區時間字串（手動 UTC+8，Server/Client 輸出完全一致） */
export function formatTaiwanTime(iso: string): string {
  const d = toTaiwanDate(iso);
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mi = String(d.getUTCMinutes()).padStart(2, '0');
  const wd = WEEKDAY_SHORT[d.getUTCDay()];
  return `${mm}/${dd} (${wd}) ${hh}:${mi}`;
}

export function formatTaiwanDate(iso: string): string {
  const d = toTaiwanDate(iso);
  const month = d.getUTCMonth() + 1;
  const day   = d.getUTCDate();
  const wd    = WEEKDAY_LONG[d.getUTCDay()];
  return `${month}月${day}日 ${wd}`;
}

export function isSameTaiwanDay(a: string, b: string): boolean {
  const fmt = (s: string) => {
    const d = toTaiwanDate(s);
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return `${d.getUTCFullYear()}-${mm}-${dd}`;
  };
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

export function confidenceToLabel(confidence: number): string {
  if (confidence >= 0.72) return '主推';
  if (confidence >= 0.56) return '偏向';
  if (confidence >= 0.45) return '五五波';
  return '冷門留意';
}

export function confidenceToRange(confidence: number): string {
  if (confidence >= 0.72) return '七成以上';
  if (confidence >= 0.56) return '五成六到七成一';
  if (confidence >= 0.45) return '五成上下';
  return '四成五以下';
}
