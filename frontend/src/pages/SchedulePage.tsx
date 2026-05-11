import { useAuth, SignInButton } from '@clerk/clerk-react';
import { useNavigate } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

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
import { useApi } from '@/lib/api';
import './SchedulePage.css';

const ALL_LECTURES = 'All lectures';
type Category = string;

interface ScheduleItem {
  id: string;
  startTime: string;
  endTime: string;
  lectureName: string;
  description: string;
  roomName: string;
  roomCapacity: number;
  exerciseType: string;
  forMembers: boolean;
  instructors: { name: string; isLead: boolean }[];
  registered: number;
  isRegistered: boolean;
}

interface Activity {
  id: string;
  time: string;
  startTimeISO: string;
  name: string;
  room: string;
  trainer: string;
  capacity: number;
  registered: number;
  category: string;
  dayIndex: number;
  forMembers: boolean;
  isRegistered: boolean;
}

interface Profile {
  hasActiveMembership: boolean;
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
    `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;

  const diffMs = start.getTime() - weekStart.getTime();
  const dayIndex = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const lead = item.instructors.find((i) => i.isLead);
  const trainer = lead ? lead.name : (item.instructors[0]?.name ?? 'TBD');

  return {
    id: item.id,
    time: `${fmt(start)} - ${fmt(end)}`,
    startTimeISO: item.startTime,
    name: item.lectureName,
    room: item.roomName,
    trainer,
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
          size="sm"
          variant="outline"
          className="cal-unregister-btn"
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
          <Button size="sm" className="cal-register-btn">
            Register
          </Button>
        </SignInButton>
      );
    }

    if (isFull) {
      return (
        <Button size="sm" className="cal-register-btn" disabled>
          Full
        </Button>
      );
    }

    return (
      <Button
        size="sm"
        className="cal-register-btn"
        disabled={busy}
        onClick={() => onRegisterClick(activity)}
      >
        Register
      </Button>
    );
  };

  return (
    <Card className="cal-activity-card">
      <CardContent className="cal-activity-content">
        <div className="cal-activity-top">
          <span className="cal-activity-time">{activity.time}</span>
          <div className="cal-activity-top-right">
            {activity.forMembers && (
              <Badge variant="outline" className="cal-badge-members-only">
                <Lock size={10} /> Members
              </Badge>
            )}
            <Badge variant="outline" className="cal-badge-members">
              {activity.category}
            </Badge>
          </div>
        </div>
        <h4 className="cal-activity-name">{activity.name}</h4>
        <div className="cal-activity-details">
          <span>
            {activity.room} | Trainer: {activity.trainer}
          </span>
          <span className="cal-activity-capacity">
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
  const { apiRequest } = useApi();
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
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [dialog, setDialog] = useState<DialogState>({ type: 'none' });

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setProfile(null);
      return;
    }
    apiRequest<Profile>('/auth/profile')
      .then(setProfile)
      .catch((err) => console.error('Failed to load profile:', err));
  }, [isLoaded, isSignedIn, apiRequest]);

  const loadSchedule = useCallback(async () => {
    const fmtISO = (d: Date) => d.toISOString().split('T')[0];
    const from = fmtISO(weekStart);
    const toDate = new Date(weekStart);
    toDate.setUTCDate(toDate.getUTCDate() + 6);
    const to = fmtISO(toDate);

    try {
      const data = await apiRequest<ScheduleItem[]>(
        `/schedule?from=${from}&to=${to}`,
      );
      setActivities(data.map((item) => toActivity(item, weekStart)));
    } catch (err) {
      console.error('Failed to fetch schedule:', err);
    } finally {
      setLoading(false);
    }
  }, [weekStart, apiRequest]);

  useEffect(() => {
    setLoading(true);
    loadSchedule();
  }, [loadSchedule]);

  useEffect(() => {
    const handler = () => loadSchedule();
    window.addEventListener('schedule:invalidated', handler);
    return () => window.removeEventListener('schedule:invalidated', handler);
  }, [loadSchedule]);

  const closeDialog = () => setDialog({ type: 'none' });

  const confirmRegister = async () => {
    if (dialog.type !== 'confirm-register') return;
    const id = dialog.activity.id;
    closeDialog();
    setBusyId(id);
    try {
      await apiRequest(`/schedule/${id}/reservations`, { method: 'POST' });
      toast.success('Registered successfully');
      await loadSchedule();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to register');
    } finally {
      setBusyId(null);
    }
  };

  const confirmUnregister = async () => {
    if (dialog.type !== 'confirm-unregister') return;
    const id = dialog.activity.id;
    closeDialog();
    setBusyId(id);
    try {
      await apiRequest(`/schedule/${id}/reservations`, { method: 'DELETE' });
      toast.success('Unregistered successfully');
      await loadSchedule();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to unregister');
    } finally {
      setBusyId(null);
    }
  };

  const handleBuyMembership = () => {
    closeDialog();
    navigate({ to: '/', hash: 'pricing' });
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
    <div className="schedule-page-content">
      <div className="cal-root">
        <div className="cal-categories">
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={activeCategories.has(cat) ? 'default' : 'outline'}
              size="sm"
              className={
                activeCategories.has(cat)
                  ? 'cal-cat-btn cal-cat-btn--active'
                  : 'cal-cat-btn'
              }
              onClick={() => toggleCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>

        <div className="cal-week-nav">
          <Button
            variant="ghost"
            size="icon"
            onClick={goPrev}
            className="cal-nav-arrow"
          >
            <ChevronLeft />
          </Button>
          <span className="cal-date-range">
            {isMobile
              ? `${weekDays[selectedDayIndex].name} ${formatDate(weekDays[selectedDayIndex].date)} ${weekDays[selectedDayIndex].date.getFullYear()}`
              : formatDateRange(weekStart)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={goNext}
            className="cal-nav-arrow"
          >
            <ChevronRight />
          </Button>
        </div>

        {loading && (
          <p style={{ color: 'var(--c-muted)' }}>Loading schedule...</p>
        )}
        <div className="cal-week-grid">
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
                className={`cal-day-column ${today ? 'cal-day-column--today' : ''}`}
              >
                <div className="cal-day-header">
                  <span className="cal-day-name">{day.name}</span>
                  <span className="cal-day-date">{formatDate(day.date)}</span>
                </div>
                <div className="cal-day-activities">
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
        <DialogContent className="cal-dialog">
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
              <DialogFooter className="cal-dialog-footer">
                <Button className="cal-register-btn" onClick={confirmRegister}>
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
              <DialogFooter className="cal-dialog-footer">
                <Button
                  className="cal-unregister-confirm-btn"
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
              <DialogFooter className="cal-dialog-footer">
                <Button
                  className="cal-register-btn"
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
