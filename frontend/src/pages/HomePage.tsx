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
  const className = highlighted
    ? 'btn-dark btn-block'
    : 'btn-primary btn-block';
  const navigate = useNavigate();
  const { openUserProfile } = useClerk();

  if (!authReady) {
    return (
      <button className={className} disabled>
        Get Started
      </button>
    );
  }

  if (!isSignedIn) {
    return (
      <SignInButton mode="modal" forceRedirectUrl={`/checkout?plan=${plan.id}`}>
        <button className={className}>Get Started</button>
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
    <button type="button" className={className} onClick={handleClick}>
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
      <section className="hero-section">
        <img src={heroImg} alt="Gym" className="hero-bg" />
        <div className="hero-overlay" />
        <div className="hero-content">
          <p className="hero-eyebrow">Welcome to our gym</p>
          <h1 className="hero-heading">
            Pursue Outdoor,&nbsp;
            <span className="accent">Fitness Performance</span>
          </h1>
          <p className="hero-sub">
            Join our world-class fitness facility and transform your body.
            Expert trainers, modern equipment, and flexible membership plans.
          </p>
          <button
            className="btn-primary btn-large"
            onClick={() =>
              document
                .getElementById('pricing')
                ?.scrollIntoView({ behavior: 'smooth' })
            }
          >
            Get Started
          </button>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="stats-section" id="about">
        <div className="stats-inner">
          {[
            { value: '5 000+', label: 'Active Members' },
            { value: '50+', label: 'Weekly Classes' },
            { value: '30+', label: 'Expert Trainers' },
            { value: '10+', label: 'Years of Experience' },
          ].map((s) => (
            <div className="stat-item" key={s.label}>
              <span className="stat-value">{s.value}</span>
              <span className="stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="pricing-section" id="pricing">
        <div className="section-inner">
          <h2 className="section-title">Choose the Plan That Fits You Best</h2>
          <p className="section-sub">No contracts. Cancel anytime.</p>
          {plansError && (
            <p style={{ color: 'var(--c-muted)', textAlign: 'center' }}>
              Couldn't load plans. Please try again later.
            </p>
          )}
          <div className="pricing-grid">
            {plans.map((plan, idx) => {
              const highlighted = idx === highlightIndex;
              return (
                <div
                  key={plan.id}
                  className={`pricing-card ${highlighted ? 'pricing-card--highlight' : ''}`}
                >
                  <h3 className="plan-name">{plan.name}</h3>
                  <div className="plan-price">
                    <span className="price-amount">
                      {formatMonthlyPrice(plan.price, plan.durationDays)}
                    </span>
                    <span className="price-period">/month</span>
                  </div>
                  <p className="plan-billing-note">
                    {formatBillingNote(plan.price, plan.durationDays)}
                  </p>
                  <ul className="plan-features">
                    <li>
                      <span className="check">✓</span>
                      Full gym access
                    </li>
                    <li>
                      <span className="check">✓</span>
                      Valid for {plan.durationDays} days
                    </li>
                    <li>
                      <span className="check">✓</span>
                      Access to group classes
                    </li>
                    <li>
                      <span className="check">✓</span>
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
      <section className="trainers-section" id="trainers">
        <div className="section-inner">
          <h2 className="section-title">Train with the Elite</h2>
          <p className="section-sub">
            Ready to take your workouts to the next level? Our top-tier coaches
            are here to push your limits, refine your form, and unlock your true
            physical potential.
          </p>
          <Carousel
            opts={{ align: 'start', loop: true }}
            className="trainers-carousel"
          >
            <CarouselContent>
              {trainers.map((trainer) => (
                <CarouselItem
                  key={trainer.id}
                  className="md:basis-1/2 lg:basis-1/3"
                >
                  <Card className="trainer-card">
                    <CardHeader className="trainer-card-header">
                      <img
                        src={trainer.img}
                        alt={trainer.name}
                        className="trainer-avatar"
                      />
                    </CardHeader>
                    <CardContent className="trainer-card-body">
                      <h3 className="trainer-name">{trainer.name}</h3>
                      <p className="trainer-speciality">{trainer.speciality}</p>
                      <p className="trainer-bio">{trainer.bio}</p>
                      <div className="trainer-tags">
                        {trainer.tags.map((tag) => (
                          <Badge key={tag} className="trainer-badge">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                    <CardFooter className="trainer-card-footer">
                      <Button className="trainer-btn">Contact Coach</Button>
                    </CardFooter>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="carousel-prev" />
            <CarouselNext className="carousel-next" />
          </Carousel>
        </div>
      </section>
    </>
  );
}
