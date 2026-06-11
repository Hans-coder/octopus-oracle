import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getMatches } from '@/lib/football-api';
import { getOddsForMatches, oddsToMap } from '@/lib/lottery-scraper';
import { getMatchStatsMap } from '@/lib/team-stats';
import {
  invalidateLLMCache,
  getLLMAnalysisMap,
  debugCurrentProvider,
} from '@/lib/llm-analyst';
import { isPast } from '@/lib/utils';

/**
 * GET /api/cron/llm-analyze
 *
 * 由 Vercel Cron Job 觸發，預先暖機所有「未來 7 天內、尚未結束」比賽的
 * LLM 分析結果，避免 SSR 時 on-demand 呼叫造成 timeout / 燒錢。
 *
 * 安全性：必須附上 Authorization: Bearer <CRON_SECRET>
 *
 * provider=mock 時依然會跑（無 cost），確保程式碼路徑健全
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const expected = process.env.CRON_SECRET;

  if (expected && authHeader !== `Bearer ${expected}`) {
    return NextResponse.json(
      { ok: false, error: 'unauthorized' },
      { status: 401 },
    );
  }

  try {
    const matches = await getMatches();

    // 只暖機未來 7 天 + 尚未結束的比賽，避免無謂 token 開銷
    const sevenDaysLater = Date.now() + 7 * 86400000;
    const upcoming = matches.filter(
      (m) =>
        m.status !== 'FINISHED' &&
        m.status !== 'CANCELLED' &&
        !isPast(m.utcDate) &&
        new Date(m.utcDate).getTime() <= sevenDaysLater,
    );

    const odds = await getOddsForMatches(upcoming);
    const oddsMap = oddsToMap(odds);
    const statsMap = getMatchStatsMap(upcoming);

    // 先清快取再重算（讓真實 LLM provider 重新給最新分析）
    invalidateLLMCache();
    const llmMap = await getLLMAnalysisMap(upcoming, oddsMap, statsMap);

    // 讓三個 SSR 頁面下次請求都重新生成
    revalidatePath('/');
    revalidatePath('/matches');
    revalidatePath('/leaderboard');

    return NextResponse.json({
      ok: true,
      message: 'LLM 神諭已預先暖機',
      provider: debugCurrentProvider(),
      analyzed: llmMap.size,
      candidates: upcoming.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'unknown error',
      },
      { status: 500 },
    );
  }
}
