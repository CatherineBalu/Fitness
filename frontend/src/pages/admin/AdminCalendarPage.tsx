import { useState, useEffect, useCallback } from 'react';
import { Clock, MapPin, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useApi } from '@/lib/api';
import './AdminCalendarPage.css';

type Filter = 'all' | 'today' | 'this-week' | 'upcoming';

interface Lecture {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  room: string;
  capacity: number;
  registered: number;
}

function formatLectureTime(startIso: string, endIso: string): string {
  const fmt = (d: Date) =>
    `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${fmt(new Date(startIso))} - ${fmt(new Date(endIso))}`;
}

function filterLectures(lectures: Lecture[], filter: Filter): Lecture[] {
  const now = new Date();
  const todayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const weekEnd = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  if (filter === 'all') return lectures;
  if (filter === 'today')
    return lectures.filter((l) => {
      const start = new Date(l.startTime);
      return start >= todayStart && start < todayEnd;
    });
  if (filter === 'this-week')
    return lectures.filter((l) => {
      const start = new Date(l.startTime);
      return start >= todayStart && start < weekEnd;
    });
  if (filter === 'upcoming')
    return lectures.filter((l) => new Date(l.startTime) > now);
  return lectures;
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
            <Clock size={13} />
            <span>{formatLectureTime(lecture.startTime, lecture.endTime)}</span>
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
  const { apiRequest } = useApi();
  const [filter, setFilter] = useState<Filter>('upcoming');
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLectures = useCallback(() => {
    setLoading(true);
    apiRequest<Lecture[]>('/api/staff/me/lectures')
      .then((data) => {
        setLectures(data);
        setError(null);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [apiRequest]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadLectures();
  }, [loadLectures]);

  const filtered = filterLectures(lectures, filter);

  return (
    <div className="admin-cal-page">
      <div className="admin-cal-inner">
        <div className="admin-cal-header">
          <h1 className="admin-cal-title">My lectures</h1>
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
          <p style={{ color: 'var(--c-muted)' }}>Loading lectures…</p>
        )}
        {error && <p style={{ color: 'red' }}>Failed to load: {error}</p>}
        {!loading && !error && filtered.length === 0 && (
          <p style={{ color: 'var(--c-muted)' }}>No lectures found.</p>
        )}

        <div className="admin-cal-grid">
          {filtered.map((lecture) => (
            <LectureCard key={lecture.id} lecture={lecture} />
          ))}
        </div>
      </div>
    </div>
  );
}
