import { Calendar, Users, Star, TrendingUp, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from '@tanstack/react-router';
import './AdminDashboardPage.css';

interface UpcomingClass {
  id: number;
  name: string;
  day: string;
  time: string;
  room: string;
  category: string;
  registered: number;
  capacity: number;
}

interface Stat {
  icon: React.ReactNode;
  value: string;
  label: string;
  colorClass: string;
}

// Mock data — replace with API call after DB merge
const UPCOMING: UpcomingClass[] = [
  {
    id: 1,
    name: 'Vinyasa Yoga',
    day: 'Monday',
    time: '09:00',
    room: 'Room A',
    category: 'Beginners',
    registered: 10,
    capacity: 15,
  },
  {
    id: 2,
    name: 'Power Training',
    day: 'Tuesday',
    time: '18:00',
    room: 'Room B',
    category: 'Advanced',
    registered: 14,
    capacity: 20,
  },
  {
    id: 3,
    name: 'HIIT Cardio',
    day: 'Wednesday',
    time: '17:30',
    room: 'Room C',
    category: 'Intermediate',
    registered: 10,
    capacity: 15,
  },
];

const STATS: Stat[] = [
  {
    icon: <Calendar size={22} />,
    value: '5',
    label: 'Lectures this week',
    colorClass: 'stat-icon--blue',
  },
  {
    icon: <Users size={22} />,
    value: '47',
    label: 'Logged in participations',
    colorClass: 'stat-icon--red',
  },
  {
    icon: <Star size={22} />,
    value: '4.5',
    label: 'Average rating',
    colorClass: 'stat-icon--yellow',
  },
  {
    icon: <TrendingUp size={22} />,
    value: '90 %',
    label: 'Attendance this month',
    colorClass: 'stat-icon--green',
  },
];

function UpcomingClassRow({ item }: { item: UpcomingClass }) {
  return (
    <div className="dash-class-row">
      <div className="dash-class-info">
        <span className="dash-class-name">{item.name}</span>
        <span className="dash-class-meta">
          {item.day} · {item.time} · {item.room} · {item.category}
        </span>
      </div>
      <span className="dash-class-capacity">
        {item.registered}/{item.capacity}
      </span>
      <Link to="/admin/calendar">
        <Button size="sm" variant="outline" className="dash-class-manage-btn">
          Manage
        </Button>
      </Link>
    </div>
  );
}

function StatCard({ stat }: { stat: Stat }) {
  return (
    <Card className="dash-stat-card">
      <CardContent className="dash-stat-content">
        <div className={`dash-stat-icon ${stat.colorClass}`}>{stat.icon}</div>
        <span className="dash-stat-value">{stat.value}</span>
        <span className="dash-stat-label">{stat.label}</span>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboardPage() {
  return (
    <div className="admin-dash-page">
      {/* Hero */}
      <div className="admin-dash-hero">
        <div className="admin-dash-hero-inner">
          <p className="admin-dash-welcome-label">WELCOME BACK</p>
          <h1 className="admin-dash-name">ADMIN</h1>
          <p className="admin-dash-subtitle">
            This week you have {UPCOMING.length} lectures.
          </p>
          <div className="admin-dash-hero-actions">
            <Link to="/admin/calendar">
              <Button className="dash-hero-btn dash-hero-btn--primary">
                Manage classes
              </Button>
            </Link>
            <Link to="/schedule">
              <Button
                variant="outline"
                className="dash-hero-btn dash-hero-btn--outline"
              >
                Show schedule
                <ArrowRight size={15} />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="admin-dash-inner">
        {/* Upcoming classes */}
        <section className="admin-dash-section">
          <div className="admin-dash-section-header">
            <p className="admin-dash-section-label">Upcoming classes</p>
            <h2 className="admin-dash-section-title">This week</h2>
          </div>
          <div className="dash-classes-list">
            {UPCOMING.map((item) => (
              <UpcomingClassRow key={item.id} item={item} />
            ))}
          </div>
        </section>

        <div className="admin-dash-divider" />

        {/* Quick overview */}
        <section className="admin-dash-section">
          <h2 className="admin-dash-section-title">Quick overview</h2>
          <div className="dash-stats-grid">
            {STATS.map((stat) => (
              <StatCard key={stat.label} stat={stat} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
