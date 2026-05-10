import { Elysia } from 'elysia';
import { requirePermission } from '../../middleware/auth';
import { listLectureMembers } from '../../services/staff.service';

export const lectureRoutes = new Elysia({ prefix: '/api/lectures' })
  .use(requirePermission('staff:read'))
  .get('/:id/members', ({ params }) => listLectureMembers(params.id));
