import { Calendar, Users, TrendingUp, Info } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import StatCard from '@/components/common/StatCard';
import { Card, CardContent } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { useApi } from '@/lib/api';

interface LecturesByMonth {
  month: string;
  count: number;
}

interface MostPopular {
  lectureName: string;
  reservationCount: number;
}

type StaffStats =
  | {
      employeeType: 'Instructor';
      available: true;
      monthLectureCount: number;
      monthAttendees: number;
      avgFillRatePct: number;
      lecturesByMonth: LecturesByMonth[];
      mostPopularLecture: MostPopular | null;
    }
  | { employeeType: string; available: false };

const lecturesChartConfig: ChartConfig = {
  count: {
    label: 'Lectures',
    color: 'var(--c-accent)',
  },
};

export default function StaffStatisticsPage() {
  const { apiRequest } = useApi();
  const [stats, setStats] = useState<StaffStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiRequest<StaffStats>('/api/stats/staff/me')
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiRequest]);

  return (
    <div className="min-h-[calc(100svh-var(--nav-height))] bg-background pt-[var(--nav-height)] text-foreground">
      <div className="border-b border-border bg-admin-hero px-8 py-16 md:px-5 md:py-10">
        <div className="mx-auto max-w-[1200px]">
          <p className="mb-1.5 text-[0.85rem] font-semibold tracking-[0.12em] text-muted-foreground">
            YOUR ACTIVITY
          </p>
          <h1 className="mb-3 text-5xl font-black leading-none text-primary md:text-[2.2rem] sm:text-[1.8rem]">
            MY STATISTICS
          </h1>
          <p className="mb-7 text-base text-muted-foreground">
            Your teaching load, attendance, and most popular class.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-[1200px] px-8 py-12 md:px-5 md:py-8">
        {error && (
          <div className="mb-6 rounded-md border border-red-800 bg-card px-4 py-3 text-xs text-red-400">
            Failed to load: {error}
          </div>
        )}

        {loading && !error && (
          <div className="rounded-md border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
            Loading...
          </div>
        )}

        {!loading && stats && !stats.available && (
          <Card>
            <CardContent className="p-5">
              <div className="flex flex-col items-center gap-4 px-4 py-8 text-center text-muted-foreground">
                <Info size={32} />
                <h2 className="text-2xl font-extrabold text-foreground">
                  Statistics unavailable
                </h2>
                <p className="max-w-[480px] text-sm leading-relaxed text-muted-foreground">
                  Statistics are available only for instructors. Your role —
                  <strong className="text-foreground"> {stats.employeeType}</strong> — does not have any
                  activity data to summarise.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && stats && stats.available && (
          <>
            <section className="mb-12">
              <h2 className="text-2xl font-extrabold text-foreground">This month</h2>
              <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard
                  icon={<Calendar size={22} />}
                  value={String(stats.monthLectureCount)}
                  label="Lectures taught"
                />
                <StatCard
                  icon={<Users size={22} />}
                  value={String(stats.monthAttendees)}
                  label="Total attendees"
                />
                <StatCard
                  icon={<TrendingUp size={22} />}
                  value={`${stats.avgFillRatePct} %`}
                  label="Avg fill rate"
                />
              </div>
            </section>

            <div className="mb-12 h-px bg-border" />

            <section className="mb-12">
              <div className="mb-5">
                <p className="mb-1 text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-primary">Trend</p>
                <h2 className="text-2xl font-extrabold text-foreground">Last 6 months</h2>
              </div>
              {stats.lecturesByMonth.length === 0 ? (
                <div className="rounded-md border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
                  No lectures in this window.
                </div>
              ) : (
                <Card>
                  <CardContent className="p-5">
                    <ChartContainer
                      config={lecturesChartConfig}
                      className="h-[280px] w-full"
                    >
                      <BarChart
                        data={stats.lecturesByMonth}
                        margin={{ left: 12, right: 12 }}
                      >
                        <CartesianGrid
                          vertical={false}
                          stroke="var(--c-border)"
                        />
                        <XAxis
                          dataKey="month"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={10}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          width={40}
                          allowDecimals={false}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar
                          dataKey="count"
                          fill="var(--c-accent)"
                          radius={4}
                        />
                      </BarChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              )}
            </section>

            <section className="mb-12">
              <div className="mb-5">
                <p className="mb-1 text-[0.78rem] font-semibold uppercase tracking-[0.1em] text-primary">Highlights</p>
                <h2 className="text-2xl font-extrabold text-foreground">Most popular class</h2>
              </div>
              {stats.mostPopularLecture ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-4 rounded-md border border-border bg-card px-4 py-3 transition-colors hover:border-primary">
                    <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-sm font-semibold text-foreground">
                      {stats.mostPopularLecture.lectureName}
                    </span>
                    <span className="whitespace-nowrap rounded-full border border-border bg-muted px-3 py-0.5 text-sm font-bold text-foreground">
                      {stats.mostPopularLecture.reservationCount} reservations
                    </span>
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
                  No reservations on your lectures yet.
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
