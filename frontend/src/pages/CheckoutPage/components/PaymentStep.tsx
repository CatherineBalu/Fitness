import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { formatPrice } from '@/lib/formatters';

import SummaryBlock from './SummaryBlock';

import type { PaymentMethod } from '../checkoutPage.types';
import type { SubscriptionPlan } from '@/hooks/useSubscriptions';

interface PaymentStepProps {
  plan: SubscriptionPlan;
  validUntil: Date | null;
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (v: PaymentMethod) => void;
  onPay: () => void;
  isPending: boolean;
  onBack: () => void;
}

export default function PaymentStep({
  plan,
  validUntil,
  paymentMethod,
  onPaymentMethodChange,
  onPay,
  isPending,
  onBack,
}: PaymentStepProps) {
  return (
    <>
      <h2 className="text-foreground mb-1 text-[22px] font-bold">
        Choose payment method
      </h2>
      <SummaryBlock plan={plan} validUntil={validUntil} />
      <RadioGroup
        value={paymentMethod}
        onValueChange={(v) => onPaymentMethodChange(v as PaymentMethod)}
        className="mb-6 flex flex-col gap-3.5"
      >
        <label
          htmlFor="pm-card"
          className="border-border bg-secondary hover:border-primary flex cursor-pointer items-center gap-3 rounded-xl border px-[18px] py-3.5 transition-colors"
        >
          <RadioGroupItem value="card" id="pm-card" />
          <span>Credit / Debit card</span>
        </label>
        <label
          htmlFor="pm-bank"
          className="border-border bg-secondary hover:border-primary flex cursor-pointer items-center gap-3 rounded-xl border px-[18px] py-3.5 transition-colors"
        >
          <RadioGroupItem value="bank" id="pm-bank" />
          <span>One-time bank transfer</span>
        </label>
      </RadioGroup>
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
          className="bg-primary text-primary-foreground hover:bg-primary/90 min-w-[110px] font-bold disabled:cursor-not-allowed disabled:opacity-50"
          onClick={onPay}
          disabled={isPending}
        >
          {isPending ? 'Processing…' : `Pay ${formatPrice(plan.price)}`}
        </Button>
      </div>
    </>
  );
}
