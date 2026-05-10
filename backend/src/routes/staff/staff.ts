import { Elysia, t } from 'elysia';
import { requirePermission } from '../../middleware/auth';
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

  .get('/', () => listEmployees())

  .get('/me/lectures', ({ ...rest }) => {
    const auth = (rest as unknown as { auth: { userId: string } }).auth;
    return getEmployeeLecturesForClerkUser(auth.userId);
  })

  .get('/:id/lectures', ({ params }) => getEmployeeLectures(params.id));

export const staffWriteRoutes = new Elysia({ prefix: '/api/staff' })
  .use(requirePermission('staff:write'))

  .post(
    '/',
    async ({ body, set }) => {
      const result = await createStaff(body);
      set.status = 201;
      return { success: true, ...result };
    },
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
    async ({ params, body }) => {
      await updateStaff(params.id, body);
      return { success: true };
    },
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

  .delete('/:id', async ({ params }) => {
    await deleteStaff(params.id);
    return { success: true };
  });
