import { NextResponse } from 'next/server';
import { getAggregatedData } from '@/lib/page-data';
import { evaluatePrediction } from '@/lib/octopus';
import type { EngineId, PredictionResult } from '@/types';

/**
 * GET /api/predictions
 * 取得三隻章魚哥對所有比賽的預測 + 各引擎準確率統計
 */
export async function GET() {
  try {
    const { matches, bundles, accuracies, llmProvider } =
      await getAggregatedData();

    const detail = matches.map((match) => {
      const bundle = bundles.get(match.id);
      if (!bundle) return null;

      const perEngine: Record<EngineId, PredictionResult> = {
        paul: evaluatePrediction(bundle.paul, match),
        doctor: evaluatePrediction(bundle.doctor, match),
        oracle: evaluatePrediction(bundle.oracle, match),
      };

      return {
        match,
        consensus: bundle.consensus,
        paul: { ...bundle.paul, ...perEngine.paul },
        doctor: { ...bundle.doctor, ...perEngine.doctor },
        oracle: { ...bundle.oracle, ...perEngine.oracle },
      };
    });

    return NextResponse.json({
      ok: true,
      llmProvider,
      accuracies,
      predictions: detail.filter(Boolean),
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
