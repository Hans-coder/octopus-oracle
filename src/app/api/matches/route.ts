import { NextResponse } from 'next/server';
import { getMatches } from '@/lib/football-api';

/**
 * GET /api/matches
 * 取得所有賽程
 *
 * Query params:
 * - dateFrom: ISO date (optional)
 * - dateTo: ISO date (optional)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateFrom = searchParams.get('dateFrom') ?? undefined;
  const dateTo = searchParams.get('dateTo') ?? undefined;

  try {
    const matches = await getMatches({ dateFrom, dateTo });
    return NextResponse.json({
      ok: true,
      count: matches.length,
      matches,
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
