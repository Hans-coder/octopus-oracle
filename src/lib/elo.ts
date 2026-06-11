import type { ProbabilityTriple } from '@/types';

/**
 * FIFA / Elo 球隊評分
 *
 * 來源：World Football Elo Ratings (clubelo.com 風格)
 * 數字為 2026 春季左右的近似值。實務上應該每月由 cron 拉新數字。
 * 越高越強，主辦國強隊大概 2050+，地區弱旅 1500 左右。
 */
export const ELO_RATING: Record<string, number> = {
  // Tier S (2000+)
  ARG: 2096, FRA: 2086, ESP: 2073, ENG: 2042, BRA: 2031,
  // Tier A (1900-2000)
  POR: 1992, NED: 1974, BEL: 1948, GER: 1936, ITA: 1918,
  CRO: 1885, COL: 1872,
  // Tier B (1800-1900)
  JPN: 1850, URU: 1839, MAR: 1830, USA: 1820, SUI: 1815,
  KOR: 1790, MEX: 1782, DEN: 1772, SEN: 1755,
  // Tier C (<1800)
  AUS: 1690, ECU: 1672, CAN: 1640,
};

/** 平均 Elo（用於缺資料的隊伍 fallback） */
export const ELO_MEAN = 1800;

/** 取得 Elo，缺資料回退到均值 */
export function getElo(tla: string): number {
  return ELO_RATING[tla] ?? ELO_MEAN;
}

/**
 * Elo expected score 公式
 * E_home = 1 / (1 + 10^((Elo_away - Elo_home - HOME_ADV) / 400))
 *
 * 主場優勢約 ±60 (世界杯多為中立場，所以採較小的 30)
 */
const HOME_ADV_ELO = 30;

/**
 * 把 Elo 差異轉成三選一機率
 *
 * Elo 本身只算「期望得分」(0~1)，要拆三選一，
 * 我們用「期望得分越接近 0.5 → 和局機率越高」的經驗式。
 */
export function eloToProbs(
  homeTla: string,
  awayTla: string,
  isNeutralVenue = false,
): { eloDiff: number; probs: ProbabilityTriple } {
  const homeElo = getElo(homeTla);
  const awayElo = getElo(awayTla);
  const advantage = isNeutralVenue ? 0 : HOME_ADV_ELO;
  const eloDiff = homeElo - awayElo;
  const effectiveDiff = eloDiff + advantage;

  // home expected score (0~1)
  const eHome = 1 / (1 + Math.pow(10, -effectiveDiff / 400));

  // 把期望得分轉成「勝/和/負」
  // 經驗式：drawProb = drawBase * exp(-(eloDiff/200)^2)
  // 差距越大 → 和局越低；差距 0 → 和局約 28%
  const drawBase = 0.28;
  const drawProb = drawBase * Math.exp(-Math.pow(effectiveDiff / 200, 2));

  // 把剩下的 (1 - drawProb) 按 home/away 期望比例分
  const remaining = 1 - drawProb;
  const homeProb = remaining * eHome;
  const awayProb = remaining * (1 - eHome);

  return {
    eloDiff,
    probs: { home: homeProb, draw: drawProb, away: awayProb },
  };
}
