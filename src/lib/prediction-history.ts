import type { Match, Prediction } from '@/types';
import { getRedisClient } from './redis';

interface StoredPredictionSnapshot {
  matchId: string;
  prediction: Prediction;
  createdAt: string;
  kickoffAt: string;
}

function historyKey(matchId: string): string {
  return `pred:history:v1:${matchId}`;
}

function isValidPrediction(input: unknown): input is Prediction {
  if (!input || typeof input !== 'object') return false;
  const v = input as Partial<Prediction>;
  if (
    typeof v.matchId !== 'string' ||
    typeof v.pick !== 'string' ||
    typeof v.confidence !== 'number' ||
    !v.probs
  ) return false;
  // Reject if team name looks like a match ID (pure digits) or is missing
  const name = v.pickedTeamName ?? '';
  const flag = v.pickedTeamFlag ?? '';
  if (!name || /^\d+$/.test(name)) return false;
  if (!flag) return false;
  return true;
}

export async function getPredictionHistoryMap(
  matches: Match[],
): Promise<Map<string, Prediction>> {
  const redis = getRedisClient();
  if (!redis || matches.length === 0) return new Map();

  const entries = await Promise.all(
    matches.map(async (m) => {
      try {
        const raw = await redis.get<StoredPredictionSnapshot>(historyKey(m.id));
        if (!raw || !isValidPrediction(raw.prediction)) return null;
        return [m.id, raw.prediction] as const;
      } catch {
        return null;
      }
    }),
  );

  const isPlaceholder = (name: string, flag: string) =>
    name === '待定' || flag === '❔';

  const map = new Map<string, Prediction>();
  for (const e of entries) {
    if (!e) continue;
    const pred = e[1];
    // Skip stale TBD predictions stored before the fix.
    if (
      isPlaceholder(pred.pickedTeamName, pred.pickedTeamFlag) ||
      pred.pickedTeamName === 'TBD'
    ) {
      continue;
    }
    map.set(e[0], e[1]);
  }
  return map;
}

export async function persistMissingPredictionSnapshots(
  matches: Match[],
  predictions: Map<string, Prediction>,
): Promise<void> {
  const redis = getRedisClient();
  if (!redis || matches.length === 0) return;

  // 60 天後自動過期（世界盃一屆約 30 天，保留雙倍緩衝）
  const TTL_SECONDS = 60 * 24 * 60 * 60;

  await Promise.all(
    matches.map(async (m) => {
      if (m.isFriendly) return;
      const prediction = predictions.get(m.id);
      if (!prediction) return;

      // 寫入前再次驗證，防止髒資料入庫
      if (!isValidPrediction(prediction)) return;

      const key = historyKey(m.id);
      try {
        const existing = await redis.get<StoredPredictionSnapshot>(key);
        if (existing) return;

        const snapshot: StoredPredictionSnapshot = {
          matchId: m.id,
          prediction,
          createdAt: new Date().toISOString(),
          kickoffAt: m.utcDate,
        };

        await redis.set(key, snapshot, { ex: TTL_SECONDS });
      } catch {
        // Keep request resilient even if Redis is temporarily unavailable.
      }
    }),
  );
}
