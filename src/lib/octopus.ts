import type {
  AccuracyBucket,
  EngineId,
  EngineMeta,
  LLMAnalysis,
  Match,
  MatchStats,
  MultiMarketPicks,
  Odds,
  Prediction,
  PredictionPick,
  PredictionResult,
  ProbabilityTriple,
  CalibratedMetrics,
} from '@/types';
import {
  btts as bttsModel,
  correctScoreTop,
  expectedGoals,
  halfTime1x2,
  overUnder,
  totalGoalsBrackets,
} from './markets';
import { seededRandom, stringToSeed } from './utils';

/**
 * 章魚哥神諭引擎（致敬版 Paul the Octopus）
 *
 * 單一角色設計：
 * - 賠率為主、Elo 為輔、近期狀態微調
 * - 主辦國（USA/CAN/MEX）有 4% 主場優勢
 * - 章魚哥的「叛逆度」：12% 往均勻分布混合，保留翻盤的可能
 * - 若有 LLM 分析（OPENAI/ANTHROPIC key 啟用），神諭文字會用 LLM 產
 * - 同一場比賽永遠得到相同預測（種子化）
 */

// ─────────────────────────────────────────────
// 常數
// ─────────────────────────────────────────────
const HOME_ADVANTAGE = 0.04;
const DRAW_SUPPRESSION = 0.85;
const PAUL_CHAOS = 0.12;

// ─────────────────────────────────────────────
// 引擎 metadata（保留單一角色 metadata，UI 用）
// ─────────────────────────────────────────────
export const ENGINE_META: Record<EngineId, EngineMeta> = {
  paul: {
    id: 'paul',
    emoji: '🐙',
    name: '章魚哥',
    shortName: '章魚哥',
    title: '神諭',
    description: '致敬傳奇章魚 Paul，集賠率、Elo 與 AI 分析於一身',
    accent: 'cyan',
    color: '#22d3ee',
  },
};

export const ENGINE: EngineMeta = ENGINE_META.paul;

// ─────────────────────────────────────────────
// 機率工具
// ─────────────────────────────────────────────
function normalize(p: ProbabilityTriple): ProbabilityTriple {
  const sum = p.home + p.draw + p.away || 1;
  return { home: p.home / sum, draw: p.draw / sum, away: p.away / sum };
}

function oddsToProbs(odds: Odds): ProbabilityTriple {
  const ph = 1 / odds.homeWin;
  const pd = 1 / odds.draw;
  const pa = 1 / odds.awayWin;
  const sum = ph + pd + pa;
  return { home: ph / sum, draw: pd / sum, away: pa / sum };
}

function formProbs(stats: MatchStats): ProbabilityTriple {
  const homeStrength = Math.max(
    0.1,
    stats.homeForm.formIndex * (1 - stats.homeInjuries.severity * 0.6),
  );
  const awayStrength = Math.max(
    0.1,
    stats.awayForm.formIndex * (1 - stats.awayInjuries.severity * 0.6),
  );
  const drawWeight = 0.3;
  const totalAttacking = homeStrength + awayStrength;
  return normalize({
    home: (homeStrength / totalAttacking) * (1 - drawWeight),
    draw: drawWeight,
    away: (awayStrength / totalAttacking) * (1 - drawWeight),
  });
}

interface WeightedProbs {
  probs: ProbabilityTriple;
  weight: number;
}

function combine(...inputs: WeightedProbs[]): ProbabilityTriple {
  const totalWeight = inputs.reduce((s, x) => s + x.weight, 0) || 1;
  let h = 0;
  let d = 0;
  let a = 0;
  for (const { probs, weight } of inputs) {
    const w = weight / totalWeight;
    h += probs.home * w;
    d += probs.draw * w;
    a += probs.away * w;
  }
  return { home: h, draw: d, away: a };
}

function applyAdjustments(
  p: ProbabilityTriple,
  isHomeNation: boolean,
): ProbabilityTriple {
  const homeBoost = isHomeNation ? HOME_ADVANTAGE : 0;
  return normalize({
    home: p.home + homeBoost,
    draw: p.draw * DRAW_SUPPRESSION,
    away: Math.max(0, p.away - homeBoost * 0.5),
  });
}

function chaosBlend(p: ProbabilityTriple, chaos: number): ProbabilityTriple {
  const u = 1 / 3;
  return {
    home: p.home * (1 - chaos) + u * chaos,
    draw: p.draw * (1 - chaos) + u * chaos,
    away: p.away * (1 - chaos) + u * chaos,
  };
}

function argmax(
  p: ProbabilityTriple,
  rng: () => number,
): { pick: PredictionPick; confidence: number } {
  const arr: Array<{ key: PredictionPick; v: number }> = [
    { key: 'HOME', v: p.home + rng() * 1e-6 },
    { key: 'DRAW', v: p.draw + rng() * 1e-6 },
    { key: 'AWAY', v: p.away + rng() * 1e-6 },
  ];
  arr.sort((x, y) => y.v - x.v);
  const top = arr[0];
  return {
    pick: top.key,
    confidence:
      top.key === 'HOME' ? p.home : top.key === 'DRAW' ? p.draw : p.away,
  };
}

// ─────────────────────────────────────────────
// 預測 context
// ─────────────────────────────────────────────
export interface PredictContext {
  odds?: Odds;
  stats: MatchStats;
  llm?: LLMAnalysis;
}

function isHomeNation(match: Match) {
  return ['USA', 'CAN', 'MEX'].includes(match.homeTeam.tla);
}

// ─────────────────────────────────────────────
// 多玩法神諭（章魚哥對 6 種子市場的預測）
// ─────────────────────────────────────────────
function computeMarketExtras(
  match: Match,
  ctx: PredictContext,
  rng: () => number,
): MultiMarketPicks {
  const extras: MultiMarketPicks = {};
  const markets = ctx.odds?.markets;

  const isHomeAdv = isHomeNation(match);
  const { lambdaHome, lambdaAway } = expectedGoals(
    match.homeTeam.tla,
    match.awayTeam.tla,
    isHomeAdv,
  );

  // 大小球 — 章魚哥偏好戲劇性，OVER 加 0.04 偏置
  const ou = overUnder(lambdaHome, lambdaAway, 2.5);
  const ouPick: 'OVER' | 'UNDER' = ou.over + 0.04 >= ou.under ? 'OVER' : 'UNDER';
  extras.overUnder = {
    pick: ouPick,
    line: markets?.overUnder?.line ?? 2.5,
    confidence: ouPick === 'OVER' ? Math.min(0.8, ou.over + 0.04) : ou.under,
    reasoning:
      ouPick === 'OVER'
        ? `預期進球 ${(lambdaHome + lambdaAway).toFixed(1)}，章魚哥嗅到火藥味（${Math.round(ou.over * 100)}%）`
        : `防守對決，總進球機率不到 2.5 球（${Math.round(ou.under * 100)}%）`,
  };

  // BTTS — 偏 YES
  const bt = bttsModel(lambdaHome, lambdaAway);
  const bttsPick: 'YES' | 'NO' = bt.yes + 0.03 >= bt.no ? 'YES' : 'NO';
  extras.btts = {
    pick: bttsPick,
    confidence: bttsPick === 'YES' ? Math.min(0.8, bt.yes + 0.03) : bt.no,
    reasoning:
      bttsPick === 'YES'
        ? `兩隊鋒線都有破門能力（${Math.round(bt.yes * 100)}%）`
        : `至少一方會被門將守住（${Math.round(bt.no * 100)}%）`,
  };

  // 上半場 1X2 — 純 argmax
  const ht = halfTime1x2(lambdaHome, lambdaAway);
  let htPick: PredictionPick;
  let htConf: number;
  if (ht.home >= ht.draw && ht.home >= ht.away) {
    htPick = 'HOME';
    htConf = ht.home;
  } else if (ht.away >= ht.draw) {
    htPick = 'AWAY';
    htConf = ht.away;
  } else {
    htPick = 'DRAW';
    htConf = ht.draw;
  }
  extras.halfTime = {
    pick: htPick,
    confidence: htConf,
    reasoning:
      htPick === 'DRAW'
        ? '上半場慢熱，雙方互探虛實'
        : htPick === 'HOME'
          ? `${match.homeTeam.name} 開賽火力較強`
          : `${match.awayTeam.name} 客場壓迫，上半場領先`,
  };

  // 進球數區間 — 偶爾抽第二名製造驚奇
  const tg = totalGoalsBrackets(lambdaHome, lambdaAway);
  const tgSorted = [...tg].sort((a, b) => b.prob - a.prob);
  const tgChoice =
    tgSorted.length > 1 && rng() < 0.15 ? tgSorted[1] : tgSorted[0];
  extras.totalGoals = {
    label: tgChoice.label,
    confidence: tgChoice.prob,
    reasoning: `預估總進球落在 ${tgChoice.label} 區間（${Math.round(tgChoice.prob * 100)}%）`,
  };

  // 正確比分 top 3 — 偶爾抽非最高
  const csTop = correctScoreTop(lambdaHome, lambdaAway, 3);
  let csChoice = csTop[0];
  if (csTop.length > 1 && rng() < 0.3) {
    csChoice = csTop[Math.floor(rng() * Math.min(3, csTop.length))];
  }
  extras.correctScore = {
    home: csChoice.home,
    away: csChoice.away,
    confidence: csChoice.prob,
    reasoning: `章魚哥波膽：${match.homeTeam.tla} ${csChoice.home}-${csChoice.away} ${match.awayTeam.tla}`,
  };

  // 讓分（由賠率隱含機率反推）
  if (markets?.handicap) {
    const pH = 1 / markets.handicap.homeOdds;
    const pA = 1 / markets.handicap.awayOdds;
    const sum = pH + pA || 1;
    const pHn = pH / sum;
    const pAn = pA / sum;
    const ahPick: 'HOME' | 'AWAY' = pHn >= pAn ? 'HOME' : 'AWAY';
    extras.handicap = {
      pick: ahPick,
      line: markets.handicap.line,
      confidence: Math.max(pHn, pAn),
      reasoning: `讓分線 ${markets.handicap.line > 0 ? '+' : ''}${markets.handicap.line}：吃 ${ahPick === 'HOME' ? match.homeTeam.name : match.awayTeam.name}`,
    };
  }

  return extras;
}

// ─────────────────────────────────────────────
// 章魚哥神諭（主玩法 1X2）
// ─────────────────────────────────────────────
const PAUL_REASONINGS = [
  '潛入深海冥想 5 秒，章魚哥把觸手放到了 {team} 的盒子上 🐙',
  '經過神祕海流的指引，章魚哥選擇了 {team} 🌊',
  '章魚哥嗅了嗅鹹鹹的海水，預言 {team} 將會勝出 ⚓',
  '感應到水晶球的能量，章魚哥決定相信 {team} ✨',
  '在珊瑚礁打了個轉，章魚哥意味深長地指向 {team} 🪸',
  '吐出一個小泡泡，章魚哥的觸手緊緊吸住 {team} 的標誌 💧',
  '海王波塞頓托夢，告訴章魚哥 {team} 將被眾神眷顧 🔱',
  '章魚哥在水族箱跳了個歡快的舞，鎖定 {team} 🐙',
];

const PAUL_DRAW_REASONINGS = [
  '章魚哥猶豫好久，最後選擇了「和局」— 鬥得難分難解 🤝',
  '兩隊氣場勢均力敵，章魚哥宣告：必定和局 ⚖️',
  '章魚哥嘆了口氣，似乎在說：「這場誰也別想贏」🤷',
  '深海占卜結果出爐：90 分鐘內難分高下 🕒',
];

function paulReasoning(seed: number, teamName: string, isDraw: boolean) {
  const rng = seededRandom(seed ^ 0xabcdef);
  const list = isDraw ? PAUL_DRAW_REASONINGS : PAUL_REASONINGS;
  return list[Math.floor(rng() * list.length)].replace('{team}', teamName);
}

/**
 * 章魚哥神諭主函式
 *
 * 集成權重：
 *   - 有 LLM：賠率 50% + Elo 25% + 近期狀態 15% + LLM 10%
 *   - 無 LLM：賠率 55% + Elo 30% + 近期狀態 15%
 *
 * 神諭文字：
 *   - 有 LLM：用 LLM narrative
 *   - 否則：8 句模板隨機抽
 */
export function predictOctopus(match: Match, ctx: PredictContext): Prediction {
  const seed = stringToSeed(`paul-the-octopus::${match.id}`);
  const rng = seededRandom(seed);

  const oddsP = ctx.odds ? oddsToProbs(ctx.odds) : ctx.stats.eloProbs;

  let base: ProbabilityTriple;
  if (ctx.llm) {
    base = combine(
      { probs: oddsP, weight: 0.5 },
      { probs: ctx.stats.eloProbs, weight: 0.25 },
      { probs: formProbs(ctx.stats), weight: 0.15 },
      { probs: ctx.llm.probs, weight: 0.1 },
    );
  } else {
    base = combine(
      { probs: oddsP, weight: 0.55 },
      { probs: ctx.stats.eloProbs, weight: 0.3 },
      { probs: formProbs(ctx.stats), weight: 0.15 },
    );
  }

  const adjusted = applyAdjustments(base, isHomeNation(match));
  const final = chaosBlend(adjusted, PAUL_CHAOS);
  const { pick, confidence } = argmax(final, rng);

  let pickedTeamName: string;
  let pickedTeamFlag: string;
  let isDraw = false;
  if (pick === 'HOME') {
    pickedTeamName = match.homeTeam.name;
    pickedTeamFlag = match.homeTeam.flag;
  } else if (pick === 'AWAY') {
    pickedTeamName = match.awayTeam.name;
    pickedTeamFlag = match.awayTeam.flag;
  } else {
    pickedTeamName = '和局';
    pickedTeamFlag = '🤝';
    isDraw = true;
  }

  let reasoning: string;
  let source: 'openai' | 'anthropic' | undefined;
  if (ctx.llm?.narrative) {
    reasoning = ctx.llm.narrative;
    source = ctx.llm.provider;
  } else {
    reasoning = paulReasoning(seed, pickedTeamName, isDraw);
  }

  return {
    matchId: match.id,
    engine: 'paul',
    pick,
    confidence,
    probs: final,
    reasoning,
    pickedTeamName,
    pickedTeamFlag,
    source,
    extras: computeMarketExtras(match, ctx, rng),
  };
}

/** 批次預測 */
export function predictAll(
  matches: Match[],
  oddsMap: Map<string, Odds>,
  statsMap: Map<string, MatchStats>,
  llmMap: Map<string, LLMAnalysis>,
): Map<string, Prediction> {
  const result = new Map<string, Prediction>();
  for (const m of matches) {
    const stats = statsMap.get(m.id);
    if (!stats) continue;
    const ctx: PredictContext = {
      odds: oddsMap.get(m.id),
      stats,
      llm: llmMap.get(m.id),
    };
    result.set(m.id, predictOctopus(m, ctx));
  }
  return result;
}

// ─────────────────────────────────────────────
// 結果評估 + 命中率
// ─────────────────────────────────────────────
export function actualPickFromMatch(match: Match): PredictionPick | null {
  if (!match.score?.winner) return null;
  if (match.score.winner === 'HOME_TEAM') return 'HOME';
  if (match.score.winner === 'AWAY_TEAM') return 'AWAY';
  return 'DRAW';
}

export function evaluatePrediction(
  prediction: Prediction,
  match: Match,
): PredictionResult {
  const actual = actualPickFromMatch(match);
  return {
    prediction,
    actual,
    correct: actual === null ? null : actual === prediction.pick,
  };
}

/** 計算 Brier Score
 * 多分類：針對每個類別計算 (prob - actual)²，然後平均
 * 範圍 0-1，越小越好
 */
function computeBrierScore(
  results: PredictionResult[],
): number {
  if (results.length === 0) return 0;
  let sum = 0;
  for (const r of results) {
    if (r.actual === null) continue;
    // 將實際結果轉成 0/1 標籤
    const actual = r.actual === 'HOME' ? 1 : r.actual === 'AWAY' ? 1 : 0;
    const pick = r.prediction.pick;
    const pickProb =
      pick === 'HOME'
        ? r.prediction.probs.home
        : pick === 'AWAY'
          ? r.prediction.probs.away
          : r.prediction.probs.draw;
    sum += Math.pow(pickProb - (actual === 1 ? 1 : 0), 2);
  }
  return sum / results.length;
}

/** 計算 Log Loss
 * 範圍 0-∞，越小越好
 * 針對預測的正確類別取其概率的負對數
 */
function computeLogLoss(results: PredictionResult[]): number {
  if (results.length === 0) return 0;
  const epsilon = 1e-15; // 避免 log(0)
  let sum = 0;
  for (const r of results) {
    if (r.actual === null) continue;
    const pickProb =
      r.actual === 'HOME'
        ? r.prediction.probs.home
        : r.actual === 'AWAY'
          ? r.prediction.probs.away
          : r.prediction.probs.draw;
    const clipped = Math.max(epsilon, Math.min(1 - epsilon, pickProb));
    sum += -Math.log(clipped);
  }
  return sum / results.length;
}

/** 計算校準指標與校準指標 */
export function calculateAccuracy(
  predictions: Map<string, Prediction>,
  matches: Match[],
): AccuracyBucket {
  const results: PredictionResult[] = [];
  for (const m of matches) {
    if (m.isFriendly) continue;
    const p = predictions.get(m.id);
    if (!p) continue;
    results.push(evaluatePrediction(p, m));
  }
  const evaluated = results.filter((r) => r.correct !== null);
  const correct = evaluated.filter((r) => r.correct === true).length;

  const calibration: CalibratedMetrics | undefined =
    evaluated.length > 0
      ? {
          brierScore: computeBrierScore(evaluated),
          logLoss: computeLogLoss(evaluated),
        }
      : undefined;

  return {
    total: results.length,
    evaluated: evaluated.length,
    correct,
    accuracy: evaluated.length === 0 ? 0 : correct / evaluated.length,
    calibration,
  };
}
