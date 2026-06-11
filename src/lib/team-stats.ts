import type {
  HeadToHead,
  InjuryReport,
  Match,
  MatchStats,
  TeamForm,
} from '@/types';
import { eloToProbs } from './elo';
import { seededRandom, stringToSeed } from './utils';

/**
 * 球隊統計資料（form / H2H / 傷兵）
 *
 * 三種來源：
 * 1. football-data.org `/teams/{id}/matches` — 真實 API（需 token）
 * 2. API-Football `/injuries` — 真實傷兵 API（未來擴充）
 * 3. mock generator — 用種子隨機產生擬真資料，永遠回傳同一份
 *
 * 預設用 mock，以維持 demo 開箱即用。
 */

/** 部分知名球員，用於 mock 傷兵列表 */
const KEY_PLAYERS: Record<string, string[]> = {
  ARG: ['Lionel Messi', 'Lautaro Martinez', 'Julian Alvarez'],
  FRA: ['Kylian Mbappé', 'Antoine Griezmann', 'Aurélien Tchouaméni'],
  ESP: ['Rodri', 'Pedri', 'Lamine Yamal'],
  ENG: ['Harry Kane', 'Jude Bellingham', 'Bukayo Saka'],
  BRA: ['Vinícius Jr.', 'Rodrygo', 'Neymar Jr.'],
  POR: ['Cristiano Ronaldo', 'Bernardo Silva', 'Bruno Fernandes'],
  NED: ['Virgil van Dijk', 'Frenkie de Jong', 'Cody Gakpo'],
  BEL: ['Kevin De Bruyne', 'Romelu Lukaku'],
  GER: ['Florian Wirtz', 'Jamal Musiala', 'Joshua Kimmich'],
  ITA: ['Federico Chiesa', 'Nicolò Barella'],
  CRO: ['Luka Modrić', 'Mateo Kovačić'],
  JPN: ['Takefusa Kubo', 'Wataru Endo'],
  USA: ['Christian Pulisic', 'Weston McKennie'],
  KOR: ['Son Heung-min', 'Kim Min-jae'],
  MAR: ['Achraf Hakimi', 'Hakim Ziyech'],
  URU: ['Federico Valverde', 'Darwin Núñez'],
  COL: ['Luis Díaz', 'James Rodríguez'],
  MEX: ['Hirving Lozano', 'Edson Álvarez'],
  CAN: ['Alphonso Davies', 'Jonathan David'],
};

function pickRandomPlayer(tla: string, rng: () => number): string | undefined {
  const list = KEY_PLAYERS[tla];
  if (!list || list.length === 0) return undefined;
  return list[Math.floor(rng() * list.length)];
}

/** 用種子產生球隊「近 5 戰」狀態 */
export function mockTeamForm(tla: string): TeamForm {
  const rng = seededRandom(stringToSeed(`form-${tla}`));
  // 強隊偏向贏，弱隊偏向輸。簡化判定：tla 在 KEY_PLAYERS 裡的視為強隊。
  const isStrong = !!KEY_PLAYERS[tla];

  const played = 5;
  const recentArr: ('W' | 'D' | 'L')[] = [];
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;

  for (let i = 0; i < played; i++) {
    const r = rng();
    // 強隊 60% 勝 25% 和 15% 負；弱隊 30% 勝 25% 和 45% 負
    const winThreshold = isStrong ? 0.6 : 0.3;
    const drawThreshold = isStrong ? 0.85 : 0.55;
    if (r < winThreshold) {
      wins++;
      recentArr.push('W');
      goalsFor += 1 + Math.floor(rng() * 3); // 1~3
      goalsAgainst += Math.floor(rng() * 2); // 0~1
    } else if (r < drawThreshold) {
      draws++;
      recentArr.push('D');
      const g = Math.floor(rng() * 3); // 0~2
      goalsFor += g;
      goalsAgainst += g;
    } else {
      losses++;
      recentArr.push('L');
      goalsFor += Math.floor(rng() * 2); // 0~1
      goalsAgainst += 1 + Math.floor(rng() * 3); // 1~3
    }
  }

  const formIndex = (wins * 3 + draws * 1) / (played * 3);

  return {
    played,
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
    formIndex,
    recent: recentArr.join(''),
  };
}

/** mock 傷兵：強隊較少受傷、且偶爾有大牌缺陣 */
export function mockInjuries(tla: string): InjuryReport {
  const rng = seededRandom(stringToSeed(`injury-${tla}`));
  const r = rng();

  // 70% 無傷兵，20% 1-2 人，10% 關鍵球員缺陣
  if (r < 0.7) {
    return { count: 0, severity: 0 };
  }
  if (r < 0.9) {
    const count = 1 + Math.floor(rng() * 2);
    return { count, severity: 0.2 };
  }
  return {
    count: 1 + Math.floor(rng() * 3),
    keyPlayer: pickRandomPlayer(tla, rng),
    severity: 0.55,
  };
}

/** mock H2H：近 5 次交手結果 */
export function mockH2H(homeTla: string, awayTla: string): HeadToHead {
  // 永遠用按字典序組 key，保證對稱性
  const [a, b] = [homeTla, awayTla].sort();
  const rng = seededRandom(stringToSeed(`h2h-${a}-${b}`));
  const played = 5;
  let aWins = 0;
  let draws = 0;
  let bWins = 0;
  for (let i = 0; i < played; i++) {
    const r = rng();
    if (r < 0.4) aWins++;
    else if (r < 0.6) draws++;
    else bWins++;
  }
  // 映射回 home/away
  const homeWins = homeTla === a ? aWins : bWins;
  const awayWins = homeTla === a ? bWins : aWins;
  return { played, homeWins, draws, awayWins };
}

/**
 * 取得一場比賽的所有統計資料
 *
 * 目前統一使用 mock，未來可在這裡接 football-data.org
 */
export function getMatchStats(match: Match): MatchStats {
  const homeForm = mockTeamForm(match.homeTeam.tla);
  const awayForm = mockTeamForm(match.awayTeam.tla);
  const homeInjuries = mockInjuries(match.homeTeam.tla);
  const awayInjuries = mockInjuries(match.awayTeam.tla);
  const h2h = mockH2H(match.homeTeam.tla, match.awayTeam.tla);

  // 世界杯在美加墨舉行，主場優勢只有 USA/CAN/MEX 才算
  const isHomeNation = ['USA', 'CAN', 'MEX'].includes(match.homeTeam.tla);
  const { eloDiff, probs: eloProbs } = eloToProbs(
    match.homeTeam.tla,
    match.awayTeam.tla,
    !isHomeNation,
  );

  return {
    matchId: match.id,
    homeForm,
    awayForm,
    homeInjuries,
    awayInjuries,
    h2h,
    eloDiff,
    eloProbs,
  };
}

/** 批次取得統計 */
export function getMatchStatsMap(matches: Match[]): Map<string, MatchStats> {
  const map = new Map<string, MatchStats>();
  for (const m of matches) map.set(m.id, getMatchStats(m));
  return map;
}
