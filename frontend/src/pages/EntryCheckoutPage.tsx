import { useNavigate, useSearch, Link } from '@tanstack/react-router';
import { CheckIcon } from 'lucide-react';
import { useState } from 'react';

import Stepper from '@/components/common/Stepper';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useBuyEntryPackage, useEntryPackages } from '@/hooks/useEntryPackages';
import { formatPrice } from '@/lib/formatters';

const STEPS = ['Order summary', 'Payment', 'Confirmation'] as const;

type PaymentMethod = 'card' | 'bank';

export default function EntryCheckoutPage() {
  const navigate = useNavigate();
  const { package: packageId } = useSearch({ from: '/entry-checkout' });

  const { data: packages, isError } = useEntryPackages();
  const buy = useBuyEntryPackage();

  const [step, setStep] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');

  const pkg = packages?.find((p) => p.id === packageId) ?? null;

  const loadError = !packageId
    ? 'No package selected.'
    : isError
      ? 'Failed to load entry packages.'
      : packages !== undefined && !pkg
        ? 'Package not found.'
        : null;

  const handlePay = () => {
    if (!pkg) return;
    buy.mutate(
      { entryPackageId: pkg.id, paymentMethod },
      { onSuccess: () => setStep(2) },
    );
  };

  if (loadError) {
    return (
      <div className="bg-background text-foreground min-h-svh px-8 pt-[calc(var(--nav-height)+48px)] pb-20">
        <div className="mx-auto max-w-[960px]">
          <h1 className="text-foreground mb-2 text-[32px] font-extrabold">
            Oops
          </h1>
          <p className="text-muted-foreground mb-8">{loadError}</p>
          <Button asChild>
            <Link to="/">Go home</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!pkg) {
    return (
      <div className="bg-background text-foreground min-h-svh px-8 pt-[calc(var(--nav-height)+48px)] pb-20">
        <div className="mx-auto max-w-[960px]">
          <p className="text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  const SummaryBlock = (
    <div className="border-border bg-secondary mb-6 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 rounded-xl border px-5 py-4">
      <span className="text-muted-foreground text-sm">Package:</span>
      <span className="text-foreground text-sm font-semibold">{pkg.name}</span>
      <span className="text-muted-foreground text-sm">Entries:</span>
      <span className="text-foreground text-sm font-semibold">
        {pkg.entryCount}
      </span>
      <span className="text-muted-foreground text-sm">Price:</span>
      <span className="text-foreground text-sm font-semibold">
        {formatPrice(pkg.price)}
      </span>
    </div>
  );

  return (
    <div className="bg-background text-foreground min-h-svh px-8 pt-[calc(var(--nav-height)+48px)] pb-20">
      <div className="mx-auto max-w-[960px]">
        <h1 className="text-foreground mb-2 text-[32px] font-extrabold">
          Buy entry package
        </h1>
        <p className="text-muted-foreground mb-8">
          Complete the steps below to add entries to your account.
        </p>

        <Stepper steps={STEPS} current={step} />

        <div className="border-border bg-card rounded-2xl border p-8">
          {step === 0 && (
            <>
              <h2 className="text-foreground mb-1 text-[22px] font-bold">
                Order summary
              </h2>
              <p className="text-muted-foreground mb-6 text-sm">
                Review your order before proceeding to payment.
              </p>
              {SummaryBlock}
              <div className="mt-2 flex justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="border-border text-foreground min-w-[110px]"
                  onClick={() => navigate({ to: '/' })}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 min-w-[110px] font-bold"
                  onClick={() => setStep(1)}
                >
                  Proceed to payment
                </Button>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h2 className="text-foreground mb-1 text-[22px] font-bold">
                Choose payment method
              </h2>
              {SummaryBlock}
              <RadioGroup
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
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
                  onClick={() => setStep(0)}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 min-w-[110px] font-bold disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={handlePay}
                  disabled={buy.isPending}
                >
                  {buy.isPending
                    ? 'Processing…'
                    : `Pay ${formatPrice(pkg.price)}`}
                </Button>
              </div>
            </>
          )}

          {step === 2 && (
            <div className="px-4 pt-6 pb-2 text-center">
              <div className="bg-primary text-primary-foreground mb-5 inline-flex size-[72px] items-center justify-center rounded-full">
                <CheckIcon size={36} />
              </div>
              <h3 className="text-foreground mb-2 text-[28px] font-extrabold">
                Purchase successful!
              </h3>
              <p className="text-muted-foreground mb-6">
                Your <strong>{pkg.name}</strong> has been added to your account.
              </p>
              <Button
                asChild
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
              >
                <Link to="/">Go to home page</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
