import type {
  AccuracyBucket,
  LLMAnalysis,
  Match,
  MatchStats,
  Odds,
  Prediction,
} from '@/types';
import { getMatches } from './football-api';
import { getOddsForMatches, oddsToMap } from './lottery-scraper';
import { attachOddsTrends, persistOddsSnapshots } from './odds-history';
import { getMatchStatsMap } from './team-stats';
import { getLLMAnalysisMap, debugCurrentProvider } from './llm-analyst';
import { calculateAccuracy, predictAll, predictOddsBaseline } from './octopus';
import {
  getPredictionHistoryMap,
  persistMissingPredictionSnapshots,
} from './prediction-history';
import {
  persistAccuracyRecords,
  calculateHistoricalAccuracy,
  calculateRecentHistoricalAccuracy,
} from './accuracy-history';
import { persistPredictionComparisonRecords } from './prediction-comparison-history';

/** 一次拉滿所有 server 端需要的資料 */
export interface AggregatedData {
  matches: Match[];
  oddsMap: Map<string, Odds>;
  statsMap: Map<string, MatchStats>;
  llmMap: Map<string, LLMAnalysis>;
  predictions: Map<string, Prediction>;
  accuracy: AccuracyBucket;
  recentAccuracy: AccuracyBucket;
  oddsBaselineAccuracy: AccuracyBucket;
  llmProvider: 'disabled' | 'openai' | 'anthropic' | 'gemini' | 'groq' | 'ollama';
}

/**
 * 給三個頁面 + /api/predictions 共用的單一入口
 *
 * 順序很重要：
 *   matches → odds → stats → llm（吃 odds + stats）→ predictions（吃全部）→ accuracy
 */
export async function getAggregatedData(): Promise<AggregatedData> {
  const matches = await getMatches();
  const [odds, statsMap] = await Promise.all([
    getOddsForMatches(matches),
    Promise.resolve(getMatchStatsMap(matches)),
  ]);
  const oddsMapRaw = oddsToMap(odds);
  const oddsMap = await attachOddsTrends(oddsMapRaw);
  await persistOddsSnapshots(oddsMap);
  const llmMap = await getLLMAnalysisMap(matches, oddsMap, statsMap);
  const freshPredictions = predictAll(matches, oddsMap, statsMap, llmMap);
  const oddsBaselinePredictions = predictOddsBaseline(matches, oddsMap);
  const historyPredictions = await getPredictionHistoryMap(matches);

  // Save first-seen predictions to preserve historical hit-rate across deployments.
  await persistMissingPredictionSnapshots(matches, freshPredictions);

  // Persist accuracy records for finished matches to preserve stats
  await persistAccuracyRecords(matches, freshPredictions);
  await persistPredictionComparisonRecords(matches, oddsMap, statsMap, llmMap);

  const isPlaceholderPrediction = (pred: Prediction) => {
    const name = pred.pickedTeamName ?? '';
    const flag = pred.pickedTeamFlag ?? '';
    if (name === '待定' || flag === '❔' || name === 'TBD') return true;
    // Reject if pickedTeamName looks like a match ID (all digits/ASCII, no CJK or letters beyond 3 chars)
    // Valid team names contain Chinese chars or multi-letter words like "Brazil", "France"
    // Match IDs look like "320xxx", "4480xxx" (pure ASCII digits)
    if (/^\d+$/.test(name)) return true;
    // Reject if flag is missing or not an emoji (valid flags are flag emojis or 🤝)
    if (!flag || flag.length === 0) return true;
    return false;
  };

  const predictions = new Map(freshPredictions);
  for (const [matchId, prediction] of historyPredictions) {
    if (isPlaceholderPrediction(prediction)) continue;
    predictions.set(matchId, prediction);
  }

  // Calculate accuracy from full historical records, not just current API results
  const historicalAccuracy = await calculateHistoricalAccuracy();
  const recentHistoricalAccuracy = await calculateRecentHistoricalAccuracy(30);
  const accuracy: AccuracyBucket = {
    total: historicalAccuracy.total,
    evaluated: historicalAccuracy.evaluated,
    correct: historicalAccuracy.correct,
    accuracy: historicalAccuracy.accuracy,
  };
  const recentAccuracy: AccuracyBucket = {
    total: recentHistoricalAccuracy.total,
    evaluated: recentHistoricalAccuracy.evaluated,
    correct: recentHistoricalAccuracy.correct,
    accuracy: recentHistoricalAccuracy.accuracy,
  };
  const oddsBaselineAccuracy = calculateAccuracy(oddsBaselinePredictions, matches);

  return {
    matches,
    oddsMap,
    statsMap,
    llmMap,
    predictions,
    accuracy,
    recentAccuracy,
    oddsBaselineAccuracy,
    llmProvider: debugCurrentProvider(),
  };
}
