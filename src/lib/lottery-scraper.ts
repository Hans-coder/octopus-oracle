import type { Match, Odds } from '@/types';
import { generateMockOdds } from './mock-data';

/**
 * 賠率資料入口 — 「章魚推算盤」
 *
 * 台灣運彩沒有開放公開 API、官網是 SPA + Cloudflare 擋爬蟲，
 * 真實的台彩賠率拿不到，所以我們改走「章魚推算盤」：
 *
 *   - 用兩隊 Elo 評分 + Poisson xG 模型推算各種市場機率（見 lib/markets.ts）
 *   - 套上 8% 派彩率（≈ 台彩抽水）轉成賠率
 *   - 涵蓋台彩主要玩法：不讓分 / 大小分 / 讓分盤 / 雙方均得分 / 上半場 / 總進球數 / 波膽
 *
 * 完全在後端計算，零外部依賴。
 */

export async function getOddsForMatches(matches: Match[]): Promise<Odds[]> {
  return matches.map(generateMockOdds);
}

/** 將賠率 array 轉成 Map 方便查詢 */
export function oddsToMap(odds: Odds[]): Map<string, Odds> {
  return new Map(odds.map((o) => [o.matchId, o]));
}
