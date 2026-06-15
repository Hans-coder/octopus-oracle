import { NextResponse } from 'next/server';
import { getMatches } from '@/lib/football-api';

/**
 * GET /api/matches
 * 取得所有賽程（ESPN 公開 API + mock fallback）
 *
 * Query params:
 * - dateFrom: ISO date (optional) — server 端再過濾
 * - dateTo: ISO date (optional)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateFrom = searchParams.get('dateFrom') ?? undefined;
  const dateTo = searchParams.get('dateTo') ?? undefined;

  try {
    const all = await getMatches();
    const filtered = all.filter((m) => {
      const t = new Date(m.utcDate).getTime();
      if (dateFrom && t < new Date(dateFrom).getTime()) return false;
      if (dateTo && t > new Date(dateTo).getTime() + 86_400_000) return false;
      return true;
    });
    return NextResponse.json({
      ok: true,
      count: filtered.length,
      matches: filtered,
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
