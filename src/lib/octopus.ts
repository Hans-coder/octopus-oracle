import type { Match, Odds, Prediction, PredictionPick, PredictionResult } from '@/types';
import { seededRandom, stringToSeed } from './utils';

/**
 * 章魚哥（Paul the Octopus 致敬）預測引擎
 *
 * 設計理念：
 * - 種子化隨機：同一場比賽永遠得到相同預測，避免畫面亂跳
 * - 賠率加權：較強的隊伍有較高被選中的機率（但仍保留章魚哥的「神祕性」）
 * - 章魚哥混沌因子：30% 的決策完全隨機（保有趣味性，也才有翻盤可能）
 */

const CHAOS_FACTOR = 0.3; // 章魚哥的「叛逆」程度
const REASONINGS = [
  '潛入深海冥想 5 秒後，章魚哥把觸手放到了 {team} 的盒子上 🐙',
  '經過神祕海流的指引，章魚哥選擇了 {team} 🌊',
  '章魚哥嗅了嗅鹹鹹的海水，預言 {team} 將會勝出 ⚓',
  '感應到水晶球的能量，章魚哥決定相信 {team} ✨',
  '在珊瑚礁打了個轉，章魚哥意味深長地指向 {team} 🪸',
  '吐出一個小泡泡，章魚哥的觸手緊緊吸住 {team} 的標誌 💧',
  '海王波塞頓托夢，告訴章魚哥 {team} 將被眾神眷顧 🔱',
  '章魚哥在水族箱裡跳了個歡快的舞，鎖定 {team} 🐙',
];

const DRAW_REASONINGS = [
  '章魚哥猶豫了好久，最後選擇了「和局」 — 鬥得難分難解 🤝',
  '兩隊的氣場勢均力敵，章魚哥宣告：必定和局 ⚖️',
  '章魚哥嘆了口氣，似乎在說：「這場誰也別想贏」🤷',
  '深海占卜結果出爐：90 分鐘內難分高下 🕒',
];

function buildReasoning(seed: number, teamName: string, isDraw: boolean): string {
  const rng = seededRandom(seed ^ 0xabcdef);
  const list = isDraw ? DRAW_REASONINGS : REASONINGS;
  const text = list[Math.floor(rng() * list.length)];
  return text.replace('{team}', teamName);
}

/**
 * 對單場比賽產生章魚哥預測
 */
export function predict(match: Match, odds?: Odds): Prediction {
  const seed = stringToSeed(`paul-the-octopus::${match.id}`);
  const rng = seededRandom(seed);

  // 計算三種結果的權重（從賠率推導機率）
  let weights: [number, number, number];
  if (odds) {
    const ph = 1 / odds.homeWin;
    const pd = 1 / odds.draw;
    const pa = 1 / odds.awayWin;
    const sum = ph + pd + pa;
    weights = [ph / sum, pd / sum, pa / sum];
  } else {
    weights = [0.4, 0.25, 0.35];
  }

  // 混入混沌因子：(1-c) * 真實機率 + c * 均勻分布
  const uniform = 1 / 3;
  const blended: [number, number, number] = [
    weights[0] * (1 - CHAOS_FACTOR) + uniform * CHAOS_FACTOR,
    weights[1] * (1 - CHAOS_FACTOR) + uniform * CHAOS_FACTOR,
    weights[2] * (1 - CHAOS_FACTOR) + uniform * CHAOS_FACTOR,
  ];

  // 用 seeded rng 抽樣
  const r = rng();
  const picks: PredictionPick[] = ['HOME', 'DRAW', 'AWAY'];
  let cumulative = 0;
  let pickIdx = 0;
  for (let i = 0; i < 3; i++) {
    cumulative += blended[i];
    if (r <= cumulative) {
      pickIdx = i;
      break;
    }
  }

  const pick = picks[pickIdx];
  const confidence = blended[pickIdx];

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
    pick,
    confidence,
    reasoning: buildReasoning(seed, pickedTeamName, isDraw),
    pickedTeamName,
    pickedTeamFlag,
  };
}

/** 批次預測 */
export function predictMany(
  matches: Match[],
  oddsMap: Map<string, Odds>,
): Prediction[] {
  return matches.map((m) => predict(m, oddsMap.get(m.id)));
}

/** 將實際比賽結果轉成 PredictionPick */
export function actualPickFromMatch(match: Match): PredictionPick | null {
  if (!match.score?.winner) return null;
  if (match.score.winner === 'HOME_TEAM') return 'HOME';
  if (match.score.winner === 'AWAY_TEAM') return 'AWAY';
  return 'DRAW';
}

/** 結合預測 + 實際結果 */
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

/** 計算章魚哥準確率 */
export function calculateAccuracy(results: PredictionResult[]): {
  total: number;
  evaluated: number;
  correct: number;
  accuracy: number;
} {
  const evaluated = results.filter((r) => r.correct !== null);
  const correct = evaluated.filter((r) => r.correct === true).length;
  return {
    total: results.length,
    evaluated: evaluated.length,
    correct,
    accuracy: evaluated.length === 0 ? 0 : correct / evaluated.length,
  };
}
