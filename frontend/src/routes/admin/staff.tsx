import { createFileRoute } from '@tanstack/react-router';

import { requirePermission } from '@/lib/routeGuards';
import AdminStaffPage from '@/pages/admin/AdminStaffPage/AdminStaffPage';

export const Route = createFileRoute('/admin/staff')({
  beforeLoad: requirePermission('staff:read'),
  component: AdminStaffPage,
});
