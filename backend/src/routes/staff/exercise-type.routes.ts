import { Elysia } from 'elysia';
import { requirePermission } from '../../middleware/auth';
import { handleRoute } from '../../lib/errors';
import { listExerciseTypes } from '../../services/staff.service';

export const exerciseTypeRoutes = new Elysia({ prefix: '/api/exercise-types' })
  .use(requirePermission('staff:read'))
  .get('/', ({ set }) => handleRoute(set, () => listExerciseTypes()));
