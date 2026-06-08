import { Elysia, t } from 'elysia';

import { requirePermission } from '../middleware/auth';
import { cancelReservation, createReservation, listSchedules } from '../services/schedule.service';

export const scheduleRoutes = new Elysia({ prefix: '/schedule' })

  // GET /schedule?from=2026-04-13&to=2026-04-19
  .get(
    '/',
    ({ query, ...rest }) => {
      const auth = (rest as unknown as { auth: { userId: string } | null }).auth;
      return listSchedules(query.from, query.to, auth?.userId ?? null, query.myLectures === 'true');
    },
    {
      query: t.Object({
        from: t.String(),
        to: t.String(),
        myLectures: t.Optional(t.String()),
      }),
    },
  )

  // POST /schedule/:id/reservations — register current user
  // DELETE /schedule/:id/reservations — cancel current user's reservation
  .group('/:id/reservations', (app) =>
    app
      .use(requirePermission('reservation:write'))
      .post('/', async ({ params, set, ...rest }) => {
        const auth = (rest as unknown as { auth: { userId: string } }).auth;
        await createReservation(auth.userId, params.id);
        set.status = 201;
        return { success: true };
      })
      .delete('/', async ({ params, ...rest }) => {
        const auth = (rest as unknown as { auth: { userId: string } }).auth;
        await cancelReservation(auth.userId, params.id);
        return { success: true };
      }),
  );
