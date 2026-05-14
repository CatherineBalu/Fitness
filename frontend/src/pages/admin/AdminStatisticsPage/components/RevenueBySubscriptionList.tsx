import { formatCurrency } from '../formatCurrency';
import StatList from './StatList';
import StatRow from './StatRow';

import type { RevenueBySubscription } from '../adminStatistics.types';

interface RevenueBySubscriptionListProps {
  data: RevenueBySubscription[];
  isLoading: boolean;
}

export default function RevenueBySubscriptionList({
  data,
  isLoading,
}: RevenueBySubscriptionListProps) {
  return (
    <StatList
      isLoading={isLoading}
      isEmpty={data.length === 0}
      emptyMessage="No payment data yet."
    >
      {data.map((row) => (
        <StatRow
          key={row.subscriptionName}
          label={row.subscriptionName}
          meta={`${row.count} payments`}
          value={formatCurrency(row.total)}
        />
      ))}
    </StatList>
  );
}
