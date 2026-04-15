import { Elysia } from 'elysia';
import { z } from 'zod';

const createStaffSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  role: z.string().min(1, 'Role is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const staffRoutes = new Elysia({ prefix: '/api/staff' })
  .get('/', ({ set }) => {
    set.status = 501;
    return { error: 'Not implemented' };
  })

  .post('/', ({ body, set }) => {
    const result = createStaffSchema.safeParse(body);
    if (!result.success) {
      set.status = 400;
      return { error: result.error.issues[0].message };
    }

    set.status = 501;
    return { error: 'Not implemented' };
  })

  .delete('/:id', ({ set }) => {
    set.status = 501;
    return { error: 'Not implemented' };
  })

  .get('/:id/lectures', ({ set }) => {
    set.status = 501;
    return { error: 'Not implemented' };
  });

export const lectureRoutes = new Elysia({ prefix: '/api/lectures' }).get(
  '/:id/members',
  ({ set }) => {
    set.status = 501;
    return { error: 'Not implemented' };
  },
);
