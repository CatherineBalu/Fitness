import { CheckIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

interface StepperProps {
  steps: readonly string[];
  current: number;
}

export default function Stepper({ steps, current }: StepperProps) {
  return (
    <div className="relative mb-12 flex items-start justify-between">
      {steps.map((label, i) => {
        const isDone = i < current;
        const isActive = i === current;
        return (
          <div
            key={label}
            className="relative z-[1] flex flex-1 flex-col items-center gap-2.5"
          >
            <div
              className={cn(
                'flex size-9 items-center justify-center rounded-full border-2 text-sm font-bold',
                isDone
                  ? 'border-primary bg-primary text-primary-foreground'
                  : isActive
                    ? 'border-primary bg-card text-primary'
                    : 'border-border bg-card text-muted-foreground',
              )}
            >
              {isDone ? <CheckIcon size={16} /> : i + 1}
            </div>
            <span
              className={cn(
                'text-xs-plus text-center sm:text-[11px]',
                isDone || isActive
                  ? 'text-foreground'
                  : 'text-muted-foreground',
              )}
            >
              {label}
            </span>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  'absolute top-[17px] right-[calc(-50%+18px)] left-[calc(50%+18px)] z-0 h-0.5',
                  isDone ? 'bg-primary' : 'bg-border',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
