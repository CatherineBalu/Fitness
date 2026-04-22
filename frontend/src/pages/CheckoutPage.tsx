import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearch, Link } from '@tanstack/react-router';
import { useUser } from '@clerk/clerk-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { CalendarIcon, CheckIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useApi } from '@/lib/api';
import './CheckoutPage.css';

const API_URL = import.meta.env.VITE_API_URL as string;

const STEPS = [
  'Select subscription',
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
    <div className="checkout-stepper">
      {STEPS.map((label, i) => {
        const state =
          i < current ? 'done' : i === current ? 'active' : 'pending';
        return (
          <div
            key={label}
            className={`checkout-step ${state === 'done' ? 'checkout-step--done' : ''} ${state === 'active' ? 'checkout-step--active' : ''}`}
          >
            <div className="checkout-step-dot">
              {state === 'done' ? <CheckIcon size={16} /> : i + 1}
            </div>
            <span className="checkout-step-label">{label}</span>
            <div className="checkout-step-line" />
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

  // Order state (accumulated across steps)
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [contact, setContact] = useState<ContactForm | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [payPending, setPayPending] = useState(false);

  // Load plan + profile
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
    if (!startDate || !plan) return null;
    const d = new Date(startDate);
    d.setUTCDate(d.getUTCDate() + plan.durationDays);
    return d;
  }, [startDate, plan]);

  // ── Contact form (step 1) ─────────────────────────────────────────
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
    setStep(2);
  };

  const handlePay = async () => {
    if (!plan || !startDate) return;
    setPayPending(true);
    try {
      await apiRequest('/subscriptions/buy', {
        method: 'POST',
        body: JSON.stringify({
          subscriptionId: plan.id,
          startDate: startDate.toISOString().split('T')[0],
          paymentMethod,
        }),
      });
      setStep(4);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPayPending(false);
    }
  };

  // ── Early exits ───────────────────────────────────────────────────
  if (!userLoaded) {
    return (
      <div className="checkout-page">
        <div className="checkout-inner">
          <p style={{ color: 'var(--c-muted)' }}>Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="checkout-page">
        <div className="checkout-inner">
          <h1 className="checkout-title">Please sign in</h1>
          <p className="checkout-sub">
            You need to be signed in to purchase a membership.
          </p>
          <Link to="/" className="btn-primary">
            Go home
          </Link>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="checkout-page">
        <div className="checkout-inner">
          <h1 className="checkout-title">Oops</h1>
          <p className="checkout-sub">{loadError}</p>
          <Link to="/" className="btn-primary">
            Go home
          </Link>
        </div>
      </div>
    );
  }

  if (!plan || !profile) {
    return (
      <div className="checkout-page">
        <div className="checkout-inner">
          <p style={{ color: 'var(--c-muted)' }}>Loading plan…</p>
        </div>
      </div>
    );
  }

  if (profile.hasActiveMembership && step < 4) {
    return (
      <div className="checkout-page">
        <div className="checkout-inner">
          <h1 className="checkout-title">You already have a membership</h1>
          <p className="checkout-sub">
            You can buy a new membership once your current one expires.
          </p>
          <Link to="/" className="btn-primary">
            Go home
          </Link>
        </div>
      </div>
    );
  }

  // ── Step panels ────────────────────────────────────────────────────

  const SummaryBlock = (
    <div className="checkout-summary">
      <span className="checkout-summary-label">Plan:</span>
      <span className="checkout-summary-value">{plan.name}</span>
      <span className="checkout-summary-label">Price:</span>
      <span className="checkout-summary-value">{formatPrice(plan.price)}</span>
      <span className="checkout-summary-label">Duration:</span>
      <span className="checkout-summary-value">{plan.durationDays} days</span>
      {startDate && (
        <>
          <span className="checkout-summary-label">Starts:</span>
          <span className="checkout-summary-value">
            {formatDate(startDate)}
          </span>
        </>
      )}
      {validUntil && (
        <>
          <span className="checkout-summary-label">Valid until:</span>
          <span className="checkout-summary-value">
            {formatDate(validUntil)}
          </span>
        </>
      )}
    </div>
  );

  return (
    <div className="checkout-page">
      <div className="checkout-inner">
        <h1 className="checkout-title">Buy a membership</h1>
        <p className="checkout-sub">
          Complete the steps below to activate your plan.
        </p>

        <Stepper current={step} />

        <div className="checkout-panel">
          {step === 0 && (
            <>
              <h2 className="checkout-panel-title">Select start date</h2>
              <p className="checkout-panel-sub">
                When do you want your {plan.name} membership to begin?
              </p>
              {SummaryBlock}
              <div className="checkout-date-field">
                <label className="checkout-field-label">
                  Membership start date{' '}
                  <span className="checkout-required">*</span>
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button type="button" className="checkout-date-trigger">
                      <CalendarIcon size={16} />
                      {startDate ? formatDate(startDate) : 'Pick a date'}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(d) => setStartDate(d)}
                      disabled={(d) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        return d < today;
                      }}
                    />
                  </PopoverContent>
                </Popover>
                {!startDate && (
                  <p className="checkout-field-hint">
                    Pick the day your {plan.name} should start.
                  </p>
                )}
              </div>
              <div className="checkout-nav">
                <button
                  type="button"
                  className="btn-dark btn-nav"
                  onClick={() => navigate({ to: '/' })}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary btn-nav"
                  disabled={!startDate}
                  onClick={() => setStep(1)}
                >
                  Next
                </button>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h2 className="checkout-panel-title">Your details</h2>
              <p className="checkout-panel-sub">
                Review your contact info and accept the required agreements.
              </p>
              {SummaryBlock}
              <Form {...contactForm}>
                <form onSubmit={contactForm.handleSubmit(onSubmitContact)}>
                  <div className="checkout-fields">
                    <FormField
                      control={contactForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Email <span className="checkout-required">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input {...field} readOnly />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={contactForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            First name{' '}
                            <span className="checkout-required">*</span>
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
                            <span className="checkout-required">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <h3
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      margin: '8px 0 16px',
                    }}
                  >
                    Agreements & consent
                  </h3>
                  <div className="checkout-consents">
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

                  <div className="checkout-nav">
                    <button
                      type="button"
                      className="btn-dark btn-nav"
                      onClick={() => setStep(0)}
                    >
                      Previous
                    </button>
                    <button type="submit" className="btn-primary btn-nav">
                      Next
                    </button>
                  </div>
                </form>
              </Form>
            </>
          )}

          {step === 2 && contact && (
            <>
              <h2 className="checkout-panel-title">Order summary</h2>
              <p className="checkout-panel-sub">
                Review the details before continuing to payment.
              </p>
              {SummaryBlock}
              <div className="checkout-summary">
                <span className="checkout-summary-label">Email:</span>
                <span className="checkout-summary-value">{contact.email}</span>
                <span className="checkout-summary-label">First name:</span>
                <span className="checkout-summary-value">
                  {contact.firstName}
                </span>
                <span className="checkout-summary-label">Last name:</span>
                <span className="checkout-summary-value">
                  {contact.lastName}
                </span>
              </div>
              <div className="checkout-nav">
                <button
                  type="button"
                  className="btn-dark btn-nav"
                  onClick={() => setStep(1)}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="btn-primary btn-nav"
                  onClick={() => setStep(3)}
                >
                  Proceed to payment
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="checkout-panel-title">Choose payment method</h2>
              {SummaryBlock}
              <RadioGroup
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
                className="checkout-payment-options"
              >
                <label htmlFor="pm-card" className="checkout-payment-option">
                  <RadioGroupItem value="card" id="pm-card" />
                  <span>Credit / Debit card</span>
                </label>
                <label htmlFor="pm-bank" className="checkout-payment-option">
                  <RadioGroupItem value="bank" id="pm-bank" />
                  <span>One-time bank transfer</span>
                </label>
              </RadioGroup>
              <div className="checkout-nav">
                <button
                  type="button"
                  className="btn-dark btn-nav"
                  onClick={() => setStep(2)}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="btn-primary btn-nav"
                  onClick={handlePay}
                  disabled={payPending}
                >
                  {payPending
                    ? 'Processing…'
                    : `Pay ${formatPrice(plan.price)}`}
                </button>
              </div>
            </>
          )}

          {step === 4 && (
            <div className="checkout-success">
              <div className="checkout-success-icon">
                <CheckIcon size={36} />
              </div>
              <h3>Payment successful!</h3>
              <p>
                Your {plan.name} membership is active
                {validUntil ? ` until ${formatDate(validUntil)}` : ''}.
              </p>
              <Link to="/" className="btn-primary">
                Go to home page
              </Link>
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
          <div className="checkout-consent-row">
            <FormControl>
              <Checkbox
                checked={field.value as boolean}
                onCheckedChange={(c) => field.onChange(!!c)}
              />
            </FormControl>
            <span>
              {label}
              {required && <span className="checkout-required">*</span>}
            </span>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
