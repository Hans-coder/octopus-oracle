import { getAggregatedData } from '@/lib/page-data';
import { ENGINE } from '@/lib/octopus';
import { LeaderboardContent } from './content';

export const revalidate = 300;

const MIN_EVALUATED = 5;

export default async function LeaderboardPage() {
  const { matches, predictions, accuracy } = await getAggregatedData();

  return (
    <LeaderboardContent
      matches={matches}
      predictions={predictions}
      accuracy={accuracy}
      engineName={ENGINE.name}
      minEvaluated={MIN_EVALUATED}
    />
  );
}
