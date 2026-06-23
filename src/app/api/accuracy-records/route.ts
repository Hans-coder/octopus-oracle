import { calculateHistoricalAccuracy } from '@/lib/accuracy-history';
import { getRedisClient } from '@/lib/redis';

/**
 * GET /api/accuracy-records
 * 獲取所有歷史準確度記錄
 * Query params:
 * - limit: 最多回傳幾筆（預設 100）
 * - offset: 分頁位移
 */
export async function GET(request: Request) {
  const redis = getRedisClient();
  if (!redis) {
    return Response.json({ ok: false, error: 'Redis 未連接' }, { status: 500 });
  }

  try {
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '100'), 1000);
    const offset = parseInt(url.searchParams.get('offset') ?? '0');

    // 讀所有準確度紀錄
    const accKeys = await redis.keys('acc:history:v1:*');
    const records = await Promise.all(
      accKeys.map((k) => redis.get(k).catch(() => null)),
    );

    const filtered = records.filter((r): r is any => !!r);

    // 排序：最新的在前
    filtered.sort(
      (a, b) =>
        new Date(b.evaluatedAt).getTime() - new Date(a.evaluatedAt).getTime(),
    );

    // 分頁
    const paginated = filtered.slice(offset, offset + limit);

    // 計算摘要統計
    const stats = await calculateHistoricalAccuracy();

    return Response.json({
      ok: true,
      stats,
      records: paginated.map((r) => ({
        matchId: r.matchId,
        pickedTeam: r.prediction?.pickedTeamName ?? '?',
        picked: r.prediction?.pick ?? 'N/A',
        actual: r.actual ?? 'N/A',
        correct: r.correct,
        confidence: Math.round((r.prediction?.confidence ?? 0) * 100),
        evaluatedAt: new Date(r.evaluatedAt).toLocaleDateString('zh-TW'),
      })),
      pagination: {
        total: filtered.length,
        offset,
        limit,
        hasMore: offset + limit < filtered.length,
      },
    });
  } catch (err) {
    console.error('[accuracy-records] Error:', err);
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : '未知錯誤' },
      { status: 500 },
    );
  }
}
