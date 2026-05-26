import { useUser } from '@clerk/clerk-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import {
  Calendar,
  Users,
  TrendingUp,
  CalendarCheck,
  ArrowRight,
} from 'lucide-react';

import StatCard from '@/components/common/StatCard';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/apiClient';

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
    <div className="border-border bg-card hover:border-primary flex items-center gap-5 rounded-lg border px-5 py-4 transition-colors md:flex-wrap md:gap-3">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-foreground text-[15px] font-semibold">
          {item.name}
        </span>
        <span className="text-muted-foreground text-xs">
          {formatDate(item.startTime)} ·{' '}
          {formatLectureTime(item.startTime, item.endTime)} · {item.room}
        </span>
      </div>
      <span className="border-border bg-secondary text-muted-foreground text-xs-plus rounded-full border px-3 py-0.5 font-semibold whitespace-nowrap">
        {item.registered}/{item.capacity}
      </span>
      <Link to="/admin/calendar">
        <Button
          size="sm"
          variant="outline"
          className="border-border text-foreground hover:border-primary hover:bg-primary hover:text-primary-foreground text-xs-plus shrink-0 bg-transparent md:w-full"
        >
          Manage
        </Button>
      </Link>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { user } = useUser();
  const role = (user?.publicMetadata as { role?: string })?.role ?? null;
  const isAdmin = role === 'admin';

  const lecturesQuery = useQuery({
    queryKey: ['staff', 'me', 'lectures'],
    queryFn: () => apiClient<Lecture[]>('/api/staff/me/lectures'),
  });
  const adminOverviewQuery = useQuery({
    queryKey: ['stats', 'admin', 'overview'],
    queryFn: () => apiClient<AdminOverview>('/api/stats/admin/overview'),
    enabled: isAdmin,
  });
  const staffStatsQuery = useQuery({
    queryKey: ['stats', 'staff', 'me'],
    queryFn: () => apiClient<StaffStats>('/api/stats/staff/me'),
    enabled: !isAdmin,
  });

  const loading =
    lecturesQuery.isLoading ||
    (isAdmin ? adminOverviewQuery.isLoading : staffStatsQuery.isLoading);
  const adminStats = adminOverviewQuery.data ?? null;
  const staffStats = staffStatsQuery.data ?? null;

  const now = new Date();
  const upcoming = (lecturesQuery.data ?? [])
    .filter((l) => new Date(l.startTime) > now)
    .slice(0, 3);

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
    <div className="bg-background text-foreground min-h-[calc(100svh-var(--nav-height))] pt-[var(--nav-height)]">
      <div className="border-border bg-admin-hero border-b px-8 py-16 md:px-5 md:py-10">
        <div className="mx-auto max-w-[1200px]">
          <p className="text-muted-foreground mb-1.5 text-[0.85rem] font-semibold tracking-[0.12em]">
            WELCOME BACK
          </p>
          <h1 className="text-primary mb-3 text-5xl leading-none font-black sm:text-[1.8rem] md:text-[2.2rem]">
            {isAdmin ? 'ADMIN' : 'STAFF'}
          </h1>
          <p className="text-muted-foreground mb-7 text-base">
            {loading
              ? '…'
              : `You have ${upcoming.length} upcoming lecture${upcoming.length !== 1 ? 's' : ''}.`}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/admin/calendar">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
                My lectures
              </Button>
            </Link>
            <Link to="/schedule">
              <Button
                variant="outline"
                className="border-border text-foreground hover:border-primary hover:text-primary gap-1.5 font-semibold"
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
            <p className="text-primary mb-1 text-[0.78rem] font-semibold tracking-[0.1em] uppercase">
              Upcoming classes
            </p>
            <h2 className="text-foreground text-2xl font-extrabold">Next up</h2>
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
            <div className="bg-border mb-12 h-px" />
            <section className="mb-12">
              <h2 className="text-foreground text-2xl font-extrabold">
                This month
              </h2>
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
