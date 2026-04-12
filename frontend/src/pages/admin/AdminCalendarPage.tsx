import { useState } from 'react';
import { Clock, MapPin, Users, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import './AdminCalendarPage.css';

type Filter = 'all' | 'today' | 'this-week' | 'upcoming';

interface Lecture {
  id: number;
  name: string;
  time: string;
  room: string;
  capacity: number;
  registered: number;
  dayOffset: number; // 0 = today, positive = days from now
}

const LECTURES: Lecture[] = [
  {
    id: 1,
    name: 'Vinyasa Yoga',
    time: '09:00 - 10:00',
    room: 'Room A',
    capacity: 15,
    registered: 3,
    dayOffset: 0,
  },
  {
    id: 2,
    name: 'Power Training',
    time: '10:00 - 11:00',
    room: 'Room B',
    capacity: 20,
    registered: 14,
    dayOffset: 0,
  },
  {
    id: 3,
    name: 'HIIT Cardio',
    time: '11:00 - 12:00',
    room: 'Room C',
    capacity: 25,
    registered: 25,
    dayOffset: 0,
  },
  {
    id: 4,
    name: 'Jumping Fitness',
    time: '13:00 - 14:00',
    room: 'Room D',
    capacity: 12,
    registered: 10,
    dayOffset: 0,
  },
  {
    id: 5,
    name: 'Morning Yoga',
    time: '08:00 - 09:00',
    room: 'Room A',
    capacity: 15,
    registered: 7,
    dayOffset: 1,
  },
  {
    id: 6,
    name: 'Spin Class',
    time: '17:00 - 18:00',
    room: 'Room C',
    capacity: 20,
    registered: 18,
    dayOffset: 1,
  },
  {
    id: 7,
    name: 'Power Lifting',
    time: '16:00 - 17:00',
    room: 'Room B',
    capacity: 10,
    registered: 4,
    dayOffset: 2,
  },
  {
    id: 8,
    name: 'Cardio Blast',
    time: '18:00 - 19:00',
    room: 'Room C',
    capacity: 25,
    registered: 20,
    dayOffset: 3,
  },
  {
    id: 9,
    name: 'Evening Yoga',
    time: '19:00 - 20:00',
    room: 'Room A',
    capacity: 15,
    registered: 11,
    dayOffset: 4,
  },
  {
    id: 10,
    name: 'Sunday Yoga',
    time: '09:00 - 10:00',
    room: 'Room A',
    capacity: 15,
    registered: 4,
    dayOffset: 6,
  },
];

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
  const filtered = filterLectures(LECTURES, filter);

  return (
    <div className="admin-cal-page">
      <div className="admin-cal-inner">
        <div className="admin-cal-header">
          <h1 className="admin-cal-title">My lectures</h1>
          <Button className="admin-cal-add-btn">
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

        <div className="admin-cal-grid">
          {filtered.map((lecture) => (
            <LectureCard key={lecture.id} lecture={lecture} />
          ))}
        </div>
      </div>
    </div>
  );
}
