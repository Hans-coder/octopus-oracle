import type {
  EngineId,
  EngineMeta,
  LLMAnalysis,
  Match,
  MatchStats,
  Odds,
  Prediction,
  PredictionBundle,
  PredictionPick,
  PredictionResult,
  ProbabilityTriple,
  AccuracyBucket,
  EngineAccuracy,
} from '@/types';
import { ENGINE_IDS } from '@/types';
import { seededRandom, stringToSeed } from './utils';

/**
 * 三隻章魚哥預測引擎
 *
 *  🐙 章魚哥本人 (paul)    — 直覺派，賠率為主，重 chaos
 *  🧪 章魚博士   (doctor)  — 科學派,賠率 + Elo + form
 *  🔮 章魚神諭官 (oracle) — LLM 派,stats + LLM ensemble
 *
 * 設計理念:
 * - 同一場比賽永遠得到相同預測(種子化)
 * - 三隻有不同個性,但都吃同一份 ctx,方便對比
 * - oracle 在沒有 LLM key 時會自動 fallback 到強化版 doctor
 */

// ─────────────────────────────────────────────
// 常數
// ─────────────────────────────────────────────
const HOME_ADVANTAGE = 0.04;     // 主場 +4% home prob
const DRAW_SUPPRESSION = 0.85;   // 和局係數(賠率轉機率時會高估)

// 章魚哥本人的「叛逆度」:往均勻分布混合的比例
const PAUL_CHAOS = 0.18;

// 章魚博士「科學派」噪音:argmax 後仍給 ±2% 雜訊讓畫面有人味
const DOCTOR_EPSILON = 0.02;

// ─────────────────────────────────────────────
// 引擎 metadata(給 UI 用)
// ─────────────────────────────────────────────
export const ENGINE_META: Record<EngineId, EngineMeta> = {
  paul: {
    id: 'paul',
    emoji: '🐙',
    name: '章魚哥本人',
    shortName: '章魚哥',
    title: '直覺派',
    description: '靠深海感應,可能翻盤',
    accent: 'cyan',
    color: '#22d3ee',
  },
  doctor: {
    id: 'doctor',
    emoji: '🧪',
    name: '章魚博士',
    shortName: '博士',
    title: '科學派',
    description: '冷靜分析賠率與數據',
    accent: 'emerald',
    color: '#34d399',
  },
  oracle: {
    id: 'oracle',
    emoji: '🔮',
    name: '章魚神諭官',
    shortName: '神諭官',
    title: 'AI 派',
    description: '結合 AI 分析與賠率',
    accent: 'violet',
    color: '#a78bfa',
  },
};

export const ENGINES: EngineMeta[] = ENGINE_IDS.map((id) => ENGINE_META[id]);

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
  // 用 form index 與傷兵嚴重度,產生粗略 prob
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
  // 主場優勢:只有主辦國(USA/CAN/MEX)才加
  const homeBoost = isHomeNation ? HOME_ADVANTAGE : 0;
  const adj: ProbabilityTriple = {
    home: p.home + homeBoost,
    draw: p.draw * DRAW_SUPPRESSION,
    away: Math.max(0, p.away - homeBoost * 0.5),
  };
  return normalize(adj);
}

/** 把機率往均勻分布混合 chaos 比例 */
function chaosBlend(p: ProbabilityTriple, chaos: number): ProbabilityTriple {
  const u = 1 / 3;
  return {
    home: p.home * (1 - chaos) + u * chaos,
    draw: p.draw * (1 - chaos) + u * chaos,
    away: p.away * (1 - chaos) + u * chaos,
  };
}

/** argmax,相同時靠 seed 打破 */
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
// 章魚哥本人 — Paul (直覺派)
// ─────────────────────────────────────────────
const PAUL_REASONINGS = [
  '潛入深海冥想 5 秒,章魚哥把觸手放到了 {team} 的盒子上 🐙',
  '經過神祕海流的指引,章魚哥選擇了 {team} 🌊',
  '章魚哥嗅了嗅鹹鹹的海水,預言 {team} 將會勝出 ⚓',
  '感應到水晶球的能量,章魚哥決定相信 {team} ✨',
  '在珊瑚礁打了個轉,章魚哥意味深長地指向 {team} 🪸',
  '吐出一個小泡泡,章魚哥的觸手緊緊吸住 {team} 的標誌 💧',
  '海王波塞頓托夢,告訴章魚哥 {team} 將被眾神眷顧 🔱',
  '章魚哥在水族箱跳了個歡快的舞,鎖定 {team} 🐙',
];

const PAUL_DRAW_REASONINGS = [
  '章魚哥猶豫好久,最後選擇了「和局」— 鬥得難分難解 🤝',
  '兩隊氣場勢均力敵,章魚哥宣告:必定和局 ⚖️',
  '章魚哥嘆了口氣,似乎在說:「這場誰也別想贏」🤷',
  '深海占卜結果出爐:90 分鐘內難分高下 🕒',
];

function paulReasoning(seed: number, teamName: string, isDraw: boolean) {
  const rng = seededRandom(seed ^ 0xabcdef);
  const list = isDraw ? PAUL_DRAW_REASONINGS : PAUL_REASONINGS;
  return list[Math.floor(rng() * list.length)].replace('{team}', teamName);
}

export function predictPaul(match: Match, ctx: PredictContext): Prediction {
  const seed = stringToSeed(`paul-the-octopus::${match.id}`);
  const rng = seededRandom(seed);

  // 賠率主導 + Elo 輔助
  const oddsP = ctx.odds ? oddsToProbs(ctx.odds) : ctx.stats.eloProbs;
  const base = combine(
    { probs: oddsP, weight: 0.6 },
    { probs: ctx.stats.eloProbs, weight: 0.4 },
  );
  const adjusted = applyAdjustments(base, isHomeNation(match));
  // 章魚哥的「叛逆」
  const final = chaosBlend(adjusted, PAUL_CHAOS);
  const { pick, confidence } = argmax(final, rng);

  return buildPrediction('paul', match, pick, confidence, final, (info) =>
    paulReasoning(seed, info.pickedTeamName, info.isDraw),
  );
}

// ─────────────────────────────────────────────
// 章魚博士 — Doctor (科學派)
// ─────────────────────────────────────────────
function doctorReasoning(
  match: Match,
  ctx: PredictContext,
  pickedTeamName: string,
  confidencePct: number,
  isDraw: boolean,
): string {
  const stats = ctx.stats;
  const isPickHome = pickedTeamName === match.homeTeam.name;
  const form = isDraw ? null : isPickHome ? stats.homeForm : stats.awayForm;
  const eloAdv = isDraw
    ? Math.abs(stats.eloDiff)
    : isPickHome
      ? stats.eloDiff
      : -stats.eloDiff;

  const parts: string[] = [];
  if (form) {
    parts.push(`近 5 戰 ${form.wins}W${form.draws}D${form.losses}L`);
  }
  if (Math.abs(eloAdv) > 30) {
    parts.push(`Elo ${eloAdv > 0 ? '領先' : '落後'} ${Math.abs(Math.round(eloAdv))}`);
  }
  if (ctx.odds) {
    const oddsP = oddsToProbs(ctx.odds);
    const oddsPick = isDraw ? oddsP.draw : isPickHome ? oddsP.home : oddsP.away;
    parts.push(`賠率隱含勝率 ${Math.round(oddsPick * 100)}%`);
  }
  parts.push(`綜合信心 ${confidencePct}%`);

  return isDraw
    ? `章魚博士分析:${parts.join('・')}・宣判和局 ⚖️`
    : `章魚博士分析:${parts.join('・')}・推薦 ${pickedTeamName} 🧪`;
}

export function predictDoctor(match: Match, ctx: PredictContext): Prediction {
  const seed = stringToSeed(`doctor-${match.id}`);
  const rng = seededRandom(seed);

  const oddsP = ctx.odds ? oddsToProbs(ctx.odds) : ctx.stats.eloProbs;
  const base = combine(
    { probs: oddsP, weight: 0.55 },
    { probs: ctx.stats.eloProbs, weight: 0.3 },
    { probs: formProbs(ctx.stats), weight: 0.15 },
  );
  const adjusted = applyAdjustments(base, isHomeNation(match));
  // 給小幅噪音避免畫面太工整
  const final = chaosBlend(adjusted, DOCTOR_EPSILON);
  const { pick, confidence } = argmax(final, rng);

  return buildPrediction('doctor', match, pick, confidence, final, (info) =>
    doctorReasoning(
      match,
      ctx,
      info.pickedTeamName,
      Math.round(info.confidence * 100),
      info.isDraw,
    ),
  );
}

// ─────────────────────────────────────────────
// 章魚神諭官 — Oracle (LLM 派)
// ─────────────────────────────────────────────
export function predictOracle(match: Match, ctx: PredictContext): Prediction {
  const seed = stringToSeed(`oracle-${match.id}`);
  const rng = seededRandom(seed);

  const oddsP = ctx.odds ? oddsToProbs(ctx.odds) : ctx.stats.eloProbs;

  let base: ProbabilityTriple;
  let reasoning: string;
  let source: 'mock' | 'openai' | 'anthropic' = 'mock';

  if (ctx.llm) {
    // 集成:賠率 30% + Elo 20% + form 10% + LLM 40%
    base = combine(
      { probs: oddsP, weight: 0.3 },
      { probs: ctx.stats.eloProbs, weight: 0.2 },
      { probs: formProbs(ctx.stats), weight: 0.1 },
      { probs: ctx.llm.probs, weight: 0.4 },
    );
    reasoning = ctx.llm.narrative;
    source = ctx.llm.provider;
  } else {
    // 沒有 LLM:強化版 doctor(form 比重拉高)
    base = combine(
      { probs: oddsP, weight: 0.45 },
      { probs: ctx.stats.eloProbs, weight: 0.3 },
      { probs: formProbs(ctx.stats), weight: 0.25 },
    );
    reasoning = '神諭官今日靜思中(LLM 未啟用),暫以資料分析推算。';
  }

  const adjusted = applyAdjustments(base, isHomeNation(match));
  const final = chaosBlend(adjusted, DOCTOR_EPSILON);
  const { pick, confidence } = argmax(final, rng);

  const p = buildPrediction('oracle', match, pick, confidence, final, () => reasoning);
  p.source = source;
  return p;
}

// ─────────────────────────────────────────────
// Prediction 組裝 + 批次
// ─────────────────────────────────────────────
function buildPrediction(
  engine: EngineId,
  match: Match,
  pick: PredictionPick,
  confidence: number,
  probs: ProbabilityTriple,
  reasoningBuilder: (info: {
    pickedTeamName: string;
    isDraw: boolean;
    confidence: number;
  }) => string,
): Prediction {
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

  return {
    matchId: match.id,
    engine,
    pick,
    confidence,
    probs,
    reasoning: reasoningBuilder({ pickedTeamName, isDraw, confidence }),
    pickedTeamName,
    pickedTeamFlag,
  };
}

/** 為一場比賽產生三隻章魚哥的預測 */
export function predictBundle(
  match: Match,
  ctx: PredictContext,
): PredictionBundle {
  const paul = predictPaul(match, ctx);
  const doctor = predictDoctor(match, ctx);
  const oracle = predictOracle(match, ctx);

  // 三者一致時 consensus = pick;否則 null
  const allSame = paul.pick === doctor.pick && doctor.pick === oracle.pick;
  return {
    matchId: match.id,
    paul,
    doctor,
    oracle,
    consensus: allSame ? paul.pick : null,
  };
}

/** 批次 — 給多場比賽 + 對應 ctx */
export function predictBundles(
  matches: Match[],
  oddsMap: Map<string, Odds>,
  statsMap: Map<string, MatchStats>,
  llmMap: Map<string, LLMAnalysis>,
): Map<string, PredictionBundle> {
  const result = new Map<string, PredictionBundle>();
  for (const m of matches) {
    const stats = statsMap.get(m.id);
    if (!stats) continue;
    const ctx: PredictContext = {
      odds: oddsMap.get(m.id),
      stats,
      llm: llmMap.get(m.id),
    };
    result.set(m.id, predictBundle(m, ctx));
  }
  return result;
}

// ─────────────────────────────────────────────
// 結果評估 + 命中率統計
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

function bucketStats(results: PredictionResult[]): AccuracyBucket {
  const evaluated = results.filter((r) => r.correct !== null);
  const correct = evaluated.filter((r) => r.correct === true).length;
  return {
    total: results.length,
    evaluated: evaluated.length,
    correct,
    accuracy: evaluated.length === 0 ? 0 : correct / evaluated.length,
  };
}

/** 單一引擎的命中率(分 official / friendly / combined) */
export function calculateEngineAccuracy(
  engine: EngineId,
  bundles: Map<string, PredictionBundle>,
  matches: Match[],
): EngineAccuracy {
  const allResults: PredictionResult[] = [];
  const officialResults: PredictionResult[] = [];
  const friendlyResults: PredictionResult[] = [];

  for (const m of matches) {
    const bundle = bundles.get(m.id);
    if (!bundle) continue;
    const p = bundle[engine];
    const result = evaluatePrediction(p, m);
    allResults.push(result);
    if (m.isFriendly) friendlyResults.push(result);
    else officialResults.push(result);
  }

  return {
    engine,
    official: bucketStats(officialResults),
    friendly: bucketStats(friendlyResults),
    combined: bucketStats(allResults),
  };
}

/** 三隻一起算 */
export function calculateAllAccuracies(
  bundles: Map<string, PredictionBundle>,
  matches: Match[],
): Record<EngineId, EngineAccuracy> {
  return {
    paul: calculateEngineAccuracy('paul', bundles, matches),
    doctor: calculateEngineAccuracy('doctor', bundles, matches),
    oracle: calculateEngineAccuracy('oracle', bundles, matches),
  };
}
