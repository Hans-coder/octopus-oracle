import { NextResponse } from 'next/server';
import { getAggregatedData } from '@/lib/page-data';
import { evaluatePrediction } from '@/lib/octopus';

/**
 * GET /api/predictions
 * 取得章魚哥對所有比賽的預測 + 累積準確率
 */
export async function GET() {
  try {
    const { matches, predictions, accuracy, llmProvider } =
      await getAggregatedData();

    const detail = matches
      .map((match) => {
        const prediction = predictions.get(match.id);
        if (!prediction) return null;
        const result = evaluatePrediction(prediction, match);
        return {
          match,
          prediction,
          actual: result.actual,
          correct: result.correct,
        };
      })
      .filter(Boolean);

    return NextResponse.json({
      ok: true,
      llmProvider,
      accuracy,
      predictions: detail,
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
