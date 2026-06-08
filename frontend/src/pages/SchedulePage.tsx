import { useAuth, SignInButton } from '@clerk/clerk-react';
import { useNavigate } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuthProfile } from '@/hooks/useAuthProfile';
import { useSchedule } from '@/hooks/useCalendar';
import {
  useRegisterReservation,
  useUnregisterReservation,
} from '@/hooks/useReservations';
import { cn } from '@/lib/utils';

import ContactIcons from '../components/common/ContactIcons';

import type { ScheduleItem } from '@/hooks/useCalendar';

const ALL_LECTURES = 'All lectures';
type Category = string;

interface Activity {
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

type DialogState =
  | { type: 'none' }
  | { type: 'confirm-register'; activity: Activity }
  | { type: 'confirm-unregister'; activity: Activity }
  | { type: 'members-only'; activity: Activity };

function toActivity(item: ScheduleItem, weekStart: Date): Activity {
  const start = new Date(item.startTime);
  const end = new Date(item.endTime);
  const fmt = (d: Date) =>
    `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;

  const diffMs = start.getTime() - weekStart.getTime();
  const dayIndex = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const lead = item.instructors.find((i) => i.isLead);
  const primary = lead ?? item.instructors[0] ?? null;
  const trainer = primary?.name ?? 'TBD';
  const trainerPhone = primary?.phoneNumber ?? null;
  const trainerEmail = primary?.email ?? null;

  return {
    id: item.id,
    time: `${fmt(start)} - ${fmt(end)}`,
    startTimeISO: item.startTime,
    name: item.lectureName,
    room: item.roomName,
    trainer,
    trainerPhone,
    trainerEmail,
    capacity: item.roomCapacity,
    registered: item.registered,
    category: item.exerciseType,
    dayIndex,
    forMembers: item.forMembers,
    isRegistered: item.isRegistered,
  };
}

const DAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

function getWeekStart(date: Date): Date {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

function formatDate(date: Date): string {
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.`;
}

function formatDateRange(weekStart: Date): string {
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
  const year = weekStart.getUTCFullYear();
  return `${formatDate(weekStart)} ${year} - ${formatDate(weekEnd)} ${weekEnd.getUTCFullYear()}`;
}

function isToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getUTCDate() === now.getUTCDate() &&
    date.getUTCMonth() === now.getUTCMonth() &&
    date.getUTCFullYear() === now.getUTCFullYear()
  );
}

interface ActivityCardProps {
  activity: Activity;
  isSignedIn: boolean;
  busy: boolean;
  onRegisterClick: (activity: Activity) => void;
  onUnregisterClick: (activity: Activity) => void;
}

function ActivityCard({
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

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(max-width: 700px)').matches
      : false,
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 700px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

export default function SchedulePage() {
  const isMobile = useIsMobile();
  const { isSignedIn, isLoaded } = useAuth();
  const navigate = useNavigate();
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [selectedDayIndex, setSelectedDayIndex] = useState(() => {
    const today = new Date();
    const day = today.getUTCDay();
    return day === 0 ? 6 : day - 1;
  });
  const [activeCategories, setActiveCategories] = useState<Set<Category>>(
    new Set([ALL_LECTURES]),
  );
  const [dialog, setDialog] = useState<DialogState>({ type: 'none' });

  const { data: profile } = useAuthProfile({
    enabled: isLoaded && !!isSignedIn,
  });

  const fmtISO = (d: Date) => d.toISOString().split('T')[0];
  const from = fmtISO(weekStart);
  const toDate = new Date(weekStart);
  toDate.setUTCDate(toDate.getUTCDate() + 6);
  const to = fmtISO(toDate);

  // Gate on isLoaded so the schedule fetch waits for Clerk to hydrate.
  // Otherwise apiClient reads window.Clerk?.session before it exists, fires
  // unauthenticated, and the grid renders before isSignedIn flips true —
  // making the Register button still wrap in <SignInButton>.
  const { data: scheduleItems = [], isLoading: loading } = useSchedule(
    from,
    to,
    { enabled: isLoaded },
  );

  const register = useRegisterReservation();
  const unregister = useUnregisterReservation();
  const busyId = register.isPending
    ? register.variables
    : unregister.isPending
      ? unregister.variables
      : null;

  const activities = useMemo<Activity[]>(
    () =>
      scheduleItems.map((item: ScheduleItem) => toActivity(item, weekStart)),
    [scheduleItems, weekStart],
  );

  const closeDialog = () => setDialog({ type: 'none' });

  const confirmRegister = () => {
    if (dialog.type !== 'confirm-register') return;
    const id = dialog.activity.id;
    closeDialog();
    register.mutate(id);
  };

  const confirmUnregister = () => {
    if (dialog.type !== 'confirm-unregister') return;
    const id = dialog.activity.id;
    closeDialog();
    unregister.mutate(id);
  };

  const handleBuyMembership = () => {
    closeDialog();
    void navigate({ to: '/', hash: 'pricing' });
  };

  const categories = useMemo(() => {
    const types = new Set(activities.map((a) => a.category));
    return [ALL_LECTURES, ...Array.from(types).sort()];
  }, [activities]);

  const toggleCategory = (cat: Category) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (cat === ALL_LECTURES) {
        return new Set([ALL_LECTURES]);
      }
      next.delete(ALL_LECTURES);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next.size === 0 ? new Set([ALL_LECTURES]) : next;
    });
  };

  const filteredActivities = useMemo(() => {
    if (activeCategories.has(ALL_LECTURES)) return activities;
    return activities.filter((a) => activeCategories.has(a.category));
  }, [activeCategories, activities]);

  const weekDays = useMemo(() => {
    return DAY_NAMES.map((name, i) => {
      const date = new Date(weekStart);
      date.setUTCDate(date.getUTCDate() + i);
      return { name, date, dayIndex: i };
    });
  }, [weekStart]);

  const goPrev = () => {
    if (isMobile) {
      if (selectedDayIndex === 0) {
        setWeekStart((prev) => {
          const d = new Date(prev);
          d.setUTCDate(d.getUTCDate() - 7);
          return d;
        });
        setSelectedDayIndex(6);
      } else {
        setSelectedDayIndex((i) => i - 1);
      }
    } else {
      setWeekStart((prev) => {
        const d = new Date(prev);
        d.setUTCDate(d.getUTCDate() - 7);
        return d;
      });
    }
  };

  const goNext = () => {
    if (isMobile) {
      if (selectedDayIndex === 6) {
        setWeekStart((prev) => {
          const d = new Date(prev);
          d.setUTCDate(d.getUTCDate() + 7);
          return d;
        });
        setSelectedDayIndex(0);
      } else {
        setSelectedDayIndex((i) => i + 1);
      }
    } else {
      setWeekStart((prev) => {
        const d = new Date(prev);
        d.setUTCDate(d.getUTCDate() + 7);
        return d;
      });
    }
  };

  const hasActiveMembership = profile?.hasActiveMembership ?? false;

  return (
    <div
      data-testid="cal-root"
      className="bg-background text-foreground min-h-[calc(100svh-var(--nav-height))] pt-[var(--nav-height)]"
    >
      <div className="mx-auto flex w-full max-w-[1400px] flex-col items-center gap-6 px-4 pt-6 pb-10 sm:gap-10 sm:px-6 sm:pt-10 sm:pb-[60px]">
        <div className="flex flex-wrap justify-center gap-2.5">
          {categories.map((cat) => (
            <Button
              key={cat}
              data-testid="cal-cat-btn"
              data-active={activeCategories.has(cat) ? 'true' : 'false'}
              variant={activeCategories.has(cat) ? 'default' : 'outline'}
              size="sm"
              className={cn(
                'text-xs tracking-[0.5px] uppercase',
                !activeCategories.has(cat) &&
                  'border-border bg-card text-muted-foreground hover:text-foreground',
              )}
              onClick={() => toggleCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-6 sm:gap-12">
          <Button
            data-testid="cal-nav-arrow"
            variant="ghost"
            size="icon"
            onClick={goPrev}
            className="text-foreground hover:bg-card hover:text-primary"
          >
            <ChevronLeft />
          </Button>
          <span
            data-testid="cal-date-range"
            className="text-foreground text-lg tracking-[0.5px] whitespace-nowrap sm:text-[22px]"
          >
            {isMobile
              ? `${weekDays[selectedDayIndex].name} ${formatDate(weekDays[selectedDayIndex].date)} ${weekDays[selectedDayIndex].date.getFullYear()}`
              : formatDateRange(weekStart)}
          </span>
          <Button
            data-testid="cal-nav-arrow"
            variant="ghost"
            size="icon"
            onClick={goNext}
            className="text-foreground hover:bg-card hover:text-primary"
          >
            <ChevronRight />
          </Button>
        </div>

        {loading && (
          <p className="text-muted-foreground">Loading schedule...</p>
        )}

        <div
          data-testid="cal-week-grid"
          className="grid w-full grid-cols-1 gap-2 sm:grid-cols-4 lg:grid-cols-7"
        >
          {(isMobile
            ? weekDays.filter((d) => d.dayIndex === selectedDayIndex)
            : weekDays
          ).map((day) => {
            const dayActivities = filteredActivities.filter(
              (a) => a.dayIndex === day.dayIndex,
            );
            const today = isToday(day.date);

            return (
              <div
                key={day.dayIndex}
                className={cn(
                  'flex min-w-0 flex-col gap-3 rounded-[var(--radius)] px-1 py-2.5',
                  today &&
                    'sm:border-t-primary sm:border-b-primary sm:bg-card sm:border-y-[3px]',
                )}
              >
                <div className="hidden flex-col items-center gap-2 pb-2 sm:flex">
                  <span className="text-foreground text-[18px] font-normal">
                    {day.name}
                  </span>
                  <span className="text-foreground text-[18px] font-normal">
                    {formatDate(day.date)}
                  </span>
                </div>
                <div className="flex flex-col gap-3">
                  {dayActivities.map((activity) => (
                    <ActivityCard
                      key={activity.id}
                      activity={activity}
                      isSignedIn={!!isSignedIn}
                      busy={busyId === activity.id}
                      onRegisterClick={(a) =>
                        setDialog({
                          type:
                            a.forMembers && !hasActiveMembership
                              ? 'members-only'
                              : 'confirm-register',
                          activity: a,
                        })
                      }
                      onUnregisterClick={(a) =>
                        setDialog({ type: 'confirm-unregister', activity: a })
                      }
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Dialog
        open={dialog.type !== 'none'}
        onOpenChange={(open) => !open && closeDialog()}
      >
        <DialogContent className="border-border bg-card text-foreground">
          {dialog.type === 'confirm-register' && (
            <>
              <DialogHeader>
                <DialogTitle>Register for lecture</DialogTitle>
                <DialogDescription>
                  Do you want to register for{' '}
                  <strong>{dialog.activity.name}</strong> on{' '}
                  {dialog.activity.time}?
                </DialogDescription>
              </DialogHeader>
              {dialog.activity.trainer !== 'TBD' && (
                <div className="flex items-center justify-between gap-3 py-2">
                  <span className="text-muted-foreground text-sm">
                    <span className="font-semibold">Trainer:</span>{' '}
                    {dialog.activity.trainer}
                  </span>
                  <ContactIcons
                    phone={dialog.activity.trainerPhone}
                    email={dialog.activity.trainerEmail}
                    size="sm"
                  />
                </div>
              )}
              <DialogFooter className="border-border border-t bg-transparent">
                <Button
                  className="bg-primary text-primary-foreground hover:bg-primary/90 text-[12px] font-bold uppercase"
                  onClick={confirmRegister}
                >
                  Register
                </Button>
              </DialogFooter>
            </>
          )}

          {dialog.type === 'confirm-unregister' && (
            <>
              <DialogHeader>
                <DialogTitle>Cancel reservation</DialogTitle>
                <DialogDescription>
                  Do you want to cancel your reservation for{' '}
                  <strong>{dialog.activity.name}</strong> on{' '}
                  {dialog.activity.time}?
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="border-border border-t bg-transparent">
                <Button
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold"
                  onClick={confirmUnregister}
                >
                  Unregister
                </Button>
              </DialogFooter>
            </>
          )}

          {dialog.type === 'members-only' && (
            <>
              <DialogHeader>
                <DialogTitle>Members-only lecture</DialogTitle>
                <DialogDescription>
                  <strong>{dialog.activity.name}</strong> is available only to
                  members with an active subscription. Would you like to become
                  a member?
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="border-border border-t bg-transparent">
                <Button
                  className="bg-primary text-primary-foreground hover:bg-primary/90 text-[12px] font-bold uppercase"
                  onClick={handleBuyMembership}
                >
                  Buy membership
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
