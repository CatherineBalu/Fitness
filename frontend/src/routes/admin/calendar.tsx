import { createFileRoute } from '@tanstack/react-router';

import { requirePermission } from '@/lib/routeGuards';
import AdminCalendarPage from '@/pages/admin/AdminCalendarPage/AdminCalendarPage';

export const Route = createFileRoute('/admin/calendar')({
  beforeLoad: requirePermission('schedule:write'),
  component: AdminCalendarPage,
});
