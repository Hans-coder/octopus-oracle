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
import { getMatchStatsMap } from './team-stats';
import { getLLMAnalysisMap, debugCurrentProvider } from './llm-analyst';
import { calculateAccuracy, predictAll } from './octopus';
import {
  getPredictionHistoryMap,
  persistMissingPredictionSnapshots,
} from './prediction-history';
import {
  persistAccuracyRecords,
  calculateHistoricalAccuracy,
} from './accuracy-history';

/** 一次拉滿所有 server 端需要的資料 */
export interface AggregatedData {
  matches: Match[];
  oddsMap: Map<string, Odds>;
  statsMap: Map<string, MatchStats>;
  llmMap: Map<string, LLMAnalysis>;
  predictions: Map<string, Prediction>;
  accuracy: AccuracyBucket;
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
  const oddsMap = oddsToMap(odds);
  const llmMap = await getLLMAnalysisMap(matches, oddsMap, statsMap);
  const freshPredictions = predictAll(matches, oddsMap, statsMap, llmMap);
  const historyPredictions = await getPredictionHistoryMap(matches);

  // Save first-seen predictions to preserve historical hit-rate across deployments.
  await persistMissingPredictionSnapshots(matches, freshPredictions);

  // Persist accuracy records for finished matches to preserve stats
  await persistAccuracyRecords(matches, freshPredictions);

  const predictions = new Map(freshPredictions);
  for (const [matchId, prediction] of historyPredictions) {
    predictions.set(matchId, prediction);
  }

  // Calculate accuracy from full historical records, not just current API results
  const historicalAccuracy = await calculateHistoricalAccuracy();
  const accuracy: AccuracyBucket = {
    total: historicalAccuracy.total,
    evaluated: historicalAccuracy.evaluated,
    correct: historicalAccuracy.correct,
    accuracy: historicalAccuracy.accuracy,
  };

  return {
    matches,
    oddsMap,
    statsMap,
    llmMap,
    predictions,
    accuracy,
    llmProvider: debugCurrentProvider(),
  };
}
