import { NextResponse } from 'next/server';
import { getAggregatedData } from '@/lib/page-data';
import { getPredictionComparisonSummary } from '@/lib/prediction-comparison-history';

/**
 * GET /api/metrics
 *
 * 返回当前的性能观测指标
 * - 准确率、样本数、命中数
 * - Brier Score、Log Loss
 * - LLM provider 状态
 * - 上次更新时间
 */
export async function GET() {
  try {
    const { matches, predictions, accuracy, llmProvider } = await getAggregatedData();
    const comparison = await getPredictionComparisonSummary();

    const finishedMatches = matches.filter(
      (m) => m.status === 'FINISHED' && m.score?.winner && !m.isFriendly,
    );

    return NextResponse.json({
      ok: true,
      metrics: {
        accuracy: {
          accuracy: accuracy.accuracy,
          correct: accuracy.correct,
          evaluated: accuracy.evaluated,
          total: accuracy.total,
        },
        calibration: accuracy.calibration,
        aiComparison: comparison,
        sampleSize: finishedMatches.length,
        llmProvider,
        timestamp: new Date().toISOString(),
      },
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
