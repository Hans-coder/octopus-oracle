import { getAggregatedData } from '@/lib/page-data';
import { ENGINE } from '@/lib/octopus';
import { LeaderboardContent } from './content';

export const revalidate = 300;

const MIN_EVALUATED = 5;

export default async function LeaderboardPage() {
  const { accuracy, recentAccuracy, oddsBaselineAccuracy } = await getAggregatedData();

  return (
    <LeaderboardContent
      accuracy={accuracy}
      recentAccuracy={recentAccuracy}
      oddsBaselineAccuracy={oddsBaselineAccuracy}
      engineName={ENGINE.name}
      minEvaluated={MIN_EVALUATED}
    />
  );
}
