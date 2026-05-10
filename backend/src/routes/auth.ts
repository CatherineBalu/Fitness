import { Elysia } from 'elysia';
import { authenticated } from '../middleware/auth';
import { handleRoute } from '../lib/errors';
import { getProfile } from '../services/auth.service';

export const profileRoutes = new Elysia({ prefix: '/auth' })
  .use(authenticated)
  .get('/profile', ({ set, ...rest }) => {
    const auth = (rest as unknown as { auth: { userId: string; role: string } }).auth;
    return handleRoute(set, () => getProfile(auth.userId, auth.role));
  });
