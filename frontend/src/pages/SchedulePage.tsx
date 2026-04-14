import { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import './SchedulePage.css';

const API_URL = 'http://localhost:3000';

const CATEGORIES = [
  'All lectures',
  'Yoga',
  'Power',
  'Cardio',
  'Jumping fitness',
] as const;

type Category = (typeof CATEGORIES)[number];

interface ScheduleItem {
  id: string;
  startTime: string;
  endTime: string;
  lectureName: string;
  description: string;
  roomName: string;
  roomCapacity: number;
  exerciseType: string;
  instructors: { name: string; isLead: boolean }[];
  registered: number;
}

interface Activity {
  id: string;
  time: string;
  name: string;
  room: string;
  trainer: string;
  capacity: number;
  registered: number;
  category: string;
  dayIndex: number; // 0=Monday ... 6=Sunday
}

function toActivity(item: ScheduleItem, weekStart: Date): Activity {
  const start = new Date(item.startTime);
  const end = new Date(item.endTime);
  const fmt = (d: Date) =>
    `${d.getUTCHours()}:${String(d.getUTCMinutes()).padStart(2, '0')}`;

  // Calculate day index relative to week start (Monday=0)
  const diffMs = start.getTime() - weekStart.getTime();
  const dayIndex = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const lead = item.instructors.find((i) => i.isLead);
  const trainer = lead ? lead.name : (item.instructors[0]?.name ?? 'TBD');

  return {
    id: item.id,
    time: `${fmt(start)} - ${fmt(end)}`,
    name: item.lectureName,
    room: item.roomName,
    trainer,
    capacity: item.roomCapacity,
    registered: item.registered,
    category: item.exerciseType,
    dayIndex,
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
    date.getUTCDate() === now.getDate() &&
    date.getUTCMonth() === now.getMonth() &&
    date.getUTCFullYear() === now.getFullYear()
  );
}

function ActivityCard({ activity }: { activity: Activity }) {
  const isFull = activity.registered >= activity.capacity;

  return (
    <Card className="cal-activity-card">
      <CardContent className="cal-activity-content">
        <div className="cal-activity-top">
          <span className="cal-activity-time">{activity.time}</span>
          <Badge variant="outline" className="cal-badge-members">
            {activity.category}
          </Badge>
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
        <Button size="sm" className="cal-register-btn" disabled={isFull}>
          {isFull ? 'Full' : 'Register'}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function SchedulePage() {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [activeCategories, setActiveCategories] = useState<Set<Category>>(
    new Set(['All lectures']),
  );
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fmtISO = (d: Date) => d.toISOString().split('T')[0];
    const from = fmtISO(weekStart);
    const toDate = new Date(weekStart);
    toDate.setUTCDate(toDate.getUTCDate() + 6);
    const to = fmtISO(toDate);

    fetch(`${API_URL}/schedule?from=${from}&to=${to}`)
      .then((res) => res.json())
      .then((data: ScheduleItem[]) => {
        if (!cancelled) {
          setActivities(data.map((item) => toActivity(item, weekStart)));
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Failed to fetch schedule:', err);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [weekStart]);

  const toggleCategory = (cat: Category) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (cat === 'All lectures') {
        return new Set(['All lectures']);
      }
      next.delete('All lectures');
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next.size === 0 ? new Set(['All lectures']) : next;
    });
  };

  const filteredActivities = useMemo(() => {
    if (activeCategories.has('All lectures')) return activities;
    return activities.filter((a) => activeCategories.has(a.category));
  }, [activeCategories, activities]);

  const weekDays = useMemo(() => {
    return DAY_NAMES.map((name, i) => {
      const date = new Date(weekStart);
      date.setUTCDate(date.getUTCDate() + i);
      return { name, date, dayIndex: i };
    });
  }, [weekStart]);

  const prevWeek = () => {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setUTCDate(d.getUTCDate() - 7);
      return d;
    });
  };

  const nextWeek = () => {
    setWeekStart((prev) => {
      const d = new Date(prev);
      d.setUTCDate(d.getUTCDate() + 7);
      return d;
    });
  };

  return (
    <div className="schedule-page-content">
      <div className="cal-root">
        {/* Category filters */}
        <div className="cal-categories">
          {CATEGORIES.map((cat) => (
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

        {/* Week navigation */}
        <div className="cal-week-nav">
          <Button
            variant="ghost"
            size="icon"
            onClick={prevWeek}
            className="cal-nav-arrow"
          >
            <ChevronLeft />
          </Button>
          <span className="cal-date-range">{formatDateRange(weekStart)}</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={nextWeek}
            className="cal-nav-arrow"
          >
            <ChevronRight />
          </Button>
        </div>

        {/* Weekly grid */}
        {loading && (
          <p style={{ color: 'var(--c-muted)' }}>Loading schedule...</p>
        )}
        <div className="cal-week-grid">
          {weekDays.map((day) => {
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
                    <ActivityCard key={activity.id} activity={activity} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
