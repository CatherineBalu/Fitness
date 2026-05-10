import { Elysia } from 'elysia';
import { requirePermission } from '../../middleware/auth';
import { handleRoute } from '../../lib/errors';
import { listEmployeeTypes } from '../../services/staff.service';

export const employeeTypeRoutes = new Elysia({ prefix: '/api/employee-types' })
  .use(requirePermission('staff:read'))
  .get('/', ({ set }) => handleRoute(set, () => listEmployeeTypes()));
