import { Elysia } from 'elysia';

import { authenticated } from '../middleware/auth';
import {
  cancelMembership,
  getCustomerProfile,
  getCustomerRegistrations,
  getCustomerSpending,
} from '../services/customer.service';

export const customerRoutes = new Elysia({ prefix: '/api/customer' })
  .use(authenticated)

  .get('/me', ({ ...rest }) => {
    const auth = (rest as unknown as { auth: { userId: string } }).auth;
    return getCustomerProfile(auth.userId);
  })

  .delete('/membership', async ({ ...rest }) => {
    const auth = (rest as unknown as { auth: { userId: string } }).auth;
    await cancelMembership(auth.userId);
    return { success: true };
  })

  .get('/registrations', ({ ...rest }) => {
    const auth = (rest as unknown as { auth: { userId: string } }).auth;
    return getCustomerRegistrations(auth.userId);
  })

  .get('/spending', ({ ...rest }) => {
    const auth = (rest as unknown as { auth: { userId: string } }).auth;
    return getCustomerSpending(auth.userId);
  });
