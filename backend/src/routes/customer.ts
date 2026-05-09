import { Elysia } from 'elysia';
import { authenticated } from '../middleware/auth';
import { handleRoute } from '../services/errors';
import {
  cancelMembership,
  getCustomerProfile,
  getCustomerRegistrations,
  getCustomerSpending,
} from '../services/customer.service';

export const customerRoutes = new Elysia({ prefix: '/api/customer' })
  .use(authenticated)

  .get('/me', ({ set, ...rest }) => {
    const auth = (rest as unknown as { auth: { userId: string } }).auth;
    return handleRoute(set, () => getCustomerProfile(auth.userId));
  })

  .delete('/membership', ({ set, ...rest }) => {
    const auth = (rest as unknown as { auth: { userId: string } }).auth;
    return handleRoute(set, async () => {
      await cancelMembership(auth.userId);
      return { success: true };
    });
  })

  .get('/registrations', ({ set, ...rest }) => {
    const auth = (rest as unknown as { auth: { userId: string } }).auth;
    return handleRoute(set, () => getCustomerRegistrations(auth.userId));
  })

  .get('/spending', ({ set, ...rest }) => {
    const auth = (rest as unknown as { auth: { userId: string } }).auth;
    return handleRoute(set, () => getCustomerSpending(auth.userId));
  });
