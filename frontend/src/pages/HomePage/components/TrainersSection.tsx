import EmptyState from '@/components/common/EmptyState';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Skeleton } from '@/components/ui/skeleton';


import TrainerCard from './TrainerCard';

import type { Instructor } from '@/hooks/useInstructors';

interface TrainersSectionProps {
  instructors: Instructor[];
  instructorsLoading: boolean;
  instructorsError: boolean;
}

export default function TrainersSection({
  instructors,
  instructorsLoading,
  instructorsError,
}: TrainersSectionProps) {
  return (
    <section
      data-testid="trainers-section"
      className="border-border bg-card border-t px-8 py-20"
      id="trainers"
    >
      <div className="mx-auto max-w-[1200px]">
        <h2 className="text-section text-foreground mb-4 text-center font-extrabold">
          Train with the Elite
        </h2>
        <p className="text-muted-foreground mb-14 text-center text-[15px]">
          Ready to take your workouts to the next level? Our top-tier coaches
          are here to push your limits, refine your form, and unlock your true
          physical potential.
        </p>
        <div data-testid="trainers-carousel" className="relative px-12">
          {instructorsLoading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-[420px] rounded-2xl" />
              ))}
            </div>
          ) : instructorsError ? (
            <Alert variant="destructive">
              <AlertTitle>Couldn&apos;t load instructors</AlertTitle>
              <AlertDescription>Please try again later.</AlertDescription>
            </Alert>
          ) : instructors.length === 0 ? (
            <EmptyState message="No instructors are available yet. Check back soon!" />
          ) : (
            <Carousel opts={{ align: 'start', loop: true }}>
              <CarouselContent>
                {instructors.map((instructor) => (
                  <CarouselItem
                    key={instructor.id}
                    className="md:basis-1/2 lg:basis-1/3"
                  >
                    <TrainerCard instructor={instructor} />
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious
                data-testid="carousel-prev"
                className="border-border bg-card hover:border-primary hover:bg-secondary text-foreground border"
              />
              <CarouselNext
                data-testid="carousel-next"
                className="border-border bg-card hover:border-primary hover:bg-secondary text-foreground border"
              />
            </Carousel>
          )}
        </div>
      </div>
    </section>
  );
}
