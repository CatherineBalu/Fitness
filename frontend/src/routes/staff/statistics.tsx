import { createFileRoute } from '@tanstack/react-router';

import { requirePermission } from '@/lib/routeGuards';
import StaffStatisticsPage from '@/pages/staff/StaffStatisticsPage';

export const Route = createFileRoute('/staff/statistics')({
  beforeLoad: requirePermission('stats:staff'),
  component: StaffStatisticsPage,
});
