import { createFileRoute } from '@tanstack/react-router';

import { requirePermission } from '@/lib/routeGuards';
import AdminStatisticsPage from '@/pages/admin/AdminStatisticsPage/AdminStatisticsPage';

export const Route = createFileRoute('/admin/statistics')({
  beforeLoad: requirePermission('stats:admin'),
  component: AdminStatisticsPage,
});
