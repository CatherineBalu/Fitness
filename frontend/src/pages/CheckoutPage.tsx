import { useUser } from '@clerk/clerk-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearch, Link } from '@tanstack/react-router';
import { CheckIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useApi } from '@/lib/api';
import { cn } from '@/lib/utils';

const API_URL = import.meta.env.VITE_API_URL as string;

const STEPS = [
  'Contact details',
  'Order summary',
  'Payment',
  'Confirmation',
] as const;

interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  durationDays: number;
}

interface Profile {
  name: string;
  surname: string;
  email: string;
  phoneNumber: string | null;
  hasActiveMembership: boolean;
}

type PaymentMethod = 'card' | 'bank';

const contactSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  agreeSms: z.boolean(),
  agreeEmailMarketing: z.boolean(),
  agreePrivacy: z.boolean().refine((v) => v === true, {
    message: 'You must accept the privacy policy',
  }),
  agreeVisitor: z.boolean().refine((v) => v === true, {
    message: 'You must accept the visitor regulations',
  }),
  agreeTerms: z
    .boolean()
    .refine((v) => v === true, { message: 'You must accept the terms' }),
});

type ContactForm = z.infer<typeof contactSchema>;

function formatPrice(price: string) {
  const num = Number(price);
  return Number.isFinite(num) ? `€${num.toFixed(2)}` : `€${price}`;
}

function formatDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function Stepper({ current }: { current: number }) {
  return (
    <div className="relative mb-12 flex items-start justify-between">
      {STEPS.map((label, i) => {
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
            {i < STEPS.length - 1 && (
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

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { plan: planId } = useSearch({ from: '/checkout' });
  const { user, isLoaded: userLoaded } = useUser();
  const { apiRequest } = useApi();

  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [step, setStep] = useState(0);

  const [contact, setContact] = useState<ContactForm | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [payPending, setPayPending] = useState(false);

  useEffect(() => {
    if (!planId) {
      setLoadError('No plan selected.');
      return;
    }
    let cancelled = false;
    Promise.all([
      fetch(`${API_URL}/subscriptions`).then((r) => r.json()),
      apiRequest<Profile>('/auth/profile'),
    ])
      .then(([plans, prof]: [SubscriptionPlan[], Profile]) => {
        if (cancelled) return;
        const found = plans.find((p) => p.id === planId) ?? null;
        if (!found) setLoadError('Plan not found.');
        setPlan(found);
        setProfile(prof);
      })
      .catch((err: Error) => {
        if (!cancelled) setLoadError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [planId, apiRequest]);

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

  const handlePay = async () => {
    if (!plan) return;
    setPayPending(true);
    try {
      await apiRequest('/subscriptions/buy', {
        method: 'POST',
        body: JSON.stringify({
          subscriptionId: plan.id,
          paymentMethod,
        }),
      });
      setStep(3);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPayPending(false);
    }
  };

  if (!userLoaded) {
    return (
      <div className="bg-background text-foreground min-h-svh px-8 pt-[calc(var(--nav-height)+48px)] pb-20">
        <div className="mx-auto max-w-[960px]">
          <p className="text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-background text-foreground min-h-svh px-8 pt-[calc(var(--nav-height)+48px)] pb-20">
        <div className="mx-auto max-w-[960px]">
          <h1 className="text-foreground mb-2 text-[32px] font-extrabold">
            Please sign in
          </h1>
          <p className="text-muted-foreground mb-8">
            You need to be signed in to purchase a membership.
          </p>
          <Button asChild>
            <Link to="/">Go home</Link>
          </Button>
        </div>
      </div>
    );
  }

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

  if (!plan || !profile) {
    return (
      <div className="bg-background text-foreground min-h-svh px-8 pt-[calc(var(--nav-height)+48px)] pb-20">
        <div className="mx-auto max-w-[960px]">
          <p className="text-muted-foreground">Loading plan…</p>
        </div>
      </div>
    );
  }

  if (profile.hasActiveMembership && step < 3) {
    return (
      <div className="bg-background text-foreground min-h-svh px-8 pt-[calc(var(--nav-height)+48px)] pb-20">
        <div className="mx-auto max-w-[960px]">
          <h1 className="text-foreground mb-2 text-[32px] font-extrabold">
            You already have a membership
          </h1>
          <p className="text-muted-foreground mb-8">
            You can buy a new membership once your current one expires.
          </p>
          <Button asChild>
            <Link to="/">Go home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const SummaryBlock = (
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

  return (
    <div className="bg-background text-foreground min-h-svh px-8 pt-[calc(var(--nav-height)+48px)] pb-20">
      <div className="mx-auto max-w-[960px]">
        <h1 className="text-foreground mb-2 text-[32px] font-extrabold">
          Buy a membership
        </h1>
        <p className="text-muted-foreground mb-8">
          Complete the steps below to activate your plan.
        </p>

        <Stepper current={step} />

        <div className="border-border bg-card rounded-2xl border p-8">
          {step === 0 && (
            <>
              <h2 className="text-foreground mb-1 text-[22px] font-bold">
                Your details
              </h2>
              <p className="text-muted-foreground mb-6 text-sm">
                Review your contact info and accept the required agreements.
              </p>
              {SummaryBlock}
              <Form {...contactForm}>
                <form onSubmit={contactForm.handleSubmit(onSubmitContact)}>
                  <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-1">
                    <FormField
                      control={contactForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            First name{' '}
                            <span className="text-destructive ml-0.5">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={contactForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Last name{' '}
                            <span className="text-destructive ml-0.5">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={contactForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem className="col-span-full">
                          <FormLabel>
                            Email{' '}
                            <span className="text-destructive ml-0.5">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input {...field} readOnly />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <h3 className="text-foreground mt-2 mb-4 text-[18px] font-bold">
                    Agreements & consent
                  </h3>
                  <div className="mb-6 flex flex-col gap-3.5">
                    <ConsentField
                      form={contactForm}
                      name="agreeSms"
                      label="I agree to receive SMS marketing."
                    />
                    <ConsentField
                      form={contactForm}
                      name="agreeEmailMarketing"
                      label="I agree to receive email marketing."
                    />
                    <ConsentField
                      form={contactForm}
                      name="agreePrivacy"
                      required
                      label="I have read and accept the Privacy Policy."
                    />
                    <ConsentField
                      form={contactForm}
                      name="agreeVisitor"
                      required
                      label="I accept the gym's Visitor Regulations."
                    />
                    <ConsentField
                      form={contactForm}
                      name="agreeTerms"
                      required
                      label="I accept the General Terms & Conditions."
                    />
                  </div>

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
                      type="submit"
                      className="bg-primary text-primary-foreground hover:bg-primary/90 min-w-[110px] font-bold"
                    >
                      Next
                    </Button>
                  </div>
                </form>
              </Form>
            </>
          )}

          {step === 1 && contact && (
            <>
              <h2 className="text-foreground mb-1 text-[22px] font-bold">
                Order summary
              </h2>
              <p className="text-muted-foreground mb-6 text-sm">
                Review the details before continuing to payment.
              </p>
              {SummaryBlock}
              <div className="border-border bg-secondary mb-6 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 rounded-xl border px-5 py-4">
                <span className="text-muted-foreground text-sm">Email:</span>
                <span className="text-foreground text-sm font-semibold">
                  {contact.email}
                </span>
                <span className="text-muted-foreground text-sm">
                  First name:
                </span>
                <span className="text-foreground text-sm font-semibold">
                  {contact.firstName}
                </span>
                <span className="text-muted-foreground text-sm">
                  Last name:
                </span>
                <span className="text-foreground text-sm font-semibold">
                  {contact.lastName}
                </span>
              </div>
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
                  className="bg-primary text-primary-foreground hover:bg-primary/90 min-w-[110px] font-bold"
                  onClick={() => setStep(2)}
                >
                  Proceed to payment
                </Button>
              </div>
            </>
          )}

          {step === 2 && (
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
                  onClick={() => setStep(1)}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 min-w-[110px] font-bold disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={handlePay}
                  disabled={payPending}
                >
                  {payPending
                    ? 'Processing…'
                    : `Pay ${formatPrice(plan.price)}`}
                </Button>
              </div>
            </>
          )}

          {step === 3 && (
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
          )}
        </div>
      </div>
    </div>
  );
}

function ConsentField({
  form,
  name,
  label,
  required,
}: {
  form: ReturnType<typeof useForm<ContactForm>>;
  name: keyof ContactForm;
  label: string;
  required?: boolean;
}) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <div className="text-foreground flex items-start gap-2.5 text-sm leading-[1.4]">
            <FormControl>
              <Checkbox
                checked={field.value as boolean}
                onCheckedChange={(c) => field.onChange(!!c)}
              />
            </FormControl>
            <span>
              {label}
              {required && <span className="text-destructive ml-1">*</span>}
            </span>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
