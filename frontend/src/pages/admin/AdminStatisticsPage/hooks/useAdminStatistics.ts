import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/apiClient';

import type {
  Overview,
  RevenuePoint,
  RevenueBySubscription,
  TopLecture,
  OccupancyRow,
} from '../adminStatistics.types';

export const statsKeys = {
  all: ['admin-stats'] as const,
  overview: () => [...statsKeys.all, 'overview'] as const,
  revenueMonthly: () => [...statsKeys.all, 'revenue-monthly'] as const,
  revenueBySubscription: () =>
    [...statsKeys.all, 'revenue-by-subscription'] as const,
  topLectures: () => [...statsKeys.all, 'top-lectures'] as const,
  occupancy: () => [...statsKeys.all, 'occupancy'] as const,
};

export function useAdminStatistics() {
  const overview = useQuery({
    queryKey: statsKeys.overview(),
    queryFn: () => apiClient<Overview>('/api/stats/admin/overview'),
  });
  const revenue = useQuery({
    queryKey: statsKeys.revenueMonthly(),
    queryFn: () =>
      apiClient<RevenuePoint[]>('/api/stats/admin/revenue-monthly?months=12'),
  });
  const bySubscription = useQuery({
    queryKey: statsKeys.revenueBySubscription(),
    queryFn: () =>
      apiClient<RevenueBySubscription[]>(
        '/api/stats/admin/revenue-by-subscription',
      ),
  });
  const topLectures = useQuery({
    queryKey: statsKeys.topLectures(),
    queryFn: () =>
      apiClient<TopLecture[]>('/api/stats/admin/top-lectures?limit=10'),
  });
  const occupancy = useQuery({
    queryKey: statsKeys.occupancy(),
    queryFn: () => apiClient<OccupancyRow[]>('/api/stats/admin/occupancy'),
  });

  const queries = [overview, revenue, bySubscription, topLectures, occupancy];

  return {
    overview: overview.data,
    revenue: revenue.data ?? [],
    bySubscription: bySubscription.data ?? [],
    topLectures: topLectures.data ?? [],
    occupancy: occupancy.data ?? [],
    isLoading: queries.some((q) => q.isLoading),
    isError: queries.some((q) => q.isError),
    error: queries.find((q) => q.error)?.error ?? null,
  };
}
