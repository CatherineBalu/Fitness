import { SignInButton } from '@clerk/clerk-react';
import { Lock } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export interface Activity {
  id: string;
  time: string;
  startTimeISO: string;
  name: string;
  room: string;
  trainer: string;
  trainerPhone: string | null;
  trainerEmail: string | null;
  capacity: number;
  registered: number;
  category: string;
  dayIndex: number;
  forMembers: boolean;
  isRegistered: boolean;
}

interface ActivityCardProps {
  activity: Activity;
  isSignedIn: boolean;
  busy: boolean;
  onRegisterClick: (activity: Activity) => void;
  onUnregisterClick: (activity: Activity) => void;
}

export default function ActivityCard({
  activity,
  isSignedIn,
  busy,
  onRegisterClick,
  onUnregisterClick,
}: ActivityCardProps) {
  const isFull = activity.registered >= activity.capacity;
  const isPast = new Date(activity.startTimeISO) < new Date();

  const renderButton = () => {
    if (isPast) return null;

    if (activity.isRegistered) {
      return (
        <Button
          data-testid="cal-unregister-btn"
          size="sm"
          variant="outline"
          className="border-border text-muted-foreground hover:border-foreground hover:text-foreground mt-1 w-full bg-transparent text-[12px] font-semibold uppercase disabled:opacity-50"
          disabled={busy}
          onClick={() => onUnregisterClick(activity)}
        >
          Unregister
        </Button>
      );
    }

    if (!isSignedIn) {
      return (
        <SignInButton mode="modal">
          <Button
            data-testid="cal-register-btn"
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-primary/90 mt-1 w-full text-[12px] font-bold uppercase"
          >
            Register
          </Button>
        </SignInButton>
      );
    }

    if (isFull) {
      return (
        <Button
          size="sm"
          className="bg-primary text-primary-foreground disabled:bg-card disabled:text-muted-foreground mt-1 w-full text-[12px] font-bold uppercase disabled:opacity-70"
          disabled
        >
          Full
        </Button>
      );
    }

    return (
      <Button
        data-testid="cal-register-btn"
        size="sm"
        className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-card disabled:text-muted-foreground mt-1 w-full text-[12px] font-bold uppercase disabled:opacity-70"
        disabled={busy}
        onClick={() => onRegisterClick(activity)}
      >
        Register
      </Button>
    );
  };

  return (
    <Card className="border-border bg-secondary shadow-none ring-0">
      <CardContent className="flex flex-col gap-1.5 p-2.5">
        <div className="flex items-center justify-between gap-1">
          <span className="text-muted-foreground text-xs">{activity.time}</span>
          <div className="flex flex-wrap items-center justify-end gap-1">
            {activity.forMembers && (
              <Badge
                variant="outline"
                className="border-primary dark:bg-card text-primary inline-flex h-[18px] items-center gap-[3px] bg-white px-1.5 text-[10px] font-semibold"
              >
                <Lock size={10} /> Members
              </Badge>
            )}
            <Badge
              variant="outline"
              className="border-border dark:bg-card text-foreground/80 h-[18px] bg-white px-1.5 text-[10px] font-semibold"
            >
              {activity.category}
            </Badge>
          </div>
        </div>
        <h4
          data-testid="cal-activity-name"
          className="text-foreground m-0 text-[15px] leading-[1.2] font-semibold"
        >
          {activity.name}
        </h4>
        <div className="text-muted-foreground flex items-center justify-between gap-1 text-[11px]">
          <span>
            {activity.room} | Trainer: {activity.trainer}
          </span>
          <span className="whitespace-nowrap">
            {activity.registered}/{activity.capacity}
          </span>
        </div>
        {renderButton()}
      </CardContent>
    </Card>
  );
}
