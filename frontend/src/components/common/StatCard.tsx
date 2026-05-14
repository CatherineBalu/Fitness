import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import type { ReactNode } from 'react';

interface StatCardProps {
  icon: ReactNode;
  value: string;
  label: string;
  className?: string;
}

export default function StatCard({
  icon,
  value,
  label,
  className,
}: StatCardProps) {
  return (
    <Card className={cn('hover:ring-primary transition-colors', className)}>
      <CardContent className="flex flex-col items-start gap-3">
        <div className="bg-primary text-primary-foreground flex size-11 shrink-0 items-center justify-center rounded-md">
          {icon}
        </div>
        <span className="text-foreground text-3xl leading-none font-extrabold">
          {value}
        </span>
        <span className="text-muted-foreground text-xs leading-snug">
          {label}
        </span>
      </CardContent>
    </Card>
  );
}
