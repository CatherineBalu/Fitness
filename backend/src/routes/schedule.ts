import { Elysia, t } from 'elysia';
import { requirePermission } from '../middleware/auth';
import { handleRoute } from '../lib/errors';
import { cancelReservation, createReservation, listSchedules } from '../services/schedule.service';

export const scheduleRoutes = new Elysia({ prefix: '/schedule' })

  // GET /schedule?from=2026-04-13&to=2026-04-19
  .get(
    '/',
    ({ query, set, ...rest }) => {
      const auth = (rest as unknown as { auth: { userId: string } | null }).auth;
      return handleRoute(set, () => listSchedules(query.from, query.to, auth?.userId ?? null));
    },
    {
      query: t.Object({
        from: t.String(),
        to: t.String(),
      }),
    },
  )

  // POST /schedule/:id/reservations — register current user
  // DELETE /schedule/:id/reservations — cancel current user's reservation
  .group('/:id/reservations', (app) =>
    app
      .use(requirePermission('reservation:write'))
      .post('/', ({ params, set, ...rest }) => {
        const auth = (rest as unknown as { auth: { userId: string } }).auth;
        return handleRoute(set, async () => {
          await createReservation(auth.userId, params.id);
          set.status = 201;
          return { success: true };
        });
      })
      .delete('/', ({ params, set, ...rest }) => {
        const auth = (rest as unknown as { auth: { userId: string } }).auth;
        return handleRoute(set, async () => {
          await cancelReservation(auth.userId, params.id);
          return { success: true };
        });
      }),
  );
