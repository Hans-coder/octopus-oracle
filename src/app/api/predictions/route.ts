import { NextResponse } from 'next/server';
import { getMatches } from '@/lib/football-api';
import { getOddsForMatches, oddsToMap } from '@/lib/lottery-scraper';
import {
  predictMany,
  evaluatePrediction,
  calculateAccuracy,
} from '@/lib/octopus';

/**
 * GET /api/predictions
 * 取得章魚哥對所有比賽的預測與準確率統計
 */
export async function GET() {
  try {
    const matches = await getMatches();
    const odds = await getOddsForMatches(matches);
    const oddsMap = oddsToMap(odds);
    const predictions = predictMany(matches, oddsMap);

    const results = predictions.map((p) => {
      const m = matches.find((x) => x.id === p.matchId)!;
      return evaluatePrediction(p, m);
    });

    const stats = calculateAccuracy(results);

    return NextResponse.json({
      ok: true,
      stats,
      predictions: results.map((r, idx) => ({
        ...r.prediction,
        actual: r.actual,
        correct: r.correct,
        match: matches[idx],
      })),
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
