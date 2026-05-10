import { Elysia, t } from 'elysia';
import { requirePermission } from '../../middleware/auth';
import { handleRoute } from '../../lib/errors';
import {
  getAdminOverview,
  getOccupancy,
  getRevenueBySubscription,
  getRevenueMonthly,
  getTopLectures,
} from '../../services/stats.service';

export const adminStatsRoutes = new Elysia({ prefix: '/api/stats/admin' })
  .use(requirePermission('stats:admin'))

  .get('/overview', ({ set }) => handleRoute(set, () => getAdminOverview()))

  .get(
    '/revenue-monthly',
    ({ query, set }) => handleRoute(set, () => getRevenueMonthly(query.months)),
    { query: t.Object({ months: t.Optional(t.Numeric()) }) },
  )

  .get('/revenue-by-subscription', ({ set }) => handleRoute(set, () => getRevenueBySubscription()))

  .get('/top-lectures', ({ query, set }) => handleRoute(set, () => getTopLectures(query.limit)), {
    query: t.Object({ limit: t.Optional(t.Numeric()) }),
  })

  .get('/occupancy', ({ set }) => handleRoute(set, () => getOccupancy()));
