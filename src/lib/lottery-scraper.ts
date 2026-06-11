import * as cheerio from 'cheerio';
import type { Match, Odds } from '@/types';
import { generateMockOdds } from './mock-data';

/**
 * 台灣運彩 — 足球賠率爬蟲
 *
 * ⚠️ 注意事項：
 * - 台灣運彩官網 (https://www.sportslottery.com.tw) 為 SPA，
 *   靜態 fetch 可能無法取得完整賠率資料
 * - 若需要正式上線，建議使用 Playwright/Puppeteer
 * - 目前若爬取失敗，會回退至「依 FIFA 排名生成的擬真賠率」
 * - 請務必尊重對方 robots.txt 與服務條款，控制爬取頻率
 */

const LOTTERY_BASE = 'https://www.sportslottery.com.tw';

interface ScrapedOddsRow {
  homeName: string;
  awayName: string;
  homeWin?: number;
  draw?: number;
  awayWin?: number;
}

async function fetchLotteryHtml(): Promise<string | null> {
  try {
    const res = await fetch(`${LOTTERY_BASE}/web/`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        Accept: 'text/html',
      },
      next: { revalidate: 1800 }, // 30 分鐘快取
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function parseOddsFromHtml(html: string): ScrapedOddsRow[] {
  const $ = cheerio.load(html);
  const rows: ScrapedOddsRow[] = [];

  // 由於台彩 SPA 結構複雜，這裡示範通用解析骨架
  // 實際 selector 需要根據抓回來的 DOM 結構調整
  $('[data-match], .match-row, .game-row').each((_, el) => {
    const $el = $(el);
    const homeName = $el.find('.home-team, .team-home').text().trim();
    const awayName = $el.find('.away-team, .team-away').text().trim();
    const numbers = $el
      .find('.odds, .rate')
      .map((_, n) => parseFloat($(n).text().trim()))
      .get()
      .filter((n) => !isNaN(n));

    if (homeName && awayName && numbers.length >= 3) {
      rows.push({
        homeName,
        awayName,
        homeWin: numbers[0],
        draw: numbers[1],
        awayWin: numbers[2],
      });
    }
  });

  return rows;
}

function matchScrapedRow(match: Match, rows: ScrapedOddsRow[]): ScrapedOddsRow | undefined {
  const homeKeys = [match.homeTeam.name, match.homeTeam.nameEn, match.homeTeam.tla];
  const awayKeys = [match.awayTeam.name, match.awayTeam.nameEn, match.awayTeam.tla];
  return rows.find(
    (r) =>
      homeKeys.some((k) => r.homeName.includes(k)) &&
      awayKeys.some((k) => r.awayName.includes(k)),
  );
}

/**
 * 取得多場比賽的賠率（爬蟲 + fallback）
 */
export async function getOddsForMatches(matches: Match[]): Promise<Odds[]> {
  const useMock = process.env.USE_MOCK_DATA !== 'false';

  if (useMock) {
    return matches.map(generateMockOdds);
  }

  const html = await fetchLotteryHtml();
  if (!html) {
    return matches.map(generateMockOdds);
  }

  const rows = parseOddsFromHtml(html);

  return matches.map((match): Odds => {
    const row = matchScrapedRow(match, rows);
    if (row?.homeWin && row.draw && row.awayWin) {
      return {
        matchId: match.id,
        homeWin: row.homeWin,
        draw: row.draw,
        awayWin: row.awayWin,
        source: '台灣運彩',
        updatedAt: new Date().toISOString(),
      };
    }
    return generateMockOdds(match);
  });
}

/** 將賠率 array 轉成 Map 方便查詢 */
export function oddsToMap(odds: Odds[]): Map<string, Odds> {
  return new Map(odds.map((o) => [o.matchId, o]));
}
