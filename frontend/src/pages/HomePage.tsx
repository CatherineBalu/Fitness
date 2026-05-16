import { SignInButton, useAuth, useClerk } from '@clerk/clerk-react';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { useApi } from '@/lib/api';
import { cn } from '@/lib/utils';

import heroImg from '../assets/hero.png';

const API_URL = import.meta.env.VITE_API_URL as string;

interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  durationDays: number;
}

function formatPrice(price: string) {
  const num = Number(price);
  return Number.isFinite(num) ? `€${num.toFixed(0)}` : `€${price}`;
}

function formatMonthlyPrice(price: string, days: number) {
  const num = Number(price);
  if (!Number.isFinite(num) || days <= 0) return `€${price}`;
  const perMonth = num / (days / 30);
  return `€${perMonth.toFixed(0)}`;
}

function formatBillingNote(price: string, days: number) {
  const total = formatPrice(price);
  if (days === 30) return `Billed ${total} each month`;
  if (days === 365) return `Billed ${total} once a year`;
  return `Billed ${total} every ${days} days`;
}

const trainers = [
  {
    id: 1,
    name: 'Janko Mrkvička',
    speciality: 'Strength & HIIT',
    bio: 'Specializing in strength training and high-intensity interval training. My goal is to push your limits, refine your form, and unlock your true physical potential.',
    tags: ['Strength', 'HIIT', 'Nutrition'],
    img: 'https://randomuser.me/api/portraits/men/32.jpg',
  },
  {
    id: 2,
    name: 'Katarína Nováková',
    speciality: 'Yoga & Mobility',
    bio: 'Dedicated to helping you find balance and flexibility. With 8 years of yoga experience I guide students of all levels toward a stronger, more mindful body.',
    tags: ['Yoga', 'Mobility', 'Meditation'],
    img: 'https://randomuser.me/api/portraits/women/44.jpg',
  },
  {
    id: 3,
    name: 'Martin Horváth',
    speciality: 'Cycling & Cardio',
    bio: 'Former professional cyclist turned coach. I bring real-world endurance experience to every session — whether you are a beginner or chasing a personal best.',
    tags: ['Cycling', 'Cardio', 'Endurance'],
    img: 'https://randomuser.me/api/portraits/men/76.jpg',
  },
  {
    id: 4,
    name: 'Lucia Benešová',
    speciality: 'Pilates & Core',
    bio: 'Core strength is the foundation of every movement. My Pilates-based approach rebuilds posture, reduces pain, and creates lasting functional strength.',
    tags: ['Pilates', 'Core', 'Rehabilitation'],
    img: 'https://randomuser.me/api/portraits/women/68.jpg',
  },
  {
    id: 5,
    name: 'Tomáš Kováč',
    speciality: 'CrossFit & Olympic Lifting',
    bio: 'Certified CrossFit coach and Olympic lifting enthusiast. I thrive on helping athletes of all levels discover what they are truly capable of.',
    tags: ['CrossFit', 'Olympic Lifting', 'Power'],
    img: 'https://randomuser.me/api/portraits/men/52.jpg',
  },
];

function BuyButton({
  plan,
  highlighted,
  hasActiveMembership,
  authReady,
  isSignedIn,
}: {
  plan: SubscriptionPlan;
  highlighted: boolean;
  hasActiveMembership: boolean;
  authReady: boolean;
  isSignedIn: boolean;
}) {
  const btnClass = cn(
    'w-full cursor-pointer rounded-[var(--radius)] border-none py-[13px] text-[15px] font-bold transition-colors',
    highlighted
      ? 'bg-background text-foreground hover:bg-secondary'
      : 'bg-primary text-primary-foreground hover:bg-primary/90',
  );
  const navigate = useNavigate();
  const { openUserProfile } = useClerk();

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
          onClick: () => openUserProfile(),
        },
      });
      return;
    }
    navigate({ to: '/checkout', search: { plan: plan.id } });
  };

  return (
    <button type="button" className={btnClass} onClick={handleClick}>
      Get Started
    </button>
  );
}

export default function HomePage() {
  const { isSignedIn, isLoaded } = useAuth();
  const { apiRequest } = useApi();

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [profileActive, setProfileActive] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/subscriptions`)
      .then((res) => res.json())
      .then((data: SubscriptionPlan[]) => {
        if (!cancelled) setPlans(data);
      })
      .catch((err: Error) => {
        if (!cancelled) setPlansError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let cancelled = false;
    apiRequest<{ hasActiveMembership: boolean }>('/auth/profile')
      .then((p) => {
        if (!cancelled) setProfileActive(!!p.hasActiveMembership);
      })
      .catch(() => {
        if (!cancelled) setProfileActive(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, apiRequest]);

  const hasActiveMembership = isSignedIn ? (profileActive ?? false) : false;

  const highlightIndex = plans.length > 2 ? 1 : -1;

  return (
    <>
      {/* ── Hero ── */}
      <section className="relative flex h-svh items-center justify-center overflow-hidden text-center">
        <img src={heroImg} alt="Gym" className="absolute inset-0 h-full w-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/55 to-background/75" />
        <div className="relative max-w-[760px] px-6">
          <p className="mb-4 text-[13px] font-semibold uppercase tracking-[3px] text-primary">
            Welcome to our gym
          </p>
          <h1 className="mb-5 text-[clamp(36px,6vw,68px)] font-extrabold leading-[1.1] text-white">
            Pursue Outdoor,&nbsp;
            <span className="text-primary">Fitness Performance</span>
          </h1>
          <p className="mx-auto mb-8 max-w-[520px] text-center text-[17px] leading-[1.6] text-white/70">
            Join our world-class fitness facility and transform your body. Expert trainers, modern
            equipment, and flexible membership plans.
          </p>
          <button
            className="cursor-pointer rounded-[14px] border-none bg-primary px-9 py-4 text-[17px] font-bold text-primary-foreground transition-colors hover:bg-primary/90"
            onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Get Started
          </button>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="border-b border-t border-border bg-card px-8 py-10" id="about">
        <div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-6 text-center sm:grid-cols-4">
          {[
            { value: '5 000+', label: 'Active Members' },
            { value: '50+', label: 'Weekly Classes' },
            { value: '30+', label: 'Expert Trainers' },
            { value: '10+', label: 'Years of Experience' },
          ].map((s) => (
            <div className="flex flex-col gap-1.5" key={s.label}>
              <span className="text-[38px] font-extrabold leading-none text-primary">{s.value}</span>
              <span className="text-[14px] uppercase tracking-[1px] text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="bg-background px-8 py-20" id="pricing">
        <div className="mx-auto max-w-[1200px]">
          <h2 className="mb-4 text-center text-[clamp(26px,3.5vw,38px)] font-extrabold text-white">
            Choose the Plan That Fits You Best
          </h2>
          <p className="mb-14 text-center text-[15px] text-muted-foreground">
            No contracts. Cancel anytime.
          </p>
          {plansError && (
            <p className="mb-6 text-center text-muted-foreground">
              Couldn't load plans. Please try again later.
            </p>
          )}
          <div className="mx-auto grid max-w-[960px] grid-cols-1 gap-6 sm:grid-cols-3">
            {plans.map((plan, idx) => {
              const highlighted = idx === highlightIndex;
              return (
                <div
                  key={plan.id}
                  className={cn(
                    'flex flex-col rounded-2xl border px-8 py-9',
                    highlighted
                      ? 'border-primary bg-primary text-primary-foreground shadow-[0_20px_60px_rgba(170,204,0,0.25)] sm:-translate-y-2'
                      : 'border-border bg-card',
                  )}
                >
                  <h3 className="mb-4 text-[20px] font-bold">{plan.name}</h3>
                  <div className="mb-7">
                    <span className="text-[50px] font-extrabold leading-none">
                      {formatMonthlyPrice(plan.price, plan.durationDays)}
                    </span>
                    <span
                      className={cn(
                        'ml-0.5 text-[15px]',
                        highlighted ? 'text-primary-foreground/55' : 'text-muted-foreground',
                      )}
                    >
                      /month
                    </span>
                  </div>
                  <p
                    className={cn(
                      '-mt-4 mb-7 text-[13px]',
                      highlighted ? 'text-primary-foreground/60' : 'text-muted-foreground',
                    )}
                  >
                    {formatBillingNote(plan.price, plan.durationDays)}
                  </p>
                  <ul className="mb-8 flex flex-1 flex-col gap-3 list-none p-0">
                    <li className="flex items-center gap-2.5 text-[14px]">
                      <span className={cn('font-bold', highlighted ? 'text-primary-foreground' : 'text-primary')}>✓</span>
                      Full gym access
                    </li>
                    <li className="flex items-center gap-2.5 text-[14px]">
                      <span className={cn('font-bold', highlighted ? 'text-primary-foreground' : 'text-primary')}>✓</span>
                      Valid for {plan.durationDays} days
                    </li>
                    <li className="flex items-center gap-2.5 text-[14px]">
                      <span className={cn('font-bold', highlighted ? 'text-primary-foreground' : 'text-primary')}>✓</span>
                      Access to group classes
                    </li>
                    <li className="flex items-center gap-2.5 text-[14px]">
                      <span className={cn('font-bold', highlighted ? 'text-primary-foreground' : 'text-primary')}>✓</span>
                      Cancel anytime
                    </li>
                  </ul>
                  <BuyButton
                    plan={plan}
                    highlighted={highlighted}
                    hasActiveMembership={hasActiveMembership}
                    authReady={isLoaded}
                    isSignedIn={!!isSignedIn}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Trainers ── */}
      <section className="border-t border-border bg-card px-8 py-20" id="trainers">
        <div className="mx-auto max-w-[1200px]">
          <h2 className="mb-4 text-center text-[clamp(26px,3.5vw,38px)] font-extrabold text-white">
            Train with the Elite
          </h2>
          <p className="mb-14 text-center text-[15px] text-muted-foreground">
            Ready to take your workouts to the next level? Our top-tier coaches are here to push
            your limits, refine your form, and unlock your true physical potential.
          </p>
          <div className="relative px-12">
            <Carousel opts={{ align: 'start', loop: true }}>
              <CarouselContent>
                {trainers.map((trainer) => (
                  <CarouselItem key={trainer.id} className="md:basis-1/2 lg:basis-1/3">
                    <Card className="flex h-full flex-col rounded-2xl border border-border bg-background text-foreground transition-colors hover:border-primary">
                      <CardHeader className="flex justify-center pt-7">
                        <img
                          src={trainer.img}
                          alt={trainer.name}
                          className="h-24 w-24 rounded-full border-[3px] border-primary object-cover"
                        />
                      </CardHeader>
                      <CardContent className="flex-1 px-6 pb-2 pt-4">
                        <h3 className="mb-1 text-center text-[20px] font-bold text-white">
                          {trainer.name}
                        </h3>
                        <p className="mb-3.5 text-center text-[13px] font-semibold uppercase tracking-[0.5px] text-primary">
                          {trainer.speciality}
                        </p>
                        <p className="mb-4 text-center text-[14px] leading-[1.65] text-muted-foreground">
                          {trainer.bio}
                        </p>
                        <div className="flex flex-wrap justify-center gap-1.5">
                          {trainer.tags.map((tag) => (
                            <Badge
                              key={tag}
                              className="border-none bg-secondary text-[11px] font-semibold text-muted-foreground"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                      <CardFooter className="justify-center border-t border-border bg-background px-6 pb-6 pt-4">
                        <Button className="w-full border-none bg-primary font-bold text-primary-foreground hover:bg-primary/90">
                          Contact Coach
                        </Button>
                      </CardFooter>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="border border-border bg-card text-white hover:border-primary hover:bg-secondary" />
              <CarouselNext className="border border-border bg-card text-white hover:border-primary hover:bg-secondary" />
            </Carousel>
          </div>
        </div>
      </section>
    </>
  );
}
