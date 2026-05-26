import { cn } from '@/lib/utils';

import type { ReactNode } from 'react';

interface EmptyStateProps {
  message: string;
  icon?: ReactNode;
  className?: string;
}

export default function EmptyState({
  message,
  icon,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'border-border bg-card text-muted-foreground flex flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-center text-sm',
        className,
      )}
    >
      {icon}
      <span>{message}</span>
    </div>
  );
}
