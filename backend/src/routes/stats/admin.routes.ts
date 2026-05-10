import { Elysia, t } from 'elysia';
import { requirePermission } from '../../middleware/auth';
import {
  getAdminOverview,
  getOccupancy,
  getRevenueBySubscription,
  getRevenueMonthly,
  getTopLectures,
} from '../../services/stats.service';

export const adminStatsRoutes = new Elysia({ prefix: '/api/stats/admin' })
  .use(requirePermission('stats:admin'))

  .get('/overview', () => getAdminOverview())

  .get('/revenue-monthly', ({ query }) => getRevenueMonthly(query.months), {
    query: t.Object({ months: t.Optional(t.Numeric()) }),
  })

  .get('/revenue-by-subscription', () => getRevenueBySubscription())

  .get('/top-lectures', ({ query }) => getTopLectures(query.limit), {
    query: t.Object({ limit: t.Optional(t.Numeric()) }),
  })

  .get('/occupancy', () => getOccupancy());
