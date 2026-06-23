import { backfillAccuracyHistoryFromSnapshots, backfillAllFinishedMatches } from '@/lib/accuracy-history';
import { fetchMatchesFromESPN } from '@/lib/espn-api';

async function runBackfill() {
  // Phase 1: 從預測快照回溯（淘汰賽等有快照的比賽）
  const snapshotResult = await backfillAccuracyHistoryFromSnapshots();

  // Phase 2: 從所有已完賽比賽回溯（小組賽等沒有快照的比賽）
  const from = new Date(Date.now() - 30 * 86_400_000); // 往前 30 天
  const allMatches = await fetchMatchesFromESPN({ from, days: 45 });
  const finishedMatches = allMatches.filter(
    (m) => m.status === 'FINISHED' && m.score?.winner,
  );
  const historicalResult = await backfillAllFinishedMatches(finishedMatches);

  console.log(
    `[backfill] 快照回溯：${snapshotResult.newRecords} 筆，歷史回溯：${historicalResult.newRecords} 筆`,
  );

  return {
    snapshot_backfill: snapshotResult,
    historical_backfill: historicalResult,
    total_new: snapshotResult.newRecords + historicalResult.newRecords,
  };
}

export async function POST() {
  try {
    const result = await runBackfill();
    return Response.json({
      success: true,
      ...result,
      message: `回溯完成：共新增 ${result.total_new} 筆評估記錄`,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : '未知錯誤';
    console.error('[backfill-accuracy] 失敗：', errorMsg);
    return Response.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

export async function GET() {
  try {
    const result = await runBackfill();
    return Response.json({
      success: true,
      ...result,
      message: `回溯完成：共新增 ${result.total_new} 筆評估記錄`,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : '未知錯誤';
    console.error('[backfill-accuracy] 失敗：', errorMsg);
    return Response.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
