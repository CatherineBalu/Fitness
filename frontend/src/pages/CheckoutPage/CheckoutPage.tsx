import { useUser } from '@clerk/clerk-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearch, Link } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import Stepper from '@/components/common/Stepper';
import { Button } from '@/components/ui/button';
import { useAuthProfile } from '@/hooks/useAuthProfile';
import { useBuySubscription, useSubscriptions } from '@/hooks/useSubscriptions';

import { contactSchema } from './checkoutPage.types';
import ConfirmationStep from './components/ConfirmationStep';
import ContactStep from './components/ContactStep';
import PaymentStep from './components/PaymentStep';
import SummaryStep from './components/SummaryStep';

import type { ContactForm, PaymentMethod } from './checkoutPage.types';

const STEPS = [
  'Contact details',
  'Order summary',
  'Payment',
  'Confirmation',
] as const;

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { plan: planId } = useSearch({ from: '/checkout' });
  const { user, isLoaded: userLoaded } = useUser();

  const { data: plans, isError: plansLoadError } = useSubscriptions();
  const { data: profile, error: profileError } = useAuthProfile({
    enabled: !!user,
  });
  const buy = useBuySubscription();

  const [step, setStep] = useState(0);
  const [contact, setContact] = useState<ContactForm | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');

  const plan = plans?.find((p) => p.id === planId) ?? null;
  const loadError = !planId
    ? 'No plan selected.'
    : plansLoadError
      ? 'Failed to load subscription plans.'
      : profileError
        ? profileError.message
        : plans !== undefined && !plan
          ? 'Plan not found.'
          : null;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const validUntil = useMemo(() => {
    if (!plan) return null;
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + plan.durationDays);
    return d;
  }, [plan]);

  const contactForm = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
    values: {
      email: profile?.email ?? user?.primaryEmailAddress?.emailAddress ?? '',
      firstName: profile?.name ?? user?.firstName ?? '',
      lastName: profile?.surname ?? user?.lastName ?? '',
      agreeSms: contact?.agreeSms ?? false,
      agreeEmailMarketing: contact?.agreeEmailMarketing ?? false,
      agreePrivacy: contact?.agreePrivacy ?? false,
      agreeVisitor: contact?.agreeVisitor ?? false,
      agreeTerms: contact?.agreeTerms ?? false,
    },
  });

  const onSubmitContact = (values: ContactForm) => {
    setContact(values);
    setStep(1);
  };

  const handlePay = () => {
    if (!plan) return;
    buy.mutate(
      { subscriptionId: plan.id, paymentMethod },
      { onSuccess: () => setStep(3) },
    );
  };

  const pageShell = (children: React.ReactNode) => (
    <div className="bg-background text-foreground min-h-svh px-8 pt-[calc(var(--nav-height)+48px)] pb-20">
      <div className="mx-auto max-w-[960px]">{children}</div>
    </div>
  );

  if (!userLoaded) {
    return pageShell(<p className="text-muted-foreground">Loading…</p>);
  }

  if (!user) {
    return pageShell(
      <>
        <h1 className="text-foreground mb-2 text-[32px] font-extrabold">
          Please sign in
        </h1>
        <p className="text-muted-foreground mb-8">
          You need to be signed in to purchase a membership.
        </p>
        <Button asChild>
          <Link to="/">Go home</Link>
        </Button>
      </>,
    );
  }

  if (loadError) {
    return pageShell(
      <>
        <h1 className="text-foreground mb-2 text-[32px] font-extrabold">
          Oops
        </h1>
        <p className="text-muted-foreground mb-8">{loadError}</p>
        <Button asChild>
          <Link to="/">Go home</Link>
        </Button>
      </>,
    );
  }

  if (!plan || !profile) {
    return pageShell(<p className="text-muted-foreground">Loading plan…</p>);
  }

  if (profile.hasActiveMembership && step < 3) {
    return pageShell(
      <>
        <h1 className="text-foreground mb-2 text-[32px] font-extrabold">
          You already have a membership
        </h1>
        <p className="text-muted-foreground mb-8">
          You can buy a new membership once your current one expires.
        </p>
        <Button asChild>
          <Link to="/">Go home</Link>
        </Button>
      </>,
    );
  }

  return (
    <div className="bg-background text-foreground min-h-svh px-8 pt-[calc(var(--nav-height)+48px)] pb-20">
      <div className="mx-auto max-w-[960px]">
        <h1 className="text-foreground mb-2 text-[32px] font-extrabold">
          Buy a membership
        </h1>
        <p className="text-muted-foreground mb-8">
          Complete the steps below to activate your plan.
        </p>

        <Stepper steps={STEPS} current={step} />

        <div className="border-border bg-card rounded-2xl border p-8">
          {step === 0 && (
            <ContactStep
              contactForm={contactForm}
              plan={plan}
              validUntil={validUntil}
              onSubmit={onSubmitContact}
              onCancel={() => navigate({ to: '/' })}
            />
          )}

          {step === 1 && contact && (
            <SummaryStep
              contact={contact}
              plan={plan}
              validUntil={validUntil}
              onBack={() => setStep(0)}
              onNext={() => setStep(2)}
            />
          )}

          {step === 2 && (
            <PaymentStep
              plan={plan}
              validUntil={validUntil}
              paymentMethod={paymentMethod}
              onPaymentMethodChange={setPaymentMethod}
              onPay={handlePay}
              isPending={buy.isPending}
              onBack={() => setStep(1)}
            />
          )}

          {step === 3 && (
            <ConfirmationStep plan={plan} validUntil={validUntil} />
          )}
        </div>
      </div>
    </div>
  );
}
