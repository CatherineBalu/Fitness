import { useEffect, useState } from 'react';
import { Users, DollarSign, CalendarCheck, TrendingUp } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { useApi } from '@/lib/api';
import './AdminStatisticsPage.css';

interface Overview {
  activeMemberships: number;
  monthRevenue: number;
  monthReservations: number;
  avgOccupancyPct: number;
}

interface RevenuePoint {
  month: string;
  total: number;
}

interface RevenueBySubscription {
  subscriptionName: string;
  total: number;
  count: number;
}

interface TopLecture {
  lectureName: string;
  reservationCount: number;
}

interface OccupancyRow {
  lectureName: string;
  avgReservations: number;
  capacity: number;
  occupancyPct: number;
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('sk-SK', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <Card className="dash-stat-card">
      <CardContent className="dash-stat-content">
        <div className="dash-stat-icon">{icon}</div>
        <span className="dash-stat-value">{value}</span>
        <span className="dash-stat-label">{label}</span>
      </CardContent>
    </Card>
  );
}

const revenueChartConfig: ChartConfig = {
  total: {
    label: 'Revenue',
    color: 'var(--c-accent)',
  },
};

export default function AdminStatisticsPage() {
  const { apiRequest } = useApi();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [revenue, setRevenue] = useState<RevenuePoint[]>([]);
  const [bySubscription, setBySubscription] = useState<RevenueBySubscription[]>(
    [],
  );
  const [topLectures, setTopLectures] = useState<TopLecture[]>([]);
  const [occupancy, setOccupancy] = useState<OccupancyRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiRequest<Overview>('/api/stats/admin/overview'),
      apiRequest<RevenuePoint[]>('/api/stats/admin/revenue-monthly?months=12'),
      apiRequest<RevenueBySubscription[]>(
        '/api/stats/admin/revenue-by-subscription',
      ),
      apiRequest<TopLecture[]>('/api/stats/admin/top-lectures?limit=10'),
      apiRequest<OccupancyRow[]>('/api/stats/admin/occupancy'),
    ])
      .then(([ov, rev, sub, top, occ]) => {
        if (cancelled) return;
        setOverview(ov);
        setRevenue(rev);
        setBySubscription(sub);
        setTopLectures(top);
        setOccupancy(occ);
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
      {/* Hero */}
      <div className="admin-dash-hero">
        <div className="admin-dash-hero-inner">
          <p className="admin-dash-welcome-label">OVERVIEW</p>
          <h1 className="admin-dash-name">STATISTICS</h1>
          <p className="admin-dash-subtitle">
            Business health at a glance — revenue, popularity, occupancy.
          </p>
        </div>
      </div>

      <div className="admin-dash-inner">
        {error && <div className="stats-error">Failed to load: {error}</div>}

        {/* KPI cards */}
        <section className="admin-dash-section">
          <h2 className="admin-dash-section-title">This month</h2>
          <div className="dash-stats-grid">
            <StatCard
              icon={<Users size={22} />}
              value={loading ? '—' : String(overview?.activeMemberships ?? 0)}
              label="Active memberships"
            />
            <StatCard
              icon={<DollarSign size={22} />}
              value={
                loading ? '—' : formatCurrency(overview?.monthRevenue ?? 0)
              }
              label="Revenue this month"
            />
            <StatCard
              icon={<CalendarCheck size={22} />}
              value={loading ? '—' : String(overview?.monthReservations ?? 0)}
              label="Reservations this month"
            />
            <StatCard
              icon={<TrendingUp size={22} />}
              value={loading ? '—' : `${overview?.avgOccupancyPct ?? 0} %`}
              label="Avg occupancy"
            />
          </div>
        </section>

        <div className="admin-dash-divider" />

        {/* Revenue chart */}
        <section className="admin-dash-section">
          <div className="admin-dash-section-header">
            <p className="admin-dash-section-label">Revenue</p>
            <h2 className="admin-dash-section-title">Last 12 months</h2>
          </div>
          {revenue.length === 0 && !loading ? (
            <div className="stats-empty">No payment data yet.</div>
          ) : (
            <Card className="stats-chart-card">
              <CardContent className="stats-chart-content">
                <ChartContainer
                  config={revenueChartConfig}
                  className="stats-chart"
                >
                  <BarChart data={revenue} margin={{ left: 12, right: 12 }}>
                    <CartesianGrid vertical={false} stroke="var(--c-border)" />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={60}
                      tickFormatter={(v: number) => formatCurrency(v)}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(v) => formatCurrency(Number(v))}
                        />
                      }
                    />
                    <Bar dataKey="total" fill="var(--c-accent)" radius={4} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Revenue by subscription + Top lectures (side by side) */}
        <section className="admin-dash-section">
          <div className="stats-two-col">
            <div>
              <div className="admin-dash-section-header">
                <p className="admin-dash-section-label">Revenue mix</p>
                <h2 className="admin-dash-section-title">By subscription</h2>
              </div>
              <div className="stats-list">
                {bySubscription.length === 0 && !loading ? (
                  <div className="stats-empty">No payment data yet.</div>
                ) : (
                  bySubscription.map((r) => (
                    <div key={r.subscriptionName} className="stats-row">
                      <span className="stats-row-label">
                        {r.subscriptionName}
                      </span>
                      <span className="stats-row-meta">{r.count} payments</span>
                      <span className="stats-row-value">
                        {formatCurrency(r.total)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <div className="admin-dash-section-header">
                <p className="admin-dash-section-label">Popularity</p>
                <h2 className="admin-dash-section-title">Top lectures</h2>
              </div>
              <div className="stats-list">
                {topLectures.length === 0 && !loading ? (
                  <div className="stats-empty">No reservations yet.</div>
                ) : (
                  topLectures.map((l, idx) => (
                    <div key={l.lectureName} className="stats-row">
                      <span className="stats-row-rank">#{idx + 1}</span>
                      <span className="stats-row-label">{l.lectureName}</span>
                      <span className="stats-row-value">
                        {l.reservationCount}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="admin-dash-divider" />

        {/* Occupancy */}
        <section className="admin-dash-section">
          <div className="admin-dash-section-header">
            <p className="admin-dash-section-label">Efficiency</p>
            <h2 className="admin-dash-section-title">Average occupancy</h2>
          </div>
          <div className="stats-list">
            {occupancy.length === 0 && !loading ? (
              <div className="stats-empty">No schedule data yet.</div>
            ) : (
              occupancy.map((r) => (
                <div key={r.lectureName} className="stats-row">
                  <span className="stats-row-label">{r.lectureName}</span>
                  <span className="stats-row-meta">
                    {r.avgReservations} / {r.capacity} avg
                  </span>
                  <span className="stats-row-value">{r.occupancyPct} %</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
