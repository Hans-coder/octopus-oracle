import { getElo } from './elo';

/**
 * 各種足球玩法的機率模型 — Poisson xG (expected goals)
 *
 * 全部基於兩隊預期進球數 (λ_home, λ_away)，
 * 然後用 Poisson PMF 推算各種市場機率：
 *   - 1X2     (主勝/和/客勝)
 *   - 大小     (大/小球)
 *   - 客進    (雙方都進球)
 *   - 波膽     (正確比分)
 *   - 上半場 1X2  (上半場 1X2)
 *   - 進球數   (進球數區間)
 *   - 讓分    (讓分盤)
 *
 * 真實盤口接上後可以 swap 掉這個，目前供 mock 資料 + AI 預測使用。
 */

// ─────────────────────────────────────────────
// Poisson 工具
// ─────────────────────────────────────────────
const FACT_CACHE = new Map<number, number>([[0, 1]]);
function factorial(n: number): number {
  if (FACT_CACHE.has(n)) return FACT_CACHE.get(n)!;
  const v = n * factorial(n - 1);
  FACT_CACHE.set(n, v);
  return v;
}

/** Poisson 機率：P(X=k | λ) */
export function poissonPmf(lambda: number, k: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

// ─────────────────────────────────────────────
// 從 Elo 推算 xG
// ─────────────────────────────────────────────
/**
 * 兩隊預期進球 (Poisson λ)
 *
 * 基線 xG ≈ 1.35（世界杯平均單隊進球），用 Elo 差距上下調整。
 * isHomeAdvantage = true 時主隊 λ +0.15。
 */
export function expectedGoals(
  homeTla: string,
  awayTla: string,
  isHomeAdvantage = false,
): { lambdaHome: number; lambdaAway: number } {
  const eloH = getElo(homeTla);
  const eloA = getElo(awayTla);
  const diff = eloH - eloA;

  // 強弱差距 → xG 落差（每 100 Elo ≈ 0.18 xG）
  const factor = diff / 100;
  const baseHome = 1.35 + factor * 0.18 + (isHomeAdvantage ? 0.15 : 0);
  const baseAway = 1.35 - factor * 0.18;

  return {
    lambdaHome: Math.max(0.35, baseHome),
    lambdaAway: Math.max(0.35, baseAway),
  };
}

// ─────────────────────────────────────────────
// 市場機率
// ─────────────────────────────────────────────

/** 全比賽 1X2 機率（用 Poisson 雙重 sum） */
export function probs1x2(
  lambdaH: number,
  lambdaA: number,
): { home: number; draw: number; away: number } {
  const MAX = 7; // 7+0 / 0+7 機率已可忽略
  let pH = 0;
  let pD = 0;
  let pA = 0;
  for (let h = 0; h <= MAX; h++) {
    const ph = poissonPmf(lambdaH, h);
    for (let a = 0; a <= MAX; a++) {
      const joint = ph * poissonPmf(lambdaA, a);
      if (h > a) pH += joint;
      else if (h < a) pA += joint;
      else pD += joint;
    }
  }
  const total = pH + pD + pA || 1;
  return { home: pH / total, draw: pD / total, away: pA / total };
}

/** 大小球：總進球 > line 的機率 */
export function overUnder(
  lambdaH: number,
  lambdaA: number,
  line: number,
): { over: number; under: number } {
  const MAX = 8;
  let under = 0;
  for (let h = 0; h <= MAX; h++) {
    const ph = poissonPmf(lambdaH, h);
    for (let a = 0; a <= MAX; a++) {
      if (h + a < line) under += ph * poissonPmf(lambdaA, a);
    }
  }
  return { over: 1 - under, under };
}

/** BTTS：雙方都進球的機率 */
export function btts(
  lambdaH: number,
  lambdaA: number,
): { yes: number; no: number } {
  const pHomeZero = poissonPmf(lambdaH, 0);
  const pAwayZero = poissonPmf(lambdaA, 0);
  // 兩隊獨立：P(雙方都不進) = pHomeZero + pAwayZero - pHomeZero*pAwayZero ❌
  // 正確：P(BTTS=No) = P(home=0) + P(away=0) - P(home=0 AND away=0)
  // 但要 P(雙方都進) = (1-P(home=0)) * (1-P(away=0))（獨立假設）
  const yes = (1 - pHomeZero) * (1 - pAwayZero);
  return { yes, no: 1 - yes };
}

/**
 * 上半場 1X2：簡化假設「上半場約佔全場 45% xG」
 */
export function halfTime1x2(
  lambdaH: number,
  lambdaA: number,
): { home: number; draw: number; away: number } {
  return probs1x2(lambdaH * 0.45, lambdaA * 0.45);
}

/** 正確比分 top-N（不含 7+ 進球以上的極端值） */
export function correctScoreTop(
  lambdaH: number,
  lambdaA: number,
  topN = 6,
): Array<{ home: number; away: number; prob: number }> {
  const arr: Array<{ home: number; away: number; prob: number }> = [];
  for (let h = 0; h <= 5; h++) {
    for (let a = 0; a <= 5; a++) {
      arr.push({ home: h, away: a, prob: poissonPmf(lambdaH, h) * poissonPmf(lambdaA, a) });
    }
  }
  arr.sort((x, y) => y.prob - x.prob);
  return arr.slice(0, topN);
}

/**
 * 進球數區間：0-1 / 2-3 / 4-6 / 7+
 */
export function totalGoalsBrackets(
  lambdaH: number,
  lambdaA: number,
): Array<{ label: string; min: number; max: number | null; prob: number }> {
  const buckets = [
    { label: '0-1', min: 0, max: 1, prob: 0 },
    { label: '2-3', min: 2, max: 3, prob: 0 },
    { label: '4-6', min: 4, max: 6, prob: 0 },
    { label: '7+', min: 7, max: null as number | null, prob: 0 },
  ];
  const MAX = 10;
  for (let h = 0; h <= MAX; h++) {
    const ph = poissonPmf(lambdaH, h);
    for (let a = 0; a <= MAX; a++) {
      const total = h + a;
      const joint = ph * poissonPmf(lambdaA, a);
      for (const b of buckets) {
        if (total >= b.min && (b.max === null || total <= b.max)) {
          b.prob += joint;
          break;
        }
      }
    }
  }
  // normalize (loss from MAX>10 cutoff)
  const sum = buckets.reduce((s, b) => s + b.prob, 0) || 1;
  return buckets.map((b) => ({ ...b, prob: b.prob / sum }));
}

/**
 * 亞洲讓分：選 Elo 差距對應的 handicap 線
 *   差距 < 50  → 0
 *   差距 < 150 → ±0.5
 *   差距 < 250 → ±1.0
 *   差距 < 400 → ±1.5
 *   else       → ±2.0
 */
export function asianHandicap(
  lambdaH: number,
  lambdaA: number,
  eloDiff: number,
): { line: number; homeWin: number; awayWin: number } {
  const absDiff = Math.abs(eloDiff);
  let mag = 0;
  if (absDiff < 50) mag = 0;
  else if (absDiff < 150) mag = 0.5;
  else if (absDiff < 250) mag = 1.0;
  else if (absDiff < 400) mag = 1.5;
  else mag = 2.0;
  const line = eloDiff >= 0 ? -mag : mag; // 主隊強就 -mag

  // 計算讓分後機率
  // line = -0.5 → home wins iff home_goals > away_goals + 0.5
  // 用 Poisson sum
  const MAX = 8;
  let homeWin = 0;
  let awayWin = 0;
  for (let h = 0; h <= MAX; h++) {
    const ph = poissonPmf(lambdaH, h);
    for (let a = 0; a <= MAX; a++) {
      const joint = ph * poissonPmf(lambdaA, a);
      const adjustedHome = h + line; // home 視角
      if (adjustedHome > a) homeWin += joint;
      else if (adjustedHome < a) awayWin += joint;
      // adjustedHome == a 在 0.5 step 不會發生（line 是 .0 或 .5）
      // .0 step 平手算退錢，這裡就 ignore 直接機率短少（不影響比例）
    }
  }
  const total = homeWin + awayWin || 1;
  return { line, homeWin: homeWin / total, awayWin: awayWin / total };
}

// ─────────────────────────────────────────────
// 機率 → 賠率（含莊家抽水）
// ─────────────────────────────────────────────
/**
 * 把機率轉成賠率：odds = 1 / (p × margin)
 * margin 預設 1.08（≈ 92% 派彩率，與台灣運彩接近）
 */
export function probToOdds(p: number, margin = 1.08): number {
  if (p <= 0.001) return 99.99;
  return Math.round((1 / (p * margin)) * 100) / 100;
}
