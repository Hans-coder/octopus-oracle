import { NextResponse } from 'next/server';
import { getMatches } from '@/lib/football-api';
import { getOddsForMatches } from '@/lib/lottery-scraper';

/**
 * GET /api/odds
 * 取得所有賽事的最新賠率
 */
export async function GET() {
  try {
    const matches = await getMatches();
    const odds = await getOddsForMatches(matches);
    return NextResponse.json({
      ok: true,
      count: odds.length,
      odds,
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
