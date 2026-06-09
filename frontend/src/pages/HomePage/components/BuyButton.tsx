import { SignInButton } from '@clerk/clerk-react';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';

import type { EntryPackage } from '@/hooks/useEntryPackages';
import type { SubscriptionPlan } from '@/hooks/useSubscriptions';

interface BuyButtonProps {
  plan: SubscriptionPlan;
  highlighted: boolean;
  hasActiveMembership: boolean;
  authReady: boolean;
  isSignedIn: boolean;
}

export default function BuyButton({
  plan,
  highlighted,
  hasActiveMembership,
  authReady,
  isSignedIn,
}: BuyButtonProps) {
  const btnClass = cn(
    'w-full cursor-pointer rounded-[var(--radius)] border-none py-[13px] text-[15px] font-bold transition-colors',
    highlighted
      ? 'bg-background text-foreground hover:bg-secondary'
      : 'bg-primary text-primary-foreground hover:bg-primary/90',
  );
  const navigate = useNavigate();

  if (!authReady) {
    return (
      <button className={btnClass} disabled>
        Get Started
      </button>
    );
  }

  if (!isSignedIn) {
    return (
      <SignInButton mode="modal" forceRedirectUrl={`/checkout?plan=${plan.id}`}>
        <button className={btnClass}>Get Started</button>
      </SignInButton>
    );
  }

  const handleClick = () => {
    if (hasActiveMembership) {
      toast.info('You already have an active subscription', {
        description: 'View its details from your profile.',
        action: {
          label: 'See my subscriptions',
          onClick: () => void navigate({ to: '/my-profile' }),
        },
      });
      return;
    }
    void navigate({ to: '/checkout', search: { plan: plan.id } });
  };

  return (
    <button type="button" className={btnClass} onClick={handleClick}>
      Get Started
    </button>
  );
}

interface EntryBuyButtonProps {
  pkg: EntryPackage;
  authReady: boolean;
  isSignedIn: boolean;
}

export function EntryBuyButton({
  pkg,
  authReady,
  isSignedIn,
}: EntryBuyButtonProps) {
  const navigate = useNavigate();
  const btnClass =
    'bg-primary text-primary-foreground hover:bg-primary/90 w-full cursor-pointer rounded-[var(--radius)] border-none py-[13px] text-[15px] font-bold transition-colors';

  if (!authReady) {
    return (
      <button className={btnClass} disabled>
        Buy
      </button>
    );
  }

  if (!isSignedIn) {
    return (
      <SignInButton
        mode="modal"
        forceRedirectUrl={`/entry-checkout?package=${pkg.id}`}
      >
        <button className={btnClass}>Buy</button>
      </SignInButton>
    );
  }

  return (
    <button
      type="button"
      className={btnClass}
      onClick={() =>
        void navigate({ to: '/entry-checkout', search: { package: pkg.id } })
      }
    >
      Buy
    </button>
  );
}
