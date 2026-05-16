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

import StatCard from '@/components/common/StatCard';
import { Button } from '@/components/ui/button';
import { useApi } from '@/lib/api';

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
    <div className="flex items-center gap-5 rounded-lg border border-border bg-card px-5 py-4 transition-colors hover:border-primary md:flex-wrap md:gap-3">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-[15px] font-semibold text-foreground">{item.name}</span>
        <span className="text-xs text-muted-foreground">
          {formatDate(item.startTime)} ·{' '}
          {formatLectureTime(item.startTime, item.endTime)} · {item.room}
        </span>
      </div>
      <span className="whitespace-nowrap rounded-full border border-border bg-secondary px-3 py-0.5 text-[13px] font-semibold text-muted-foreground">
        {item.registered}/{item.capacity}
      </span>
      <Link to="/admin/calendar">
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 border-border bg-transparent text-[13px] text-foreground hover:border-primary hover:bg-primary hover:text-primary-foreground md:w-full"
        >
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
    <div className="min-h-[calc(100svh-var(--nav-height))] bg-background pt-[var(--nav-height)] text-foreground">
      <div className="border-b border-border bg-admin-hero px-8 py-16 md:px-5 md:py-10">
        <div className="mx-auto max-w-[1200px]">
          <p className="mb-1.5 text-[0.85rem] font-semibold tracking-[0.12em] text-muted-foreground">
            WELCOME BACK
          </p>
          <h1 className="mb-3 text-5xl font-black leading-none text-primary md:text-[2.2rem] sm:text-[1.8rem]">
            {isAdmin ? 'ADMIN' : 'STAFF'}
          </h1>
          <p className="mb-7 text-base text-muted-foreground">
            {loading
              ? '…'
              : `You have ${upcoming.length} upcoming lecture${upcoming.length !== 1 ? 's' : ''}.`}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/admin/calendar">
              <Button className="font-semibold bg-primary text-primary-foreground hover:bg-primary/90">
                My lectures
              </Button>
            </Link>
            <Link to="/schedule">
              <Button
                variant="outline"
                className="gap-1.5 font-semibold border-border text-foreground hover:border-primary hover:text-primary"
              >
                Show schedule
                <ArrowRight size={15} />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1200px] px-8 py-12 md:px-5 md:py-8">
        <section className="mb-12">
          <div className="mb-5">
            <p className="mb-1 text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-primary">
              Upcoming classes
            </p>
            <h2 className="text-2xl font-extrabold text-foreground">Next up</h2>
          </div>
          <div className="flex flex-col gap-2.5">
            {loading && <p className="text-muted-foreground">Loading…</p>}
            {!loading && upcoming.length === 0 && (
              <p className="text-muted-foreground">No upcoming lectures.</p>
            )}
            {upcoming.map((item) => (
              <UpcomingClassRow key={item.id} item={item} />
            ))}
          </div>
        </section>

        {statCards.length > 0 && (
          <>
            <div className="mb-12 h-px bg-border" />
            <section className="mb-12">
              <h2 className="text-2xl font-extrabold text-foreground">This month</h2>
              <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
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
