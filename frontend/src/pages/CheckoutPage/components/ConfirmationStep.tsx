import { Link } from '@tanstack/react-router';
import { CheckIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';

import type { SubscriptionPlan } from '@/hooks/useSubscriptions';

function formatDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

interface ConfirmationStepProps {
  plan: SubscriptionPlan;
  validUntil: Date | null;
}

export default function ConfirmationStep({ plan, validUntil }: ConfirmationStepProps) {
  return (
    <div className="px-4 pt-6 pb-2 text-center">
      <div className="bg-primary text-primary-foreground mb-5 inline-flex size-[72px] items-center justify-center rounded-full">
        <CheckIcon size={36} />
      </div>
      <h3 className="text-foreground mb-2 text-[28px] font-extrabold">
        Payment successful!
      </h3>
      <p className="text-muted-foreground mb-6">
        Your {plan.name} membership is active
        {validUntil ? ` until ${formatDate(validUntil)}` : ''}.
      </p>
      <Button
        asChild
        className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
      >
        <Link to="/">Go to home page</Link>
      </Button>
    </div>
  );
}
