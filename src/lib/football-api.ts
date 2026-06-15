import type { Match } from '@/types';
import { fetchMatchesFromESPN } from './espn-api';
import { mockMatches } from './mock-data';

/**
 * 賽程資料入口 — 公開使用 ESPN 隱藏 API（無需 API key）
 *
 * 流程：
 *   1. 嘗試 ESPN（site.api.espn.com/.../fifa.world/scoreboard）
 *   2. ESPN 掛了 / 拿不到任何賽事 → fallback 到 mock-data
 *
 * 沒有任何 env 變數要設定。
 */

export async function getMatches(): Promise<Match[]> {
  try {
    const matches = await fetchMatchesFromESPN({ days: 21 });
    if (matches.length === 0) {
      console.warn('[football-api] ESPN 回傳 0 場，回退到 mock');
      return mockMatches;
    }
    return matches;
  } catch (err) {
    console.error('[football-api] ESPN 失敗，回退到 mock：', err);
    return mockMatches;
  }
}

/** 抓單一場次（依 id）*/
export async function getMatchById(id: string): Promise<Match | undefined> {
  const all = await getMatches();
  return all.find((m) => m.id === id);
}
