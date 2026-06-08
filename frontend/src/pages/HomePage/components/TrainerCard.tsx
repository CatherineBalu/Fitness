import ContactIcons from '@/components/common/ContactIcons';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { getInitials } from '@/lib/formatters';


import type { Instructor } from '@/hooks/useInstructors';

function formatSpeciality(specializations: string[]) {
  if (specializations.length === 0) return 'Instructor';
  return specializations.slice(0, 2).join(' & ');
}

function formatBio(specializations: string[]) {
  if (specializations.length === 0) {
    return 'Certified instructor ready to help you reach your fitness goals.';
  }
  return `Certified instructor specializing in ${specializations.join(', ')}. Ready to push your limits, refine your form, and unlock your true potential.`;
}

export default function TrainerCard({ instructor }: { instructor: Instructor }) {
  const fullName = `${instructor.firstName} ${instructor.lastName}`;
  return (
    <Card
      data-testid="trainer-card"
      className="border-border bg-background text-foreground hover:border-primary flex h-full flex-col rounded-2xl border transition-colors"
    >
      <CardHeader className="flex justify-center pt-7">
        <div
          aria-label={fullName}
          className="border-primary bg-secondary text-foreground flex h-24 w-24 items-center justify-center rounded-full border-[3px] text-2xl font-bold"
        >
          {getInitials(instructor.firstName, instructor.lastName)}
        </div>
      </CardHeader>
      <CardContent className="flex-1 px-6 pt-4 pb-2">
        <h3
          data-testid="trainer-name"
          className="text-foreground mb-1 text-center text-[20px] font-bold"
        >
          {fullName}
        </h3>
        <p
          data-testid="trainer-speciality"
          className="text-primary text-xs-plus mb-3.5 text-center font-semibold tracking-[0.5px] uppercase"
        >
          {formatSpeciality(instructor.specializations)}
        </p>
        <p className="text-muted-foreground mb-4 text-center text-[14px] leading-[1.65]">
          {formatBio(instructor.specializations)}
        </p>
        <div className="flex flex-wrap justify-center gap-1.5">
          {instructor.specializations.map((tag) => (
            <Badge
              key={tag}
              data-testid="trainer-badge"
              className="bg-secondary text-muted-foreground border-none text-[11px] font-semibold"
            >
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
      <CardFooter className="border-border bg-background flex justify-center border-t px-6 pt-4 pb-6">
        <ContactIcons phone={instructor.phoneNumber} email={instructor.email} />
      </CardFooter>
    </Card>
  );
}
