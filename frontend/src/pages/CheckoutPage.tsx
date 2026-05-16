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
import { cn } from '@/lib/utils';
import { useApi } from '@/lib/api';

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
          <div key={label} className="relative z-[1] flex flex-1 flex-col items-center gap-2.5">
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
                'text-center text-[13px] sm:text-[11px]',
                isDone || isActive ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  'absolute left-[calc(50%+18px)] right-[calc(-50%+18px)] top-[17px] z-0 h-0.5',
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
      <div className="min-h-svh bg-background px-8 pb-20 pt-[calc(var(--nav-height)+48px)] text-foreground">
        <div className="mx-auto max-w-[960px]">
          <p className="text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-svh bg-background px-8 pb-20 pt-[calc(var(--nav-height)+48px)] text-foreground">
        <div className="mx-auto max-w-[960px]">
          <h1 className="mb-2 text-[32px] font-extrabold text-foreground">Please sign in</h1>
          <p className="mb-8 text-muted-foreground">
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
      <div className="min-h-svh bg-background px-8 pb-20 pt-[calc(var(--nav-height)+48px)] text-foreground">
        <div className="mx-auto max-w-[960px]">
          <h1 className="mb-2 text-[32px] font-extrabold text-foreground">Oops</h1>
          <p className="mb-8 text-muted-foreground">{loadError}</p>
          <Button asChild>
            <Link to="/">Go home</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!plan || !profile) {
    return (
      <div className="min-h-svh bg-background px-8 pb-20 pt-[calc(var(--nav-height)+48px)] text-foreground">
        <div className="mx-auto max-w-[960px]">
          <p className="text-muted-foreground">Loading plan…</p>
        </div>
      </div>
    );
  }

  if (profile.hasActiveMembership && step < 3) {
    return (
      <div className="min-h-svh bg-background px-8 pb-20 pt-[calc(var(--nav-height)+48px)] text-foreground">
        <div className="mx-auto max-w-[960px]">
          <h1 className="mb-2 text-[32px] font-extrabold text-foreground">
            You already have a membership
          </h1>
          <p className="mb-8 text-muted-foreground">
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
    <div className="mb-6 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 rounded-xl border border-border bg-secondary px-5 py-4">
      <span className="text-sm text-muted-foreground">Plan:</span>
      <span className="text-sm font-semibold text-foreground">{plan.name}</span>
      <span className="text-sm text-muted-foreground">Price:</span>
      <span className="text-sm font-semibold text-foreground">{formatPrice(plan.price)}</span>
      <span className="text-sm text-muted-foreground">Duration:</span>
      <span className="text-sm font-semibold text-foreground">{plan.durationDays} days</span>
      {validUntil && (
        <>
          <span className="text-sm text-muted-foreground">Valid until:</span>
          <span className="text-sm font-semibold text-foreground">{formatDate(validUntil)}</span>
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-svh bg-background px-8 pb-20 pt-[calc(var(--nav-height)+48px)] text-foreground">
      <div className="mx-auto max-w-[960px]">
        <h1 className="mb-2 text-[32px] font-extrabold text-foreground">Buy a membership</h1>
        <p className="mb-8 text-muted-foreground">
          Complete the steps below to activate your plan.
        </p>

        <Stepper current={step} />

        <div className="rounded-2xl border border-border bg-card p-8">
          {step === 0 && (
            <>
              <h2 className="mb-1 text-[22px] font-bold text-foreground">Your details</h2>
              <p className="mb-6 text-sm text-muted-foreground">
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
                            <span className="ml-0.5 text-red-500">*</span>
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
                            <span className="ml-0.5 text-red-500">*</span>
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
                            Email <span className="ml-0.5 text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input {...field} readOnly />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <h3 className="mb-4 mt-2 text-[18px] font-bold text-foreground">
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
                      className="min-w-[110px] border-border text-foreground"
                      onClick={() => navigate({ to: '/' })}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="min-w-[110px] bg-primary font-bold text-primary-foreground hover:bg-primary/90"
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
              <h2 className="mb-1 text-[22px] font-bold text-foreground">Order summary</h2>
              <p className="mb-6 text-sm text-muted-foreground">
                Review the details before continuing to payment.
              </p>
              {SummaryBlock}
              <div className="mb-6 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 rounded-xl border border-border bg-secondary px-5 py-4">
                <span className="text-sm text-muted-foreground">Email:</span>
                <span className="text-sm font-semibold text-foreground">{contact.email}</span>
                <span className="text-sm text-muted-foreground">First name:</span>
                <span className="text-sm font-semibold text-foreground">{contact.firstName}</span>
                <span className="text-sm text-muted-foreground">Last name:</span>
                <span className="text-sm font-semibold text-foreground">{contact.lastName}</span>
              </div>
              <div className="mt-2 flex justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="min-w-[110px] border-border text-foreground"
                  onClick={() => setStep(0)}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  className="min-w-[110px] bg-primary font-bold text-primary-foreground hover:bg-primary/90"
                  onClick={() => setStep(2)}
                >
                  Proceed to payment
                </Button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="mb-1 text-[22px] font-bold text-foreground">Choose payment method</h2>
              {SummaryBlock}
              <RadioGroup
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
                className="mb-6 flex flex-col gap-3.5"
              >
                <label
                  htmlFor="pm-card"
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-secondary px-[18px] py-3.5 transition-colors hover:border-primary"
                >
                  <RadioGroupItem value="card" id="pm-card" />
                  <span>Credit / Debit card</span>
                </label>
                <label
                  htmlFor="pm-bank"
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-secondary px-[18px] py-3.5 transition-colors hover:border-primary"
                >
                  <RadioGroupItem value="bank" id="pm-bank" />
                  <span>One-time bank transfer</span>
                </label>
              </RadioGroup>
              <div className="mt-2 flex justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="min-w-[110px] border-border text-foreground"
                  onClick={() => setStep(1)}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  className="min-w-[110px] bg-primary font-bold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={handlePay}
                  disabled={payPending}
                >
                  {payPending ? 'Processing…' : `Pay ${formatPrice(plan.price)}`}
                </Button>
              </div>
            </>
          )}

          {step === 3 && (
            <div className="px-4 pb-2 pt-6 text-center">
              <div className="mb-5 inline-flex size-[72px] items-center justify-center rounded-full bg-primary text-primary-foreground">
                <CheckIcon size={36} />
              </div>
              <h3 className="mb-2 text-[28px] font-extrabold text-foreground">
                Payment successful!
              </h3>
              <p className="mb-6 text-muted-foreground">
                Your {plan.name} membership is active
                {validUntil ? ` until ${formatDate(validUntil)}` : ''}.
              </p>
              <Button asChild className="bg-primary font-bold text-primary-foreground hover:bg-primary/90">
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
          <div className="flex items-start gap-2.5 text-sm leading-[1.4] text-foreground">
            <FormControl>
              <Checkbox
                checked={field.value as boolean}
                onCheckedChange={(c) => field.onChange(!!c)}
              />
            </FormControl>
            <span>
              {label}
              {required && <span className="ml-1 text-red-500">*</span>}
            </span>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
