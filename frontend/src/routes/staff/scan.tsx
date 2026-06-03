import { createFileRoute } from '@tanstack/react-router';

import { requirePermission } from '@/lib/routeGuards';
import StaffScanPage from '@/pages/staff/StaffScanPage';

export const Route = createFileRoute('/staff/scan')({
  beforeLoad: requirePermission('entry:scan'),
  component: StaffScanPage,
});
