import { Elysia } from 'elysia';
import { requirePermission } from '../../middleware/auth';
import { handleRoute } from '../../services/errors';
import { listLectureMembers } from '../../services/staff.service';

export const lectureRoutes = new Elysia({ prefix: '/api/lectures' })
  .use(requirePermission('staff:read'))
  .get('/:id/members', ({ params, set }) => handleRoute(set, () => listLectureMembers(params.id)));
