import type { Match, Odds, Team } from '@/types';
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

/** FIFA 排名 — 越低越強，用來生成擬真賠率 */
const FIFA_RATING: Record<string, number> = {
  ARG: 95, FRA: 94, ESP: 93, ENG: 92, BRA: 91, POR: 90, NED: 88, BEL: 87,
  GER: 86, ITA: 85, CRO: 83, JPN: 80, MAR: 79, USA: 78, KOR: 77, SUI: 76,
  URU: 75, COL: 74, DEN: 73, MEX: 72, SEN: 71, AUS: 68, ECU: 67, CAN: 65,
};

/**
 * 產生今日 + 接下來 7 天的模擬賽程
 * 開賽日定錨在 2026/06/11（今天）
 */
export function generateMockMatches(): Match[] {
  const tournamentStart = new Date('2026-06-11T17:00:00+08:00').getTime();
  // dayOffset 為負 = 開賽前的熱身賽（已結束），用來示範神準排行功能
  const matchPairs: Array<[string, string, number, number, string]> = [
    // [home, away, dayOffset, hour(TW), venue]
    // ▼ 熱身賽（已結束，給神準排行有資料看）
    ['BRA', 'JPN', -3, 20, '熱身賽 · Tokyo'],
    ['FRA', 'ITA', -3, 23, '熱身賽 · Lyon'],
    ['ENG', 'GER', -2, 20, '熱身賽 · Wembley'],
    ['ARG', 'URU', -2, 23, '熱身賽 · Montevideo'],
    ['ESP', 'POR', -1, 20, '熱身賽 · Madrid'],
    ['NED', 'BEL', -1, 23, '熱身賽 · Amsterdam'],
    // ▼ 正式賽程
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

    // 開賽前的賽事 = 熱身賽（不計入正賽神準率）
    const isFriendly = dayOffset < 0;

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
 * 根據兩隊 FIFA 評分產生擬真賠率（接近台彩運彩的數值區間）
 * 強隊賠率低、弱隊賠率高，總機率含 8% 莊家抽水
 */
export function generateMockOdds(match: Match): Odds {
  const homeRating = FIFA_RATING[match.homeTeam.tla] ?? 70;
  const awayRating = FIFA_RATING[match.awayTeam.tla] ?? 70;
  const diff = homeRating - awayRating;

  // 主場優勢 +2
  const homeStrength = homeRating + 2;
  const awayStrength = awayRating;
  const total = homeStrength + awayStrength + 30; // 30 是平手的「強度」

  const pHome = homeStrength / total;
  const pAway = awayStrength / total;
  const pDraw = 30 / total;

  // 莊家抽水：機率調高 → 賠率降低
  const margin = 1.08;
  const round = (n: number) => Math.round(n * 100) / 100;

  // 微調：差距大時和局賠率拉高
  const drawAdjust = 1 + Math.abs(diff) / 100;

  return {
    matchId: match.id,
    homeWin: round(1 / (pHome * margin)),
    draw: round((1 / (pDraw * margin)) * drawAdjust),
    awayWin: round(1 / (pAway * margin)),
    source: '台灣運彩（模擬）',
    updatedAt: new Date().toISOString(),
  };
}

export const mockMatches = generateMockMatches();
