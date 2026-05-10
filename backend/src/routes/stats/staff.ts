import { Elysia } from 'elysia';
import { requirePermission } from '../../middleware/auth';
import { getInstructorStats } from '../../services/stats.service';

export const staffStatsRoutes = new Elysia({ prefix: '/api/stats/staff' })
  .use(requirePermission('stats:staff'))

  .get('/me', ({ ...rest }) => {
    const auth = (rest as unknown as { auth: { userId: string } | null }).auth;
    return getInstructorStats(auth?.userId ?? null);
  });
