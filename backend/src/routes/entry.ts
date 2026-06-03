import { Elysia, t } from 'elysia';

import { authenticated, requirePermission } from '../middleware/auth';
import { entryService } from '../services/entry.service';

export const entryTokenRoutes = new Elysia({ prefix: '/entry' })
  .use(authenticated)
  .post('/token', async ({ ...rest }) => {
    const auth = (rest as unknown as { auth: { userId: string } }).auth;
    return entryService.generateToken(auth.userId);
  });

export const entryScanRoutes = new Elysia({ prefix: '/entry' })
  .use(requirePermission('entry:scan'))
  .post(
    '/scan',
    async ({ body, ...rest }) => {
      const auth = (rest as unknown as { auth: { userId: string } }).auth;
      return entryService.validateAndScan(body.token, auth.userId);
    },
    {
      body: t.Object({ token: t.String() }),
    },
  );

export const customerEntryRoutes = new Elysia({ prefix: '/api/customer' })
  .use(authenticated)
  .get('/entries', async ({ ...rest }) => {
    const auth = (rest as unknown as { auth: { userId: string } }).auth;
    return entryService.getCustomerEntries(auth.userId);
  });
