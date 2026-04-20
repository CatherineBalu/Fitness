import { useEffect, useState } from 'react';
import { Calendar, Users, TrendingUp, Info } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { useApi } from '@/lib/api';
import { StatCard } from '@/components/stats/StatCard';
import '@/components/stats/stats.css';

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
    <div className="admin-dash-page">
      <div className="admin-dash-hero">
        <div className="admin-dash-hero-inner">
          <p className="admin-dash-welcome-label">YOUR ACTIVITY</p>
          <h1 className="admin-dash-name">MY STATISTICS</h1>
          <p className="admin-dash-subtitle">
            Your teaching load, attendance, and most popular class.
          </p>
        </div>
      </div>

      <div className="admin-dash-inner">
        {error && <div className="stats-error">Failed to load: {error}</div>}

        {loading && !error && <div className="stats-empty">Loading...</div>}

        {!loading && stats && !stats.available && (
          <Card className="stats-chart-card">
            <CardContent className="stats-chart-content">
              <div className="stats-unavailable">
                <Info size={32} />
                <h2 className="admin-dash-section-title">
                  Statistics unavailable
                </h2>
                <p className="stats-unavailable-text">
                  Statistics are available only for instructors. Your role —
                  <strong> {stats.employeeType}</strong> — does not have any
                  activity data to summarise.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && stats && stats.available && (
          <>
            <section className="admin-dash-section">
              <h2 className="admin-dash-section-title">This month</h2>
              <div className="dash-stats-grid">
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

            <div className="admin-dash-divider" />

            <section className="admin-dash-section">
              <div className="admin-dash-section-header">
                <p className="admin-dash-section-label">Trend</p>
                <h2 className="admin-dash-section-title">Last 6 months</h2>
              </div>
              {stats.lecturesByMonth.length === 0 ? (
                <div className="stats-empty">No lectures in this window.</div>
              ) : (
                <Card className="stats-chart-card">
                  <CardContent className="stats-chart-content">
                    <ChartContainer
                      config={lecturesChartConfig}
                      className="stats-chart"
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

            <section className="admin-dash-section">
              <div className="admin-dash-section-header">
                <p className="admin-dash-section-label">Highlights</p>
                <h2 className="admin-dash-section-title">Most popular class</h2>
              </div>
              {stats.mostPopularLecture ? (
                <div className="stats-list">
                  <div className="stats-row">
                    <span className="stats-row-label">
                      {stats.mostPopularLecture.lectureName}
                    </span>
                    <span className="stats-row-value">
                      {stats.mostPopularLecture.reservationCount} reservations
                    </span>
                  </div>
                </div>
              ) : (
                <div className="stats-empty">
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
