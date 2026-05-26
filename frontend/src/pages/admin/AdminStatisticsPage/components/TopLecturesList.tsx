import StatList from './StatList';
import StatRow from './StatRow';

import type { TopLecture } from '../adminStatistics.types';

interface TopLecturesListProps {
  data: TopLecture[];
  isLoading: boolean;
}

export default function TopLecturesList({
  data,
  isLoading,
}: TopLecturesListProps) {
  return (
    <StatList
      isLoading={isLoading}
      isEmpty={data.length === 0}
      emptyMessage="No reservations yet."
    >
      {data.map((lecture, index) => (
        <StatRow
          key={lecture.lectureName}
          rank={index + 1}
          label={lecture.lectureName}
          value={String(lecture.reservationCount)}
        />
      ))}
    </StatList>
  );
}
