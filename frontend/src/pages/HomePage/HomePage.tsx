import { useAuth } from '@clerk/clerk-react';

import { useAuthProfile } from '@/hooks/useAuthProfile';
import { useEntryPackages } from '@/hooks/useEntryPackages';
import { useInstructors } from '@/hooks/useInstructors';
import { useSubscriptions } from '@/hooks/useSubscriptions';

import PricingSection from './components/PricingSection';
import TrainersSection from './components/TrainersSection';
import heroImg from '../../assets/hero.png';

export default function HomePage() {
  const { isSignedIn, isLoaded } = useAuth();

  const {
    data: plans = [],
    isLoading: plansLoading,
    isError: plansError,
  } = useSubscriptions();

  const { data: entryPackages = [], isLoading: entryPackagesLoading } =
    useEntryPackages();

  const { data: profile } = useAuthProfile({
    enabled: isLoaded && !!isSignedIn,
  });

  const {
    data: instructors = [],
    isLoading: instructorsLoading,
    isError: instructorsError,
  } = useInstructors();

  const hasActiveMembership = isSignedIn
    ? (profile?.hasActiveMembership ?? false)
    : false;

  return (
    <>
      {/* ── Hero ── */}
      <section
        data-testid="hero-section"
        className="relative flex h-svh items-center justify-center overflow-hidden text-center"
      >
        <img
          src={heroImg}
          alt="Gym"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 to-black/75" />
        <div className="relative max-w-[760px] px-6">
          <p className="text-primary text-xs-plus mb-4 font-semibold tracking-[3px] uppercase">
            Welcome to our gym
          </p>
          <h1 className="text-hero mb-5 leading-[1.1] font-extrabold text-white">
            Pursue Outdoor,&nbsp;
            <span className="text-primary">Fitness Performance</span>
          </h1>
          <p className="mx-auto mb-8 max-w-[520px] text-center text-[17px] leading-[1.6] text-white/70">
            Join our world-class fitness facility and transform your body.
            Expert trainers, modern equipment, and flexible membership plans.
          </p>
          <button
            data-testid="hero-cta"
            className="bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer rounded-[14px] border-none px-9 py-4 text-[17px] font-bold transition-colors"
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
      <section
        data-testid="stats-section"
        className="border-border bg-card border-t border-b px-8 py-10"
        id="about"
      >
        <div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-6 text-center sm:grid-cols-4">
          {[
            { value: '5 000+', label: 'Active Members' },
            { value: '50+', label: 'Weekly Classes' },
            { value: '30+', label: 'Expert Trainers' },
            { value: '10+', label: 'Years of Experience' },
          ].map((s) => (
            <div className="flex flex-col gap-1.5" key={s.label}>
              <span className="text-primary text-[38px] leading-none font-extrabold">
                {s.value}
              </span>
              <span className="text-muted-foreground tracking-px text-[14px] uppercase">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      <PricingSection
        plans={plans}
        entryPackages={entryPackages}
        plansLoading={plansLoading}
        entryPackagesLoading={entryPackagesLoading}
        plansError={plansError}
        hasActiveMembership={hasActiveMembership}
        authReady={isLoaded}
        isSignedIn={!!isSignedIn}
      />

      <TrainersSection
        instructors={instructors}
        instructorsLoading={instructorsLoading}
        instructorsError={instructorsError}
      />
    </>
  );
}
