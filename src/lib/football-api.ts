import type { Match } from '@/types';
import { fetchMatchesFromESPN } from './espn-api';

/**
 * 賽程資料入口 — 公開使用 ESPN 隱藏 API（無需 API key）
 *
 * 流程：
 *   1. 嘗試 ESPN（site.api.espn.com/.../fifa.world/scoreboard）
 *   2. ESPN 掛了 / 拿不到任何賽事 → 回傳空陣列，前端顯示資料暫不可用
 *
 * 沒有任何 env 變數要設定。
 */

export async function getMatches(): Promise<Match[]> {
  try {
    const matches = await fetchMatchesFromESPN({ days: 21 });
    if (matches.length === 0) {
      console.warn('[football-api] ESPN 回傳 0 場，回傳空資料');
      return [];
    }
    return matches;
  } catch (err) {
    console.error('[football-api] ESPN 失敗，回傳空資料：', err);
    return [];
  }
}

/** 抓單一場次（依 id）*/
export async function getMatchById(id: string): Promise<Match | undefined> {
  const all = await getMatches();
  return all.find((m) => m.id === id);
}
