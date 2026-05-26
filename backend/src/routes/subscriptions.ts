import { Elysia, t } from 'elysia';

import { authenticated } from '../middleware/auth';
import { buySubscription, listSubscriptions } from '../services/subscription.service';

export const subscriptionRoutes = new Elysia({ prefix: '/subscriptions' })

  .get('/', () => listSubscriptions())

  .group('/buy', (app) =>
    app.use(authenticated).post(
      '/',
      async ({ body, set, ...rest }) => {
        const auth = (rest as unknown as { auth: { userId: string } }).auth;
        const result = await buySubscription(auth.userId, body.subscriptionId, body.paymentMethod);
        set.status = 201;
        return { success: true, ...result };
      },
      {
        body: t.Object({
          subscriptionId: t.String(),
          paymentMethod: t.Optional(t.String()),
        }),
      },
    ),
  );
