import { useState, useEffect } from 'react';
import { Clock, MapPin, Users, Plus, CalendarDays } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import AddScheduleDialog from './AddScheduleDialog';
import './AdminCalendarPage.css';

const API_URL = 'http://localhost:3000';

type Filter = 'all' | 'today' | 'this-week' | 'upcoming';

interface Lecture {
  id: string;
  name: string;
  date: string; // e.g. "Mon 13.04."
  time: string;
  room: string;
  capacity: number;
  registered: number;
  dayOffset: number; // 0 = today, positive = days from now
}

interface ScheduleItem {
  id: string;
  startTime: string;
  endTime: string;
  lectureName: string;
  roomName: string;
  roomCapacity: number;
  registered: number;
}

function toUTCDateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function scheduleItemToLecture(item: ScheduleItem, todayStart: Date): Lecture {
  const start = new Date(item.startTime);
  const end = new Date(item.endTime);
  const fmtTime = (d: Date) =>
    `${d.getUTCHours()}:${String(d.getUTCMinutes()).padStart(2, '0')}`;

  const itemDay = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()),
  );
  const dayOffset = Math.round(
    (itemDay.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24),
  );

  const dd = String(start.getUTCDate()).padStart(2, '0');
  const mm = String(start.getUTCMonth() + 1).padStart(2, '0');
  const dayName = DAY_ABBR[start.getUTCDay()];
  const date = `${dayName} ${dd}.${mm}.`;

  return {
    id: item.id,
    name: item.lectureName,
    date,
    time: `${fmtTime(start)} - ${fmtTime(end)}`,
    room: item.roomName,
    capacity: item.roomCapacity,
    registered: item.registered,
    dayOffset,
  };
}

function getStatus(
  registered: number,
  capacity: number,
): 'available' | 'almost-full' | 'unavailable' {
  const ratio = registered / capacity;
  if (ratio >= 1) return 'unavailable';
  if (ratio >= 0.7) return 'almost-full';
  return 'available';
}

function filterLectures(lectures: Lecture[], filter: Filter): Lecture[] {
  if (filter === 'all') return lectures;
  if (filter === 'today') return lectures.filter((l) => l.dayOffset === 0);
  if (filter === 'this-week')
    return lectures.filter((l) => l.dayOffset >= 0 && l.dayOffset <= 6);
  if (filter === 'upcoming') return lectures.filter((l) => l.dayOffset > 0);
  return lectures;
}

function LectureCard({ lecture }: { lecture: Lecture }) {
  const status = getStatus(lecture.registered, lecture.capacity);

  return (
    <Card className="lecture-card">
      <CardContent className="lecture-card-content">
        <div className="lecture-card-top">
          <span className={`status-dot status-dot--${status}`} />
        </div>
        <h3 className="lecture-name">{lecture.name}</h3>
        <div className="lecture-meta">
          <div className="lecture-meta-row">
            <CalendarDays size={13} />
            <span>{lecture.date}</span>
          </div>
          <div className="lecture-meta-row">
            <Clock size={13} />
            <span>{lecture.time}</span>
          </div>
          <div className="lecture-meta-row">
            <MapPin size={13} />
            <span>{lecture.room}</span>
          </div>
          <div className="lecture-meta-row">
            <Users size={13} />
            <span>
              Capacity {lecture.registered}/{lecture.capacity}
            </span>
          </div>
        </div>
        <Button size="sm" variant="outline" className="lecture-view-btn">
          View members
        </Button>
      </CardContent>
    </Card>
  );
}

const FILTERS: { label: string; value: Filter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: 'This week', value: 'this-week' },
  { label: 'Upcoming', value: 'upcoming' },
];

export default function AdminCalendarPage() {
  const [filter, setFilter] = useState<Filter>('all');
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  function fetchLectures() {
    const today = toUTCDateOnly(new Date());
    const toDate = new Date(today);
    toDate.setUTCDate(toDate.getUTCDate() + 29);
    const fmtISO = (d: Date) => d.toISOString().split('T')[0];

    setLoading(true);
    fetch(`${API_URL}/schedule?from=${fmtISO(today)}&to=${fmtISO(toDate)}`)
      .then((res) => res.json())
      .then((data: ScheduleItem[]) => {
        setLectures(data.map((item) => scheduleItemToLecture(item, today)));
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch schedule:', err);
        setLoading(false);
      });
  }

  useEffect(() => {
    fetchLectures();
  }, []);

  const filtered = filterLectures(lectures, filter);

  return (
    <div className="admin-cal-page">
      <div className="admin-cal-inner">
        <div className="admin-cal-header">
          <h1 className="admin-cal-title">My lectures</h1>
          <Button className="admin-cal-add-btn" onClick={() => setDialogOpen(true)}>
            <Plus size={15} />
            Add
          </Button>
        </div>

        <div className="admin-cal-filters">
          {FILTERS.map((f) => (
            <Button
              key={f.value}
              size="sm"
              variant={filter === f.value ? 'default' : 'ghost'}
              className={
                filter === f.value
                  ? 'filter-btn filter-btn--active'
                  : 'filter-btn'
              }
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>

        <div className="admin-cal-legend">
          <span className="legend-item">
            <span className="status-dot status-dot--available" />
            Available
          </span>
          <span className="legend-item">
            <span className="status-dot status-dot--almost-full" />
            Almost full
          </span>
          <span className="legend-item">
            <span className="status-dot status-dot--unavailable" />
            Unavailable
          </span>
        </div>

        {loading && (
          <p style={{ color: 'var(--c-muted)' }}>Loading schedule...</p>
        )}
        <div className="admin-cal-grid">
          {filtered.map((lecture) => (
            <LectureCard key={lecture.id} lecture={lecture} />
          ))}
        </div>
      </div>

      <AddScheduleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={fetchLectures}
      />
    </div>
  );
}
