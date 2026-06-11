import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getMatches } from '@/lib/football-api';
import { getOddsForMatches } from '@/lib/lottery-scraper';

/**
 * GET /api/cron/update-odds
 *
 * 由 Vercel Cron Job 觸發，定時重新抓取賠率並讓 ISR 快取失效
 * 設定請見 vercel.json
 *
 * 安全性：必須附上 Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const expected = process.env.CRON_SECRET;

  if (expected && authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  try {
    const matches = await getMatches();
    const odds = await getOddsForMatches(matches);

    // 讓相關頁面下次請求重新生成
    revalidatePath('/');
    revalidatePath('/matches');
    revalidatePath('/leaderboard');

    return NextResponse.json({
      ok: true,
      message: '賠率已更新並重整快取',
      matchCount: matches.length,
      oddsCount: odds.length,
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
