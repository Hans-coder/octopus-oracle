import type { LLMAnalysis, Match, MatchStats, Odds, Prediction } from '@/types';
import { getRedisClient } from './redis';
import { actualPickFromMatch, evaluatePrediction, predictAll } from './octopus';

interface PredictionComparisonRecord {
  matchId: string;
  standardPrediction: Prediction;
  aiPrediction: Prediction | null;
  actual: string | null;
  standardCorrect: boolean | null;
  aiCorrect: boolean | null;
  aiProvider: LLMAnalysis['provider'] | null;
  evaluatedAt: string;
}

function historyKey(matchId: string): string {
  return `pred:compare:v2:${matchId}`;
}

export async function persistPredictionComparisonRecords(
  matches: Match[],
  oddsMap: Map<string, Odds>,
  statsMap: Map<string, MatchStats>,
  llmMap: Map<string, LLMAnalysis>,
): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;

  const finishedMatches = matches.filter(
    (m) => m.status === 'FINISHED' && m.score?.winner && !m.isFriendly,
  );
  if (finishedMatches.length === 0) return;

  const standardPredictions = predictAll(finishedMatches, oddsMap, statsMap, new Map());
  const aiPredictions = llmMap.size > 0
    ? predictAll(finishedMatches, oddsMap, statsMap, llmMap)
    : new Map<string, Prediction>();

  await Promise.all(
    finishedMatches.map(async (match) => {
      const standardPrediction = standardPredictions.get(match.id);
      if (!standardPrediction) return;

      const aiPrediction = aiPredictions.get(match.id) ?? null;
      const actual = actualPickFromMatch(match);
      const standardResult = evaluatePrediction(standardPrediction, match);
      const aiResult = aiPrediction ? evaluatePrediction(aiPrediction, match) : null;

      const key = historyKey(match.id);

      try {
        const existing = await redis.get<PredictionComparisonRecord>(key);
        if (existing && (existing.aiPrediction || !aiPrediction)) return;

        const record: PredictionComparisonRecord = {
          matchId: match.id,
          standardPrediction: existing?.standardPrediction ?? standardPrediction,
          aiPrediction: aiPrediction ?? existing?.aiPrediction ?? null,
          actual: actual ?? null,
          standardCorrect: existing?.standardCorrect ?? standardResult.correct,
          aiCorrect: aiResult?.correct ?? existing?.aiCorrect ?? null,
          aiProvider: aiPrediction?.source ?? existing?.aiProvider ?? null,
          evaluatedAt: existing?.evaluatedAt ?? new Date().toISOString(),
        };

        await redis.set(key, record);
      } catch {
        // Keep resilient when Redis is unavailable.
      }
    }),
  );
}

export async function getPredictionComparisonSummary(): Promise<{
  total: number;
  aiTracked: number;
  standardAccuracy: number;
  aiAccuracy: number | null;
}> {
  const redis = getRedisClient();
  if (!redis) {
    return { total: 0, aiTracked: 0, standardAccuracy: 0, aiAccuracy: null };
  }

  try {
    const keys = await redis.keys('pred:compare:v2:*');
    if (keys.length === 0) {
      return { total: 0, aiTracked: 0, standardAccuracy: 0, aiAccuracy: null };
    }

    const records = (await Promise.all(
      keys.map((k) => redis.get<PredictionComparisonRecord>(k).catch(() => null)),
    )).filter((r): r is PredictionComparisonRecord => !!r);

    const standardEvaluated = records.filter((r) => r.standardCorrect !== null);
    const aiEvaluated = records.filter((r) => r.aiCorrect !== null);

    const standardCorrect = standardEvaluated.filter((r) => r.standardCorrect === true).length;
    const aiCorrect = aiEvaluated.filter((r) => r.aiCorrect === true).length;

    return {
      total: standardEvaluated.length,
      aiTracked: aiEvaluated.length,
      standardAccuracy: standardEvaluated.length === 0 ? 0 : standardCorrect / standardEvaluated.length,
      aiAccuracy: aiEvaluated.length === 0 ? null : aiCorrect / aiEvaluated.length,
    };
  } catch {
    return { total: 0, aiTracked: 0, standardAccuracy: 0, aiAccuracy: null };
  }
}
