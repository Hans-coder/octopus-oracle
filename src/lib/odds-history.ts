import type { Odds, PredictionPick } from '@/types';
import { getRedisClient } from './redis';

interface StoredOddsSnapshot {
  homeWin: number;
  draw: number;
  awayWin: number;
  updatedAt: string;
}

const MAX_SNAPSHOTS = 12;
const SNAPSHOT_INTERVAL_MS = 4 * 60 * 60 * 1000;

function historyKey(matchId: string): string {
  return `odds:history:v1:${matchId}`;
}

function implied(odds: Pick<Odds, 'homeWin' | 'draw' | 'awayWin'>) {
  const home = 1 / odds.homeWin;
  const draw = 1 / odds.draw;
  const away = 1 / odds.awayWin;
  const sum = home + draw + away || 1;
  return { home: home / sum, draw: draw / sum, away: away / sum };
}

function buildTrendSummary(
  side: PredictionPick | 'EVEN',
  movement: number,
): string {
  if (movement < 0.012) return '盤勢持平';
  if (side === 'HOME') return '主勝升溫';
  if (side === 'AWAY') return '客勝升溫';
  if (side === 'DRAW') return '和局升溫';
  return '盤勢拉鋸';
}

function getTrendFromSnapshots(
  current: Odds,
  previous?: StoredOddsSnapshot,
): Odds['trend'] | undefined {
  if (!previous) return undefined;

  const now = implied(current);
  const prev = implied(previous);
  const deltas: Array<{ side: PredictionPick; value: number }> = [
    { side: 'HOME', value: now.home - prev.home },
    { side: 'DRAW', value: now.draw - prev.draw },
    { side: 'AWAY', value: now.away - prev.away },
  ];

  deltas.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  const top = deltas[0];
  const favoredSide = Math.abs(top.value) < 0.012 ? 'EVEN' : top.side;
  const movement = Math.abs(top.value);

  return {
    favoredSide,
    movement,
    summary: buildTrendSummary(favoredSide, movement),
    previousUpdatedAt: previous.updatedAt,
    currentUpdatedAt: current.updatedAt,
  };
}

export async function attachOddsTrends(
  oddsMap: Map<string, Odds>,
): Promise<Map<string, Odds>> {
  const redis = getRedisClient();
  if (!redis || oddsMap.size === 0) return oddsMap;

  const entries = await Promise.all(
    Array.from(oddsMap.entries()).map(async ([matchId, odds]) => {
      try {
        const snapshots = (await redis.get<StoredOddsSnapshot[]>(historyKey(matchId))) ?? [];
        const previous = snapshots.at(-1);
        return [matchId, { ...odds, trend: getTrendFromSnapshots(odds, previous) }] as const;
      } catch {
        return [matchId, odds] as const;
      }
    }),
  );

  return new Map(entries);
}

export async function persistOddsSnapshots(oddsMap: Map<string, Odds>): Promise<void> {
  const redis = getRedisClient();
  if (!redis || oddsMap.size === 0) return;

  await Promise.all(
    Array.from(oddsMap.entries()).map(async ([matchId, odds]) => {
      try {
        const key = historyKey(matchId);
        const existing = (await redis.get<StoredOddsSnapshot[]>(key)) ?? [];
        const last = existing.at(-1);
        const nowTs = new Date(odds.updatedAt).getTime();
        const lastTs = last ? new Date(last.updatedAt).getTime() : 0;

        if (
          last &&
          nowTs - lastTs < SNAPSHOT_INTERVAL_MS &&
          last.homeWin === odds.homeWin &&
          last.draw === odds.draw &&
          last.awayWin === odds.awayWin
        ) {
          return;
        }

        const next = [...existing, {
          homeWin: odds.homeWin,
          draw: odds.draw,
          awayWin: odds.awayWin,
          updatedAt: odds.updatedAt,
        }].slice(-MAX_SNAPSHOTS);

        await redis.set(key, next);
      } catch {
        // Keep resilient when Redis is unavailable.
      }
    }),
  );
}
