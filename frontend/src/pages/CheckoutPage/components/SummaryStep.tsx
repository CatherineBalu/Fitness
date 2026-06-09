import { Button } from '@/components/ui/button';

import SummaryBlock from './SummaryBlock';

import type { ContactForm } from '../checkoutPage.types';
import type { SubscriptionPlan } from '@/hooks/useSubscriptions';

interface SummaryStepProps {
  contact: ContactForm;
  plan: SubscriptionPlan;
  validUntil: Date | null;
  onBack: () => void;
  onNext: () => void;
}

export default function SummaryStep({
  contact,
  plan,
  validUntil,
  onBack,
  onNext,
}: SummaryStepProps) {
  return (
    <>
      <h2 className="text-foreground mb-1 text-[22px] font-bold">
        Order summary
      </h2>
      <p className="text-muted-foreground mb-6 text-sm">
        Review the details before continuing to payment.
      </p>
      <SummaryBlock plan={plan} validUntil={validUntil} />
      <div className="border-border bg-secondary mb-6 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 rounded-xl border px-5 py-4">
        <span className="text-muted-foreground text-sm">Email:</span>
        <span className="text-foreground text-sm font-semibold">
          {contact.email}
        </span>
        <span className="text-muted-foreground text-sm">First name:</span>
        <span className="text-foreground text-sm font-semibold">
          {contact.firstName}
        </span>
        <span className="text-muted-foreground text-sm">Last name:</span>
        <span className="text-foreground text-sm font-semibold">
          {contact.lastName}
        </span>
      </div>
      <div className="mt-2 flex justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          className="border-border text-foreground min-w-[110px]"
          onClick={onBack}
        >
          Previous
        </Button>
        <Button
          type="button"
          className="bg-primary text-primary-foreground hover:bg-primary/90 min-w-[110px] font-bold"
          onClick={onNext}
        >
          Proceed to payment
        </Button>
      </div>
    </>
  );
}
