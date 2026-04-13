import { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import './SchedulePage.css';

const CATEGORIES = [
  'All lectures',
  'Yoga',
  'Power',
  'Cardio',
  'Jumping fitness',
] as const;

type Category = (typeof CATEGORIES)[number];

interface Activity {
  id: number;
  time: string;
  name: string;
  room: string;
  trainer: string;
  capacity: number;
  registered: number;
  membersOnly: boolean;
  category: Category;
  dayIndex: number; // 0=Monday ... 6=Sunday
}

const SAMPLE_ACTIVITIES: Activity[] = [
  {
    id: 1,
    time: '9:00 - 10:00',
    name: 'Vinyasa Yoga',
    room: 'Room A',
    trainer: 'Sarah',
    capacity: 15,
    registered: 3,
    membersOnly: true,
    category: 'Yoga',
    dayIndex: 0,
  },
  {
    id: 2,
    time: '17:00 - 18:00',
    name: 'Power Training',
    room: 'Room B',
    trainer: 'Mike',
    capacity: 20,
    registered: 12,
    membersOnly: false,
    category: 'Power',
    dayIndex: 0,
  },
  {
    id: 3,
    time: '10:00 - 11:00',
    name: 'HIIT Cardio',
    room: 'Room C',
    trainer: 'Jana',
    capacity: 25,
    registered: 18,
    membersOnly: true,
    category: 'Cardio',
    dayIndex: 1,
  },
  {
    id: 4,
    time: '8:00 - 9:00',
    name: 'Morning Yoga',
    room: 'Room A',
    trainer: 'Sarah',
    capacity: 15,
    registered: 7,
    membersOnly: false,
    category: 'Yoga',
    dayIndex: 1,
  },
  {
    id: 5,
    time: '18:00 - 19:00',
    name: 'Jumping Fitness',
    room: 'Room D',
    trainer: 'Lucia',
    capacity: 12,
    registered: 12,
    membersOnly: true,
    category: 'Jumping fitness',
    dayIndex: 2,
  },
  {
    id: 6,
    time: '11:00 - 12:00',
    name: 'Vinyasa Yoga',
    room: 'Room A',
    trainer: 'Sarah',
    capacity: 15,
    registered: 5,
    membersOnly: false,
    category: 'Yoga',
    dayIndex: 2,
  },
  {
    id: 7,
    time: '16:00 - 17:00',
    name: 'Power Lifting',
    room: 'Room B',
    trainer: 'Mike',
    capacity: 10,
    registered: 8,
    membersOnly: true,
    category: 'Power',
    dayIndex: 2,
  },
  {
    id: 8,
    time: '7:00 - 8:00',
    name: 'Spin Class',
    room: 'Room C',
    trainer: 'Jana',
    capacity: 20,
    registered: 14,
    membersOnly: false,
    category: 'Cardio',
    dayIndex: 3,
  },
  {
    id: 9,
    time: '17:00 - 18:00',
    name: 'Vinyasa Yoga',
    room: 'Room A',
    trainer: 'Sarah',
    capacity: 15,
    registered: 3,
    membersOnly: true,
    category: 'Yoga',
    dayIndex: 3,
  },
  {
    id: 10,
    time: '9:00 - 10:00',
    name: 'Morning Power',
    room: 'Room B',
    trainer: 'Mike',
    capacity: 20,
    registered: 11,
    membersOnly: false,
    category: 'Power',
    dayIndex: 4,
  },
  {
    id: 11,
    time: '18:00 - 19:00',
    name: 'Cardio Blast',
    room: 'Room C',
    trainer: 'Jana',
    capacity: 25,
    registered: 20,
    membersOnly: true,
    category: 'Cardio',
    dayIndex: 4,
  },
  {
    id: 12,
    time: '10:00 - 11:00',
    name: 'Jumping Fitness',
    room: 'Room D',
    trainer: 'Lucia',
    capacity: 12,
    registered: 6,
    membersOnly: false,
    category: 'Jumping fitness',
    dayIndex: 4,
  },
  {
    id: 13,
    time: '10:00 - 11:00',
    name: 'Weekend Yoga',
    room: 'Room A',
    trainer: 'Sarah',
    capacity: 15,
    registered: 9,
    membersOnly: false,
    category: 'Yoga',
    dayIndex: 5,
  },
  {
    id: 14,
    time: '14:00 - 15:00',
    name: 'Power Hour',
    room: 'Room B',
    trainer: 'Mike',
    capacity: 20,
    registered: 15,
    membersOnly: true,
    category: 'Power',
    dayIndex: 5,
  },
  {
    id: 15,
    time: '9:00 - 10:00',
    name: 'Sunday Yoga',
    room: 'Room A',
    trainer: 'Sarah',
    capacity: 15,
    registered: 4,
    membersOnly: false,
    category: 'Yoga',
    dayIndex: 6,
  },
  {
    id: 16,
    time: '11:00 - 12:00',
    name: 'Cardio Mix',
    room: 'Room C',
    trainer: 'Jana',
    capacity: 25,
    registered: 10,
    membersOnly: true,
    category: 'Cardio',
    dayIndex: 6,
  },
  {
    id: 17,
    time: '15:00 - 16:00',
    name: 'Jumping Fitness',
    room: 'Room D',
    trainer: 'Lucia',
    capacity: 12,
    registered: 8,
    membersOnly: false,
    category: 'Jumping fitness',
    dayIndex: 6,
  },
  {
    id: 18,
    time: '17:00 - 18:00',
    name: 'Evening Yoga',
    room: 'Room A',
    trainer: 'Sarah',
    capacity: 15,
    registered: 11,
    membersOnly: true,
    category: 'Yoga',
    dayIndex: 6,
  },
];

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
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.`;
}

function formatDateRange(weekStart: Date): string {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const year = weekStart.getFullYear();
  return `${formatDate(weekStart)} ${year} - ${formatDate(weekEnd)} ${weekEnd.getFullYear()}`;
}

function isToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
}

function ActivityCard({ activity }: { activity: Activity }) {
  const isFull = activity.registered >= activity.capacity;

  return (
    <Card className="cal-activity-card">
      <CardContent className="cal-activity-content">
        <div className="cal-activity-top">
          <span className="cal-activity-time">{activity.time}</span>
          {activity.membersOnly && (
            <Badge variant="outline" className="cal-badge-members">
              Members only
            </Badge>
          )}
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
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [selectedDayIndex, setSelectedDayIndex] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    return day === 0 ? 6 : day - 1; // Monday = 0, Sunday = 6
  });
  const [activeCategories, setActiveCategories] = useState<Set<Category>>(
    new Set(['All lectures']),
  );

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
    if (activeCategories.has('All lectures')) return SAMPLE_ACTIVITIES;
    return SAMPLE_ACTIVITIES.filter((a) => activeCategories.has(a.category));
  }, [activeCategories]);

  const weekDays = useMemo(() => {
    return DAY_NAMES.map((name, i) => {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      return { name, date, dayIndex: i };
    });
  }, [weekStart]);

  const goPrev = () => {
    if (isMobile) {
      if (selectedDayIndex === 0) {
        setWeekStart((prev) => {
          const d = new Date(prev);
          d.setDate(d.getDate() - 7);
          return d;
        });
        setSelectedDayIndex(6);
      } else {
        setSelectedDayIndex((i) => i - 1);
      }
    } else {
      setWeekStart((prev) => {
        const d = new Date(prev);
        d.setDate(d.getDate() - 7);
        return d;
      });
    }
  };

  const goNext = () => {
    if (isMobile) {
      if (selectedDayIndex === 6) {
        setWeekStart((prev) => {
          const d = new Date(prev);
          d.setDate(d.getDate() + 7);
          return d;
        });
        setSelectedDayIndex(0);
      } else {
        setSelectedDayIndex((i) => i + 1);
      }
    } else {
      setWeekStart((prev) => {
        const d = new Date(prev);
        d.setDate(d.getDate() + 7);
        return d;
      });
    }
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

        {/* Week / day navigation */}
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

        {/* Weekly grid */}
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
