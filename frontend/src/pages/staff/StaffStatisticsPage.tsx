import { useQuery } from '@tanstack/react-query';
import { Calendar, Users, TrendingUp, Info } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import StatCard from '@/components/common/StatCard';
import { Card, CardContent } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { apiClient } from '@/lib/apiClient';

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
    color: 'var(--accent)',
  },
};

export default function StaffStatisticsPage() {
  const {
    data: stats,
    error,
    isLoading: loading,
  } = useQuery({
    queryKey: ['stats', 'staff', 'me'],
    queryFn: () => apiClient<StaffStats>('/api/stats/staff/me'),
  });

  return (
    <div className="bg-background text-foreground min-h-[calc(100svh-var(--nav-height))] pt-[var(--nav-height)]">
      <div className="border-border bg-admin-hero border-b px-8 py-16 md:px-5 md:py-10">
        <div className="mx-auto max-w-[1200px]">
          <p className="text-muted-foreground mb-1.5 text-[0.85rem] font-semibold tracking-[0.12em]">
            YOUR ACTIVITY
          </p>
          <h1 className="text-primary mb-3 text-5xl leading-none font-black sm:text-[1.8rem] md:text-[2.2rem]">
            MY STATISTICS
          </h1>
          <p className="text-muted-foreground mb-7 text-base">
            Your teaching load, attendance, and most popular class.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-[1200px] px-8 py-12 md:px-5 md:py-8">
        {error && (
          <div className="bg-card border-destructive/70 text-destructive mb-6 rounded-md border px-4 py-3 text-xs">
            Failed to load: {error.message}
          </div>
        )}

        {loading && !error && (
          <div className="border-border bg-card text-muted-foreground rounded-md border border-dashed p-6 text-center text-sm">
            Loading...
          </div>
        )}

        {!loading && stats && !stats.available && (
          <Card>
            <CardContent className="p-5">
              <div className="text-muted-foreground flex flex-col items-center gap-4 px-4 py-8 text-center">
                <Info size={32} />
                <h2 className="text-foreground text-2xl font-extrabold">
                  Statistics unavailable
                </h2>
                <p className="text-muted-foreground max-w-[480px] text-sm leading-relaxed">
                  Statistics are available only for instructors. Your role —
                  <strong className="text-foreground">
                    {' '}
                    {stats.employeeType}
                  </strong>{' '}
                  — does not have any activity data to summarise.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && stats && stats.available && (
          <>
            <section className="mb-12">
              <h2 className="text-foreground text-2xl font-extrabold">
                This month
              </h2>
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

            <div className="bg-border mb-12 h-px" />

            <section className="mb-12">
              <div className="mb-5">
                <p className="text-primary mb-1 text-[0.78rem] font-semibold tracking-[0.1em] uppercase">
                  Trend
                </p>
                <h2 className="text-foreground text-2xl font-extrabold">
                  Last 6 months
                </h2>
              </div>
              {stats.lecturesByMonth.length === 0 ? (
                <div className="border-border bg-card text-muted-foreground rounded-md border border-dashed p-6 text-center text-sm">
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
                          stroke="var(--border)"
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
                          fill="var(--accent)"
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
                <p className="text-primary mb-1 text-[0.78rem] font-semibold tracking-[0.1em] uppercase">
                  Highlights
                </p>
                <h2 className="text-foreground text-2xl font-extrabold">
                  Most popular class
                </h2>
              </div>
              {stats.mostPopularLecture ? (
                <div className="flex flex-col gap-2">
                  <div className="border-border bg-card hover:border-primary flex items-center gap-4 rounded-md border px-4 py-3 transition-colors">
                    <span className="text-foreground min-w-0 flex-1 overflow-hidden text-sm font-semibold text-ellipsis whitespace-nowrap">
                      {stats.mostPopularLecture.lectureName}
                    </span>
                    <span className="border-border bg-muted text-foreground rounded-full border px-3 py-0.5 text-sm font-bold whitespace-nowrap">
                      {stats.mostPopularLecture.reservationCount} reservations
                    </span>
                  </div>
                </div>
              ) : (
                <div className="border-border bg-card text-muted-foreground rounded-md border border-dashed p-6 text-center text-sm">
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
