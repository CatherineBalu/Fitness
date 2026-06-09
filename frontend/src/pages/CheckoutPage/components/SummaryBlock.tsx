import { formatPrice } from '@/lib/formatters';

import type { SubscriptionPlan } from '@/hooks/useSubscriptions';

function formatDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

interface SummaryBlockProps {
  plan: SubscriptionPlan;
  validUntil: Date | null;
}

export default function SummaryBlock({ plan, validUntil }: SummaryBlockProps) {
  return (
    <div className="border-border bg-secondary mb-6 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 rounded-xl border px-5 py-4">
      <span className="text-muted-foreground text-sm">Plan:</span>
      <span className="text-foreground text-sm font-semibold">{plan.name}</span>
      <span className="text-muted-foreground text-sm">Price:</span>
      <span className="text-foreground text-sm font-semibold">
        {formatPrice(plan.price)}
      </span>
      <span className="text-muted-foreground text-sm">Duration:</span>
      <span className="text-foreground text-sm font-semibold">
        {plan.durationDays} days
      </span>
      {validUntil && (
        <>
          <span className="text-muted-foreground text-sm">Valid until:</span>
          <span className="text-foreground text-sm font-semibold">
            {formatDate(validUntil)}
          </span>
        </>
      )}
    </div>
  );
}
