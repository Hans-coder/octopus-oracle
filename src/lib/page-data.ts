import type {
  EngineAccuracy,
  EngineId,
  LLMAnalysis,
  Match,
  MatchStats,
  Odds,
  PredictionBundle,
} from '@/types';
import { getMatches } from './football-api';
import { getOddsForMatches, oddsToMap } from './lottery-scraper';
import { getMatchStatsMap } from './team-stats';
import { getLLMAnalysisMap, debugCurrentProvider } from './llm-analyst';
import { calculateAllAccuracies, predictBundles } from './octopus';

/** 一次拉滿所有 server 端需要的資料 */
export interface AggregatedData {
  matches: Match[];
  oddsMap: Map<string, Odds>;
  statsMap: Map<string, MatchStats>;
  llmMap: Map<string, LLMAnalysis>;
  bundles: Map<string, PredictionBundle>;
  accuracies: Record<EngineId, EngineAccuracy>;
  llmProvider: 'mock' | 'openai' | 'anthropic';
}

/**
 * 給三個頁面 + /api/predictions 共用的單一入口
 *
 * 順序很重要：
 *   matches → odds → stats → llm（吃 odds + stats）→ bundles（吃全部）→ accuracies
 */
export async function getAggregatedData(): Promise<AggregatedData> {
  const matches = await getMatches();
  const odds = await getOddsForMatches(matches);
  const oddsMap = oddsToMap(odds);
  const statsMap = getMatchStatsMap(matches);
  const llmMap = await getLLMAnalysisMap(matches, oddsMap, statsMap);
  const bundles = predictBundles(matches, oddsMap, statsMap, llmMap);
  const accuracies = calculateAllAccuracies(bundles, matches);

  return {
    matches,
    oddsMap,
    statsMap,
    llmMap,
    bundles,
    accuracies,
    llmProvider: debugCurrentProvider(),
  };
}
