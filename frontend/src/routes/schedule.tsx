import { createFileRoute } from '@tanstack/react-router';

import { redirectIfEmployee } from '@/lib/routeGuards';
import SchedulePage from '@/pages/SchedulePage';

export const Route = createFileRoute('/schedule')({
  beforeLoad: redirectIfEmployee,
  component: SchedulePage,
});
