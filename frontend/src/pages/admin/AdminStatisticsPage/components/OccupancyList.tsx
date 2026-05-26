import StatList from './StatList';
import StatRow from './StatRow';

import type { OccupancyRow } from '../adminStatistics.types';

interface OccupancyListProps {
  data: OccupancyRow[];
  isLoading: boolean;
}

export default function OccupancyList({ data, isLoading }: OccupancyListProps) {
  return (
    <StatList
      isLoading={isLoading}
      isEmpty={data.length === 0}
      emptyMessage="No schedule data yet."
    >
      {data.map((row) => (
        <StatRow
          key={row.lectureName}
          label={row.lectureName}
          meta={`${row.avgReservations} / ${row.capacity} avg`}
          value={`${row.occupancyPct} %`}
        />
      ))}
    </StatList>
  );
}
