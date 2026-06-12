import type {
  EngineId,
  EngineMeta,
  LLMAnalysis,
  Match,
  MatchStats,
  MultiMarketPicks,
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
// 多玩法預測（大小球 / BTTS / 上半場 / 進球數 / 波膽 / 讓分）
// 從 odds.markets 拿賠率（已含 Poisson 推算過的機率）
// 三隻章魚哥各有個性：
//   - paul (直覺派)：偏好戲劇化選項（OVER / BTTS=YES / 上半場=DRAW），confidence 中等
//   - doctor (科學派)：純 argmax，confidence = 該選項機率
//   - oracle (AI 派)：argmax + 微調，會在 LLM 啟用時參考 LLM 機率
// ─────────────────────────────────────────────
type EngineStyle = 'paul' | 'doctor' | 'oracle';

/** 把「odds 賠率陣列」轉成正規化機率（含莊家抽水修正） */
function oddsArrToProbs(arr: number[]): number[] {
  const ps = arr.map((o) => 1 / Math.max(o, 1.01));
  const sum = ps.reduce((s, p) => s + p, 0) || 1;
  return ps.map((p) => p / sum);
}

function computeMarketExtras(
  match: Match,
  ctx: PredictContext,
  style: EngineStyle,
  rng: () => number,
): MultiMarketPicks {
  const extras: MultiMarketPicks = {};
  const markets = ctx.odds?.markets;

  // ── 用 Poisson 取得「真實機率」做為三隻決策基底 ──
  // 主場優勢只對美加墨適用（與 mock-data 一致）
  const isHomeAdv = isHomeNation(match);
  const { lambdaHome, lambdaAway } = expectedGoals(
    match.homeTeam.tla,
    match.awayTeam.tla,
    isHomeAdv,
  );

  // ── 大小球 ──
  const ou = overUnder(lambdaHome, lambdaAway, 2.5);
  let ouPick: 'OVER' | 'UNDER';
  let ouConf: number;
  if (style === 'paul') {
    // 直覺派偏 OVER（更有戲），但機率差距大時也會理性
    ouPick = ou.over + 0.06 >= ou.under ? 'OVER' : 'UNDER';
    ouConf = ouPick === 'OVER' ? Math.min(0.78, ou.over + 0.06) : ou.under;
  } else {
    ouPick = ou.over >= ou.under ? 'OVER' : 'UNDER';
    ouConf = Math.max(ou.over, ou.under);
    // doctor 給小幅噪音
    if (style === 'doctor') ouConf = Math.min(0.95, ouConf + (rng() - 0.5) * 0.02);
  }
  extras.overUnder = {
    pick: ouPick,
    line: markets?.overUnder?.line ?? 2.5,
    confidence: ouConf,
    reasoning: ouPick === 'OVER'
      ? `預期進球 ${(lambdaHome + lambdaAway).toFixed(1)}，大盤機率 ${Math.round(ou.over * 100)}%`
      : `防守對決，總進球機率不到 2.5 球（${Math.round(ou.under * 100)}%）`,
  };

  // ── BTTS ──
  const bt = bttsModel(lambdaHome, lambdaAway);
  let bttsPick: 'YES' | 'NO';
  let bttsConf: number;
  if (style === 'paul') {
    bttsPick = bt.yes + 0.05 >= bt.no ? 'YES' : 'NO'; // 直覺派偏 YES
    bttsConf = bttsPick === 'YES' ? Math.min(0.78, bt.yes + 0.05) : bt.no;
  } else {
    bttsPick = bt.yes >= bt.no ? 'YES' : 'NO';
    bttsConf = Math.max(bt.yes, bt.no);
  }
  extras.btts = {
    pick: bttsPick,
    confidence: bttsConf,
    reasoning: bttsPick === 'YES'
      ? `兩隊鋒線都有破門能力（${Math.round(bt.yes * 100)}%）`
      : `至少一方會被門將守住（${Math.round(bt.no * 100)}%）`,
  };

  // ── 上半場 1X2 ──
  const ht = halfTime1x2(lambdaHome, lambdaAway);
  let htPick: PredictionPick;
  let htConf: number;
  if (style === 'paul') {
    // 直覺派愛猜「上半場和局」（觀眾期待度高）
    const tweaked = {
      home: ht.home,
      draw: ht.draw + 0.08,
      away: ht.away,
    };
    const top = Object.entries(tweaked).sort(
      ([, a], [, b]) => b - a,
    )[0];
    htPick = top[0].toUpperCase() as PredictionPick;
    htConf = top[1];
  } else {
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
  }
  extras.halfTime = {
    pick: htPick,
    confidence: htConf,
    reasoning:
      htPick === 'DRAW'
        ? `上半場慢熱，雙方互探虛實`
        : htPick === 'HOME'
          ? `${match.homeTeam.name} 開賽火力較強`
          : `${match.awayTeam.name} 客場壓迫，上半場領先`,
  };

  // ── 進球數區間 ──
  const tg = totalGoalsBrackets(lambdaHome, lambdaAway);
  const tgSorted = [...tg].sort((a, b) => b.prob - a.prob);
  // paul 偶爾選第二名以製造驚奇
  const tgChoice =
    style === 'paul' && tgSorted.length > 1 && rng() < 0.18
      ? tgSorted[1]
      : tgSorted[0];
  extras.totalGoals = {
    label: tgChoice.label,
    confidence: tgChoice.prob,
    reasoning: `預估總進球落在 ${tgChoice.label} 區間（${Math.round(tgChoice.prob * 100)}%）`,
  };

  // ── 正確比分 top 3 → 取一 ──
  const csTop = correctScoreTop(lambdaHome, lambdaAway, 3);
  // paul 偶爾從 top3 抽一個非最高的（戲劇性）
  let csChoice = csTop[0];
  if (style === 'paul' && csTop.length > 1 && rng() < 0.35) {
    csChoice = csTop[Math.floor(rng() * Math.min(3, csTop.length))];
  }
  extras.correctScore = {
    home: csChoice.home,
    away: csChoice.away,
    confidence: csChoice.prob,
    reasoning: `波膽神諭：${match.homeTeam.tla} ${csChoice.home}-${csChoice.away} ${match.awayTeam.tla}`,
  };

  // ── 讓分（沿用 odds.markets 的賠率 → 推回機率） ──
  if (markets?.handicap) {
    const [pH, pA] = oddsArrToProbs([
      markets.handicap.homeOdds,
      markets.handicap.awayOdds,
    ]);
    const ahPick: 'HOME' | 'AWAY' = pH >= pA ? 'HOME' : 'AWAY';
    extras.handicap = {
      pick: ahPick,
      line: markets.handicap.line,
      confidence: Math.max(pH, pA),
      reasoning: `讓分線 ${markets.handicap.line > 0 ? '+' : ''}${markets.handicap.line}：吃 ${ahPick === 'HOME' ? match.homeTeam.name : match.awayTeam.name}`,
    };
  }

  return extras;
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
  // 章魚哥的「叛逯」
  const final = chaosBlend(adjusted, PAUL_CHAOS);
  const { pick, confidence } = argmax(final, rng);

  const p = buildPrediction('paul', match, pick, confidence, final, (info) =>
    paulReasoning(seed, info.pickedTeamName, info.isDraw),
  );
  p.extras = computeMarketExtras(match, ctx, 'paul', rng);
  return p;
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

  const p = buildPrediction('doctor', match, pick, confidence, final, (info) =>
    doctorReasoning(
      match,
      ctx,
      info.pickedTeamName,
      Math.round(info.confidence * 100),
      info.isDraw,
    ),
  );
  p.extras = computeMarketExtras(match, ctx, 'doctor', rng);
  return p;
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
  p.extras = computeMarketExtras(match, ctx, 'oracle', rng);
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
