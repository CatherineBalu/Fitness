import { Elysia, t } from 'elysia';
import { requirePermission } from '../../middleware/auth';
import { handleRoute } from '../../services/errors';
import {
  createStaff,
  deleteStaff,
  getEmployeeLectures,
  getEmployeeLecturesForClerkUser,
  listEmployees,
  updateStaff,
} from '../../services/staff.service';

export const staffRoutes = new Elysia({ prefix: '/api/staff' })
  .use(requirePermission('staff:read'))

  .get('/', ({ set }) => handleRoute(set, () => listEmployees()))

  .get('/me/lectures', ({ set, ...rest }) => {
    const auth = (rest as unknown as { auth: { userId: string } }).auth;
    return handleRoute(set, () => getEmployeeLecturesForClerkUser(auth.userId));
  })

  .get('/:id/lectures', ({ params, set }) =>
    handleRoute(set, () => getEmployeeLectures(params.id)),
  );

export const staffWriteRoutes = new Elysia({ prefix: '/api/staff' })
  .use(requirePermission('staff:write'))

  .post(
    '/',
    ({ body, set }) =>
      handleRoute(set, async () => {
        const result = await createStaff(body);
        set.status = 201;
        return { success: true, ...result };
      }),
    {
      body: t.Object({
        firstName: t.String({ minLength: 1 }),
        lastName: t.String({ minLength: 1 }),
        email: t.String({ pattern: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$' }),
        role: t.String({ minLength: 1 }),
        specializations: t.Optional(t.Array(t.String())),
      }),
    },
  )

  .patch(
    '/:id',
    ({ params, body, set }) =>
      handleRoute(set, async () => {
        await updateStaff(params.id, body);
        return { success: true };
      }),
    {
      body: t.Object({
        firstName: t.String({ minLength: 1 }),
        lastName: t.String({ minLength: 1 }),
        specializations: t.Optional(t.Array(t.String())),
      }),
    },
  );

export const staffDeleteRoutes = new Elysia({ prefix: '/api/staff' })
  .use(requirePermission('staff:delete'))

  .delete('/:id', ({ params, set }) =>
    handleRoute(set, async () => {
      await deleteStaff(params.id);
      return { success: true };
    }),
  );
