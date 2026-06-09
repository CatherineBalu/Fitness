import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPrice } from '@/lib/formatters';
import { cn } from '@/lib/utils';

import BuyButton, { EntryBuyButton } from './BuyButton';

import type { EntryPackage } from '@/hooks/useEntryPackages';
import type { SubscriptionPlan } from '@/hooks/useSubscriptions';

function formatMonthlyPrice(price: string, days: number) {
  const num = Number(price);
  if (!Number.isFinite(num) || days <= 0) return `€${price}`;
  const perMonth = num / (days / 30);
  return `€${perMonth.toFixed(0)}`;
}

function formatBillingNote(price: string, days: number) {
  const total = formatPrice(price, 0);
  if (days === 30) return `Billed ${total} each month`;
  if (days === 365) return `Billed ${total} once a year`;
  return `Billed ${total} every ${days} days`;
}

interface PricingSectionProps {
  plans: SubscriptionPlan[];
  entryPackages: EntryPackage[];
  plansLoading: boolean;
  entryPackagesLoading: boolean;
  plansError: boolean;
  hasActiveMembership: boolean;
  authReady: boolean;
  isSignedIn: boolean;
}

export default function PricingSection({
  plans,
  entryPackages,
  plansLoading,
  entryPackagesLoading,
  plansError,
  hasActiveMembership,
  authReady,
  isSignedIn,
}: PricingSectionProps) {
  const highlightIndex = plans.length > 2 ? 1 : -1;

  return (
    <section
      data-testid="pricing-section"
      className="bg-background px-8 py-20"
      id="pricing"
    >
      <div className="mx-auto max-w-[1200px]">
        <h2 className="text-section text-foreground mb-4 text-center font-extrabold">
          Choose the Plan That Fits You Best
        </h2>
        <p className="text-muted-foreground mb-14 text-center text-[15px]">
          No contracts. Cancel anytime.
        </p>
        {plansError && (
          <Alert variant="destructive" className="mx-auto max-w-md">
            <AlertTitle>Couldn't load plans</AlertTitle>
            <AlertDescription>Please try again later.</AlertDescription>
          </Alert>
        )}
        {plansLoading && (
          <div className="mx-auto grid max-w-[960px] grid-cols-1 gap-6 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-[28rem] rounded-xl" />
            ))}
          </div>
        )}
        <div className="mx-auto grid max-w-[960px] grid-cols-1 gap-6 sm:grid-cols-3">
          {plans.map((plan, idx) => {
            const highlighted = idx === highlightIndex;
            return (
              <div
                key={plan.id}
                data-testid="pricing-card"
                className={cn(
                  'flex flex-col rounded-2xl border px-8 py-9',
                  highlighted
                    ? 'border-primary bg-primary text-primary-foreground shadow-[0_20px_60px_rgba(170,204,0,0.25)] sm:-translate-y-2'
                    : 'border-border bg-card',
                )}
              >
                <h3 className="mb-4 text-[20px] font-bold">{plan.name}</h3>
                <div className="mb-7">
                  <span className="text-[50px] leading-none font-extrabold">
                    {formatMonthlyPrice(plan.price, plan.durationDays)}
                  </span>
                  <span
                    className={cn(
                      'ml-0.5 text-[15px]',
                      highlighted
                        ? 'text-primary-foreground/55'
                        : 'text-muted-foreground',
                    )}
                  >
                    /month
                  </span>
                </div>
                <p
                  className={cn(
                    'text-xs-plus -mt-4 mb-7',
                    highlighted
                      ? 'text-primary-foreground/60'
                      : 'text-muted-foreground',
                  )}
                >
                  {formatBillingNote(plan.price, plan.durationDays)}
                </p>
                <ul className="mb-8 flex flex-1 list-none flex-col gap-3 p-0">
                  <li className="flex items-center gap-2.5 text-[14px]">
                    <span
                      className={cn(
                        'font-bold',
                        highlighted
                          ? 'text-primary-foreground'
                          : 'text-primary',
                      )}
                    >
                      ✓
                    </span>
                    Full gym access
                  </li>
                  <li className="flex items-center gap-2.5 text-[14px]">
                    <span
                      className={cn(
                        'font-bold',
                        highlighted
                          ? 'text-primary-foreground'
                          : 'text-primary',
                      )}
                    >
                      ✓
                    </span>
                    Valid for {plan.durationDays} days
                  </li>
                  <li className="flex items-center gap-2.5 text-[14px]">
                    <span
                      className={cn(
                        'font-bold',
                        highlighted
                          ? 'text-primary-foreground'
                          : 'text-primary',
                      )}
                    >
                      ✓
                    </span>
                    Access to group classes
                  </li>
                  <li className="flex items-center gap-2.5 text-[14px]">
                    <span
                      className={cn(
                        'font-bold',
                        highlighted
                          ? 'text-primary-foreground'
                          : 'text-primary',
                      )}
                    >
                      ✓
                    </span>
                    Cancel anytime
                  </li>
                </ul>
                <BuyButton
                  plan={plan}
                  highlighted={highlighted}
                  hasActiveMembership={hasActiveMembership}
                  authReady={authReady}
                  isSignedIn={isSignedIn}
                />
              </div>
            );
          })}
        </div>

        {(entryPackagesLoading || entryPackages.length > 0) && (
          <div className="mx-auto mt-16 max-w-[960px]">
            <h3 className="text-foreground mb-2 text-center text-[22px] font-extrabold">
              Single Entries
            </h3>
            <p className="text-muted-foreground mb-10 text-center text-[15px]">
              No commitment. Pay per visit.
            </p>
            {entryPackagesLoading ? (
              <div className="mx-auto grid max-w-[640px] grid-cols-1 gap-6 sm:grid-cols-2">
                <Skeleton className="h-48 rounded-xl" />
                <Skeleton className="h-48 rounded-xl" />
              </div>
            ) : (
              <div className="mx-auto grid max-w-[640px] grid-cols-1 gap-6 sm:grid-cols-2">
                {entryPackages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className="border-border bg-card flex flex-col rounded-2xl border px-8 py-9"
                  >
                    <h4 className="mb-4 text-[20px] font-bold">{pkg.name}</h4>
                    <div className="mb-2">
                      <span className="text-[50px] leading-none font-extrabold">
                        {formatPrice(pkg.price, 0)}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-xs-plus mb-7">
                      {pkg.entryCount === 1
                        ? 'One gym visit'
                        : `${pkg.entryCount} gym visits · €${(Number(pkg.price) / pkg.entryCount).toFixed(2)} per visit`}
                    </p>
                    <ul className="mb-8 flex flex-1 list-none flex-col gap-3 p-0">
                      <li className="flex items-center gap-2.5 text-[14px]">
                        <span className="text-primary font-bold">✓</span>
                        Full gym access
                      </li>
                      <li className="flex items-center gap-2.5 text-[14px]">
                        <span className="text-primary font-bold">✓</span>
                        No expiry
                      </li>
                      <li className="flex items-center gap-2.5 text-[14px]">
                        <span className="text-primary font-bold">✓</span>
                        QR code entry
                      </li>
                    </ul>
                    <EntryBuyButton
                      pkg={pkg}
                      authReady={authReady}
                      isSignedIn={isSignedIn}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
