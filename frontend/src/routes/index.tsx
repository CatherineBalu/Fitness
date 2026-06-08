import { createFileRoute } from '@tanstack/react-router';

import { redirectIfEmployee } from '@/lib/routeGuards';
import HomePage from '@/pages/HomePage';

export const Route = createFileRoute('/')({
  beforeLoad: redirectIfEmployee,
  component: HomePage,
});
