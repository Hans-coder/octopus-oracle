import type { Match, Prediction } from '@/types';
import { getRedisClient } from './redis';
import { evaluatePrediction, actualPickFromMatch, predictAll } from './octopus';
import { getMatchStatsMap } from './team-stats';
import { oddsToMap, getOddsForMatches } from './lottery-scraper';

interface AccuracyRecord {
  matchId: string;
  prediction: Prediction;
  actual: string | null;
  correct: boolean | null;
  evaluatedAt: string;
}

function historyKey(matchId: string): string {
  return `acc:history:v2:${matchId}`;
}

/** 從 Redis 讀已評估的全部比賽結果 */
export async function getAllAccuracyHistory(): Promise<AccuracyRecord[]> {
  const redis = getRedisClient();
  if (!redis) return [];

  try {
    const keys = await redis.keys('acc:history:v2:*');
    if (keys.length === 0) return [];

    const records = await Promise.all(
      keys.map(async (key) => {
        try {
          const record = await redis.get<AccuracyRecord>(key);
          return record ?? null;
        } catch {
          return null;
        }
      }),
    );

    return records.filter((r): r is AccuracyRecord => !!r);
  } catch {
    return [];
  }
}

/** 為已結束的比賽評估並存進歷史表 */
export async function persistAccuracyRecords(
  matches: Match[],
  predictions: Map<string, Prediction>,
): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;

  const finishedMatches = matches.filter(
    (m) => m.status === 'FINISHED' && m.score?.winner && !m.isFriendly,
  );

  await Promise.all(
    finishedMatches.map(async (m) => {
      const key = historyKey(m.id);
      try {
        const existing = await redis.get<AccuracyRecord>(key);
        if (existing) return; // 已存在就不覆蓋

        const prediction = predictions.get(m.id);
        if (!prediction) return;

        const actual = actualPickFromMatch(m);
        const result = evaluatePrediction(prediction, m);

        const record: AccuracyRecord = {
          matchId: m.id,
          prediction,
          actual: actual ?? null,
          correct: result.correct,
          evaluatedAt: new Date().toISOString(),
        };

        await redis.set(key, record);
      } catch {
        // Keep resilient to Redis errors
      }
    }),
  );
}

/** 從全部歷史記錄計算準確度（包括已從 API 消失的比賽） */
export async function calculateHistoricalAccuracy(): Promise<{
  total: number;
  evaluated: number;
  correct: number;
  accuracy: number;
}> {
  const records = await getAllAccuracyHistory();

  const evaluated = records.filter((r) => r.correct !== null);
  const correct = evaluated.filter((r) => r.correct === true).length;

  return {
    total: records.length,
    evaluated: evaluated.length,
    correct,
    accuracy: evaluated.length === 0 ? 0 : correct / evaluated.length,
  };
}

/** 從最新往回取 N 場已評估比賽，計算近期準確度 */
export async function calculateRecentHistoricalAccuracy(
  limit = 30,
): Promise<{
  total: number;
  evaluated: number;
  correct: number;
  accuracy: number;
}> {
  const records = await getAllAccuracyHistory();

  const recentEvaluated = records
    .filter((r) => r.correct !== null)
    .sort(
      (a, b) =>
        new Date(b.evaluatedAt).getTime() - new Date(a.evaluatedAt).getTime(),
    )
    .slice(0, Math.max(1, limit));

  const correct = recentEvaluated.filter((r) => r.correct === true).length;

  return {
    total: recentEvaluated.length,
    evaluated: recentEvaluated.length,
    correct,
    accuracy: recentEvaluated.length === 0 ? 0 : correct / recentEvaluated.length,
  };
}

/** 回溯載入所有預測快照的結果進歷史表 */
export async function backfillAccuracyHistoryFromSnapshots(): Promise<{
  processed: number;
  newRecords: number;
  skipped: number;
}> {
  const redis = getRedisClient();
  if (!redis) return { processed: 0, newRecords: 0, skipped: 0 };

  let processed = 0;
  let newRecords = 0;
  let skipped = 0;

  try {
    // 讀所有預測快照 key
    const predKeys = await redis.keys('pred:history:v2:*');
    if (predKeys.length === 0) return { processed: 0, newRecords: 0, skipped: 0 };

    // 一次批次抓所有比賽（往前 30 天 + 往後 14 天，涵蓋完整世界杯賽期）
    const { fetchMatchesFromESPN } = await import('./espn-api');
    const from = new Date(Date.now() - 30 * 86_400_000); // 30 天前
    const allMatches = await fetchMatchesFromESPN({ from, days: 44 }); // 30+14 天
    const matchMap = new Map<string, Match>(allMatches.map((m) => [m.id, m]));

    // 批次讀取所有已存在的 acc 記錄（避免逐一查詢）
    const accKeys = predKeys.map((k) => historyKey(k.replace('pred:history:v2:', '')));
    const existingAccRecords = await Promise.all(
      accKeys.map((k) => redis.get<AccuracyRecord>(k).catch(() => null)),
    );
    const existingAccSet = new Set(
      existingAccRecords
        .map((r, i) => (r ? predKeys[i].replace('pred:history:v2:', '') : null))
        .filter((id): id is string => id !== null),
    );

    // 批次讀取所有預測快照
    const predictions = await Promise.all(
      predKeys.map((k) => redis.get<Prediction>(k).catch(() => null)),
    );

    for (let i = 0; i < predKeys.length; i++) {
      const matchId = predKeys[i].replace('pred:history:v2:', '');

      // 已有記錄就跳過
      if (existingAccSet.has(matchId)) {
        skipped++;
        processed++;
        continue;
      }

      const prediction = predictions[i];
      if (!prediction) {
        processed++;
        continue;
      }

      const match = matchMap.get(matchId);
      if (!match || match.status !== 'FINISHED' || !match.score?.winner) {
        processed++;
        continue;
      }

      try {
        const actual = actualPickFromMatch(match);
        const result = evaluatePrediction(prediction, match);

        const record: AccuracyRecord = {
          matchId,
          prediction,
          actual: actual ?? null,
          correct: result.correct,
          evaluatedAt: new Date().toISOString(),
        };

        await redis.set(historyKey(matchId), record);
        newRecords++;
      } catch {
        // Keep resilient
      }
      processed++;
    }

    return { processed, newRecords, skipped };
  } catch (err) {
    console.error('[backfill] 錯誤：', err);
    return { processed, newRecords, skipped };
  }
}

/**
 * 回溯所有已完賽比賽的準確度（不需要原始快照）
 * 用確定性引擎重新生成預測，然後對比實際結果
 * 適用於系統建立前就已完賽的比賽（例如小組賽）
 */
export async function backfillAllFinishedMatches(
  finishedMatches: Match[],
): Promise<{ processed: number; newRecords: number; skipped: number }> {
  const redis = getRedisClient();
  if (!redis) return { processed: 0, newRecords: 0, skipped: 0 };

  let processed = 0;
  let newRecords = 0;
  let skipped = 0;

  // 只處理有結果的比賽
  const eligible = finishedMatches.filter(
    (m) => m.status === 'FINISHED' && m.score?.winner && !m.isFriendly,
  );

  // 批次檢查哪些已有紀錄
  const existingKeys = await Promise.all(
    eligible.map((m) =>
      redis.get<AccuracyRecord>(historyKey(m.id)).catch(() => null),
    ),
  );
  const newMatches = eligible.filter((_, i) => !existingKeys[i]);
  skipped = eligible.length - newMatches.length;

  if (newMatches.length === 0) {
    return { processed: eligible.length, newRecords: 0, skipped };
  }

  // 為這批比賽生成確定性預測（章魚哥的預測用種子，同樣的比賽永遠同樣結果）
  const [odds] = await Promise.all([getOddsForMatches(newMatches)]);
  const oddsMap = oddsToMap(odds);
  const statsMap = getMatchStatsMap(newMatches);
  const llmMap = new Map(); // 回溯不用 LLM，純統計

  const predictions = predictAll(newMatches, oddsMap, statsMap, llmMap);

  for (const match of newMatches) {
    try {
      const prediction = predictions.get(match.id);
      if (!prediction) {
        processed++;
        continue;
      }

      const actual = actualPickFromMatch(match);
      const result = evaluatePrediction(prediction, match);

      const record: AccuracyRecord = {
        matchId: match.id,
        prediction,
        actual: actual ?? null,
        correct: result.correct,
        evaluatedAt: new Date().toISOString(),
      };

      await redis.set(historyKey(match.id), record);
      // 同時存預測快照（方便未來查詢）
      await redis.set(`pred:history:v2:${match.id}`, prediction);
      newRecords++;
    } catch {
      // Keep resilient
    }
    processed++;
  }

  processed += skipped;
  return { processed, newRecords, skipped };
}
