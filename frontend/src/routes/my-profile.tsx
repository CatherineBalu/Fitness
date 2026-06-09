import { createFileRoute } from '@tanstack/react-router';

import { requireAuth } from '@/lib/routeGuards';
import MyProfilePage from '@/pages/MyProfilePage';

export const Route = createFileRoute('/my-profile')({
  beforeLoad: requireAuth,
  component: MyProfilePage,
});
