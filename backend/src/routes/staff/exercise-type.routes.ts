import { Elysia } from 'elysia';
import { requirePermission } from '../../middleware/auth';
import { listExerciseTypes } from '../../services/staff.service';

export const exerciseTypeRoutes = new Elysia({ prefix: '/api/exercise-types' })
  .use(requirePermission('staff:read'))
  .get('/', () => listExerciseTypes());
