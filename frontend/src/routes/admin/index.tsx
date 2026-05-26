import { createFileRoute } from '@tanstack/react-router';

import { requirePermission } from '@/lib/routeGuards';
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage';

export const Route = createFileRoute('/admin/')({
  beforeLoad: requirePermission('staff:read'),
  component: AdminDashboardPage,
});
