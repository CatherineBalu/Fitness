import EmptyState from '@/components/common/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';

import type { ReactNode } from 'react';

interface StatListProps {
  isLoading: boolean;
  isEmpty: boolean;
  emptyMessage: string;
  children: ReactNode;
}

export default function StatList({
  isLoading,
  isEmpty,
  emptyMessage,
  children,
}: StatListProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 rounded-lg" />
        ))}
      </div>
    );
  }

  if (isEmpty) return <EmptyState message={emptyMessage} />;

  return <div className="flex flex-col gap-2">{children}</div>;
}
