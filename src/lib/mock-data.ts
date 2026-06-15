import type { Match, Odds, Team, ExtraMarkets } from '@/types';
import {
  asianHandicap,
  btts as bttsModel,
  correctScoreTop,
  expectedGoals,
  halfTime1x2,
  overUnder,
  probToOdds,
  probs1x2,
  totalGoalsBrackets,
} from './markets';
import { seededRandom, stringToSeed } from './utils';

/**
 * 2026 FIFA World Cup 模擬隊伍清單（部分）
 * 真實 API 串接後會被覆蓋
 */
const TEAMS: Record<string, Team> = {
  CAN: { id: 1, name: '加拿大', nameEn: 'Canada', tla: 'CAN', flag: '🇨🇦', group: 'A' },
  MEX: { id: 2, name: '墨西哥', nameEn: 'Mexico', tla: 'MEX', flag: '🇲🇽', group: 'A' },
  USA: { id: 3, name: '美國', nameEn: 'USA', tla: 'USA', flag: '🇺🇸', group: 'B' },
  JPN: { id: 4, name: '日本', nameEn: 'Japan', tla: 'JPN', flag: '🇯🇵', group: 'B' },
  KOR: { id: 5, name: '南韓', nameEn: 'South Korea', tla: 'KOR', flag: '🇰🇷', group: 'C' },
  BRA: { id: 6, name: '巴西', nameEn: 'Brazil', tla: 'BRA', flag: '🇧🇷', group: 'C' },
  ARG: { id: 7, name: '阿根廷', nameEn: 'Argentina', tla: 'ARG', flag: '🇦🇷', group: 'D' },
  FRA: { id: 8, name: '法國', nameEn: 'France', tla: 'FRA', flag: '🇫🇷', group: 'D' },
  ENG: { id: 9, name: '英格蘭', nameEn: 'England', tla: 'ENG', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', group: 'E' },
  ESP: { id: 10, name: '西班牙', nameEn: 'Spain', tla: 'ESP', flag: '🇪🇸', group: 'E' },
  GER: { id: 11, name: '德國', nameEn: 'Germany', tla: 'GER', flag: '🇩🇪', group: 'F' },
  POR: { id: 12, name: '葡萄牙', nameEn: 'Portugal', tla: 'POR', flag: '🇵🇹', group: 'F' },
  NED: { id: 13, name: '荷蘭', nameEn: 'Netherlands', tla: 'NED', flag: '🇳🇱', group: 'G' },
  BEL: { id: 14, name: '比利時', nameEn: 'Belgium', tla: 'BEL', flag: '🇧🇪', group: 'G' },
  ITA: { id: 15, name: '義大利', nameEn: 'Italy', tla: 'ITA', flag: '🇮🇹', group: 'H' },
  CRO: { id: 16, name: '克羅埃西亞', nameEn: 'Croatia', tla: 'CRO', flag: '🇭🇷', group: 'H' },
  URU: { id: 17, name: '烏拉圭', nameEn: 'Uruguay', tla: 'URU', flag: '🇺🇾', group: 'I' },
  MAR: { id: 18, name: '摩洛哥', nameEn: 'Morocco', tla: 'MAR', flag: '🇲🇦', group: 'I' },
  SEN: { id: 19, name: '塞內加爾', nameEn: 'Senegal', tla: 'SEN', flag: '🇸🇳', group: 'J' },
  AUS: { id: 20, name: '澳洲', nameEn: 'Australia', tla: 'AUS', flag: '🇦🇺', group: 'J' },
  SUI: { id: 21, name: '瑞士', nameEn: 'Switzerland', tla: 'SUI', flag: '🇨🇭', group: 'K' },
  COL: { id: 22, name: '哥倫比亞', nameEn: 'Colombia', tla: 'COL', flag: '🇨🇴', group: 'K' },
  DEN: { id: 23, name: '丹麥', nameEn: 'Denmark', tla: 'DEN', flag: '🇩🇰', group: 'L' },
  ECU: { id: 24, name: '厄瓜多', nameEn: 'Ecuador', tla: 'ECU', flag: '🇪🇨', group: 'L' },
};

/**
 * 產生今日 + 接下來 7 天的模擬賽程
 * 開賽日定錨在 2026/06/11（今天）
 *
 * 全部都是正式賽程；熱身賽 mock 已移除，等真實 API 接上後再呈現。
 */
export function generateMockMatches(): Match[] {
  const tournamentStart = new Date('2026-06-11T17:00:00+08:00').getTime();
  const matchPairs: Array<[string, string, number, number, string]> = [
    // [home, away, dayOffset, hour(TW), venue]
    ['MEX', 'CAN', 0, 17, 'Estadio Azteca, Mexico City'],
    ['USA', 'JPN', 0, 20, 'SoFi Stadium, Los Angeles'],
    ['BRA', 'KOR', 0, 23, 'MetLife Stadium, New York'],
    ['ARG', 'FRA', 1, 17, 'AT&T Stadium, Dallas'],
    ['ENG', 'ESP', 1, 20, 'Lumen Field, Seattle'],
    ['GER', 'POR', 1, 23, 'Mercedes-Benz Stadium, Atlanta'],
    ['NED', 'BEL', 2, 17, 'Hard Rock Stadium, Miami'],
    ['ITA', 'CRO', 2, 20, 'NRG Stadium, Houston'],
    ['URU', 'MAR', 2, 23, 'BC Place, Vancouver'],
    ['SEN', 'AUS', 3, 17, 'BMO Field, Toronto'],
    ['SUI', 'COL', 3, 20, 'Estadio Akron, Guadalajara'],
    ['DEN', 'ECU', 3, 23, 'Estadio BBVA, Monterrey'],
    ['CAN', 'USA', 4, 20, 'BMO Field, Toronto'],
    ['JPN', 'BRA', 4, 23, 'SoFi Stadium, Los Angeles'],
    ['FRA', 'ENG', 5, 20, 'MetLife Stadium, New York'],
    ['ESP', 'GER', 5, 23, 'AT&T Stadium, Dallas'],
    ['POR', 'NED', 6, 20, 'Mercedes-Benz Stadium, Atlanta'],
    ['BEL', 'ITA', 6, 23, 'Hard Rock Stadium, Miami'],
    ['CRO', 'URU', 7, 20, 'NRG Stadium, Houston'],
    ['MAR', 'SEN', 7, 23, 'BC Place, Vancouver'],
  ];

  return matchPairs.map(([homeTla, awayTla, dayOffset, hour, venue], idx) => {
    const home = TEAMS[homeTla];
    const away = TEAMS[awayTla];
    const date = new Date(tournamentStart + dayOffset * 86400000);
    // 設定到當天指定小時（台灣時區）
    const tw = new Date(
      `${date.toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' })}T${String(hour).padStart(2, '0')}:00:00+08:00`,
    );
    const utcDate = tw.toISOString();
    const isPast = tw.getTime() < Date.now();

    // mock 全部是正賽；真實 API 接上後若回傳 friendly tag 再標記
    const isFriendly = false;

    let score: Match['score'];
    let status: Match['status'] = 'SCHEDULED';
    if (isPast) {
      // 用種子產生「歷史比分」
      const rng = seededRandom(stringToSeed(`score-${homeTla}-${awayTla}-${idx}`));
      const homeScore = Math.floor(rng() * 4);
      const awayScore = Math.floor(rng() * 4);
      const winner =
        homeScore > awayScore ? 'HOME_TEAM' : homeScore < awayScore ? 'AWAY_TEAM' : 'DRAW';
      score = { winner, fullTime: { home: homeScore, away: awayScore } };
      status = 'FINISHED';
    }

    return {
      id: `mock-${idx + 1}`,
      utcDate,
      status,
      stage: 'GROUP_STAGE',
      group: home.group,
      matchday: dayOffset + 1,
      venue,
      isFriendly,
      homeTeam: home,
      awayTeam: away,
      score,
    } satisfies Match;
  });
}

/**
 * 根據兩隊 FIFA 評分 + Poisson xG 產生擬真賠率
 *
 * 主玩法：1X2（主勝 / 和 / 客勝）
 * 衍生玩法（markets）：
 *   - O/U 2.5（大小球）
 *   - 亞洲讓分（讓分線依 Elo 差距自動選）
 *   - BTTS（雙方都進球）
 *   - 上半場 1X2
 *   - 進球數區間（0-1 / 2-3 / 4-6 / 7+）
 *   - 正確比分 top 6
 *
 * 全部含 8% 莊家抽水，與台灣運彩接近。
 */
export function generateMockOdds(match: Match): Odds {
  // 世界杯主場優勢只對主辦國成立（USA / CAN / MEX）
  const isHomeAdvantage = ['USA', 'CAN', 'MEX'].includes(match.homeTeam.tla);

  const { lambdaHome, lambdaAway } = expectedGoals(
    match.homeTeam.tla,
    match.awayTeam.tla,
    isHomeAdvantage,
  );

  // 1X2 — 用 Poisson 取代之前的線性估算，更貼近真實
  const main = probs1x2(lambdaHome, lambdaAway);

  // O/U 2.5
  const ou = overUnder(lambdaHome, lambdaAway, 2.5);
  // 讓分（線根據 Elo 差距 dynamic 決定）
  const eloDiff = (() => {
    // 從 markets 拿不到 elo 差，這裡用 lambda 差估
    return Math.round((lambdaHome - lambdaAway) * 150);
  })();
  const ah = asianHandicap(lambdaHome, lambdaAway, eloDiff);
  // BTTS
  const btts = bttsModel(lambdaHome, lambdaAway);
  // 上半場
  const ht = halfTime1x2(lambdaHome, lambdaAway);
  // 進球數區間
  const tg = totalGoalsBrackets(lambdaHome, lambdaAway);
  // 正確比分
  const cs = correctScoreTop(lambdaHome, lambdaAway, 6);

  const markets: ExtraMarkets = {
    overUnder: {
      line: 2.5,
      overOdds: probToOdds(ou.over),
      underOdds: probToOdds(ou.under),
    },
    handicap: {
      line: ah.line,
      homeOdds: probToOdds(ah.homeWin),
      awayOdds: probToOdds(ah.awayWin),
    },
    btts: {
      yesOdds: probToOdds(btts.yes),
      noOdds: probToOdds(btts.no),
    },
    halfTime: {
      homeWin: probToOdds(ht.home),
      draw: probToOdds(ht.draw),
      awayWin: probToOdds(ht.away),
    },
    totalGoals: {
      brackets: tg.map((b) => ({
        label: b.label,
        min: b.min,
        max: b.max,
        odds: probToOdds(b.prob),
      })),
    },
    correctScore: {
      scores: cs.map((s) => ({
        home: s.home,
        away: s.away,
        odds: probToOdds(s.prob),
      })),
    },
  };

  return {
    matchId: match.id,
    homeWin: probToOdds(main.home),
    draw: probToOdds(main.draw),
    awayWin: probToOdds(main.away),
    markets,
    source: '章魚推算盤',
    updatedAt: new Date().toISOString(),
  };
}

export const mockMatches = generateMockMatches();
