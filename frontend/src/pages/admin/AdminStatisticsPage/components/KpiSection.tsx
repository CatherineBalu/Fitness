import { CalendarCheck, DollarSign, TrendingUp, Users } from 'lucide-react';

import StatCard from '@/components/common/StatCard';
import { Skeleton } from '@/components/ui/skeleton';

import { formatCurrency } from '../formatCurrency';

import type { Overview } from '../adminStatistics.types';

interface KpiSectionProps {
  overview: Overview | undefined;
  isLoading: boolean;
}

export default function KpiSection({ overview, isLoading }: KpiSectionProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard
        icon={<Users size={22} />}
        value={String(overview?.activeMemberships ?? 0)}
        label="Active memberships"
      />
      <StatCard
        icon={<DollarSign size={22} />}
        value={formatCurrency(overview?.monthRevenue ?? 0)}
        label="Revenue this month"
      />
      <StatCard
        icon={<CalendarCheck size={22} />}
        value={String(overview?.monthReservations ?? 0)}
        label="Reservations this month"
      />
      <StatCard
        icon={<TrendingUp size={22} />}
        value={`${overview?.avgOccupancyPct ?? 0} %`}
        label="Avg occupancy"
      />
    </div>
  );
}
