import { Elysia } from 'elysia';

import { listPublicInstructors } from '../services/staff.service';

export const instructorRoutes = new Elysia({ prefix: '/api/instructors' }).get('/', () =>
  listPublicInstructors(),
);
