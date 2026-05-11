import { useUser } from '@clerk/clerk-react';
import { Link } from '@tanstack/react-router';
import {
  Calendar,
  Users,
  TrendingUp,
  CalendarCheck,
  ArrowRight,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { StatCard } from '@/components/stats/StatCard';
import { Button } from '@/components/ui/button';
import { useApi } from '@/lib/api';
import './AdminDashboardPage.css';

interface Lecture {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  room: string;
  capacity: number;
  registered: number;
}

interface AdminOverview {
  activeMemberships: number;
  monthRevenue: number;
  monthReservations: number;
  avgOccupancyPct: number;
}

interface StaffStats {
  available: boolean;
  employeeType: string;
  monthLectureCount?: number;
  monthAttendees?: number;
  avgFillRatePct?: number;
}

function formatLectureTime(startIso: string, endIso: string): string {
  const fmt = (d: Date) =>
    `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${fmt(new Date(startIso))} - ${fmt(new Date(endIso))}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function UpcomingClassRow({ item }: { item: Lecture }) {
  return (
    <div className="dash-class-row">
      <div className="dash-class-info">
        <span className="dash-class-name">{item.name}</span>
        <span className="dash-class-meta">
          {formatDate(item.startTime)} ·{' '}
          {formatLectureTime(item.startTime, item.endTime)} · {item.room}
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

export default function AdminDashboardPage() {
  const { apiRequest } = useApi();
  const { user } = useUser();
  const role = (user?.publicMetadata as { role?: string })?.role ?? null;
  const isAdmin = role === 'admin';

  const [upcoming, setUpcoming] = useState<Lecture[]>([]);
  const [adminStats, setAdminStats] = useState<AdminOverview | null>(null);
  const [staffStats, setStaffStats] = useState<StaffStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const now = new Date();

    const requests: Promise<unknown>[] = [
      apiRequest<Lecture[]>('/api/staff/me/lectures'),
      isAdmin
        ? apiRequest<AdminOverview>('/api/stats/admin/overview')
        : apiRequest<StaffStats>('/api/stats/staff/me'),
    ];

    Promise.all(requests)
      .then(([lectures, stats]) => {
        if (cancelled) return;
        const upcomingLectures = (lectures as Lecture[])
          .filter((l) => new Date(l.startTime) > now)
          .slice(0, 3);
        setUpcoming(upcomingLectures);
        if (isAdmin) {
          setAdminStats(stats as AdminOverview);
        } else {
          setStaffStats(stats as StaffStats);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [apiRequest, isAdmin]);

  const statCards = isAdmin
    ? [
        {
          icon: <Users size={22} />,
          value: loading ? '—' : String(adminStats?.activeMemberships ?? 0),
          label: 'Active memberships',
        },
        {
          icon: <TrendingUp size={22} />,
          value: loading
            ? '—'
            : `€${Math.round(adminStats?.monthRevenue ?? 0)}`,
          label: 'Revenue this month',
        },
        {
          icon: <CalendarCheck size={22} />,
          value: loading ? '—' : String(adminStats?.monthReservations ?? 0),
          label: 'Reservations this month',
        },
        {
          icon: <TrendingUp size={22} />,
          value: loading ? '—' : `${adminStats?.avgOccupancyPct ?? 0} %`,
          label: 'Avg occupancy',
        },
      ]
    : staffStats?.available
      ? [
          {
            icon: <Calendar size={22} />,
            value: loading ? '—' : String(staffStats.monthLectureCount ?? 0),
            label: 'Lectures this month',
          },
          {
            icon: <Users size={22} />,
            value: loading ? '—' : String(staffStats.monthAttendees ?? 0),
            label: 'Attendees this month',
          },
          {
            icon: <TrendingUp size={22} />,
            value: loading ? '—' : `${staffStats.avgFillRatePct ?? 0} %`,
            label: 'Avg fill rate',
          },
        ]
      : [];

  return (
    <div className="admin-dash-page">
      <div className="admin-dash-hero">
        <div className="admin-dash-hero-inner">
          <p className="admin-dash-welcome-label">WELCOME BACK</p>
          <h1 className="admin-dash-name">{isAdmin ? 'ADMIN' : 'STAFF'}</h1>
          <p className="admin-dash-subtitle">
            {loading
              ? '…'
              : `You have ${upcoming.length} upcoming lecture${upcoming.length !== 1 ? 's' : ''}.`}
          </p>
          <div className="admin-dash-hero-actions">
            <Link to="/admin/calendar">
              <Button className="dash-hero-btn dash-hero-btn--primary">
                My lectures
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
        <section className="admin-dash-section">
          <div className="admin-dash-section-header">
            <p className="admin-dash-section-label">Upcoming classes</p>
            <h2 className="admin-dash-section-title">Next up</h2>
          </div>
          <div className="dash-classes-list">
            {loading && <p style={{ color: 'var(--c-muted)' }}>Loading…</p>}
            {!loading && upcoming.length === 0 && (
              <p style={{ color: 'var(--c-muted)' }}>No upcoming lectures.</p>
            )}
            {upcoming.map((item) => (
              <UpcomingClassRow key={item.id} item={item} />
            ))}
          </div>
        </section>

        {statCards.length > 0 && (
          <>
            <div className="admin-dash-divider" />
            <section className="admin-dash-section">
              <h2 className="admin-dash-section-title">This month</h2>
              <div className="dash-stats-grid">
                {statCards.map((stat) => (
                  <StatCard
                    key={stat.label}
                    icon={stat.icon}
                    value={stat.value}
                    label={stat.label}
                  />
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
