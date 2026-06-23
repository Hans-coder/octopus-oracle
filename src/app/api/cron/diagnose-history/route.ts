import { getRedisClient } from '@/lib/redis';
import { fetchMatchesFromESPN } from '@/lib/espn-api';

export async function GET() {
  const redis = getRedisClient();
  if (!redis) {
    return Response.json({ status: 'error', message: 'Redis 未連接' });
  }

  try {
    const predKeys = await redis.keys('pred:history:v1:*');
    const accKeys = await redis.keys('acc:history:v1:*');

    // 用 45 天視窗抓所有比賽
    const from = new Date(Date.now() - 30 * 86_400_000);
    const espnMatches = await fetchMatchesFromESPN({ from, days: 45 });

    const finishedInEspn = espnMatches.filter(
      (m) => m.status === 'FINISHED' && m.score?.winner,
    );

    // 哪些快照在 ESPN 已完賽比賽中
    const espnFinishedIds = new Set(finishedInEspn.map((m) => m.id));
    const snapshotIds = predKeys.map((k) => k.replace('pred:history:v1:', ''));
    const matchable = snapshotIds.filter((id) => espnFinishedIds.has(id));
    const notFound = snapshotIds.filter((id) => !espnFinishedIds.has(id));

    return Response.json({
      status: 'ok',
      prediction_snapshots: { count: predKeys.length },
      accuracy_records: { count: accKeys.length },
      espn_window: {
        total_matches: espnMatches.length,
        finished_with_result: finishedInEspn.length,
      },
      backfill_potential: {
        matchable_snapshots: matchable.length,
        not_found_in_espn: notFound.length,
        sample_not_found: notFound.slice(0, 5),
        sample_finished: finishedInEspn.slice(0, 3).map(m => ({
          id: m.id,
          match: `${m.homeTeam.name} vs ${m.awayTeam.name}`,
          status: m.status,
          winner: m.score?.winner,
        })),
      },
    });
  } catch (err) {
    return Response.json(
      { status: 'error', message: err instanceof Error ? err.message : '未知錯誤' },
      { status: 500 },
    );
  }
}
