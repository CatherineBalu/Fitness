import { Elysia, t } from 'elysia';
import { authenticated } from '../middleware/auth';
import { handleRoute } from '../lib/errors';
import { buySubscription, listSubscriptions } from '../services/subscription.service';

export const subscriptionRoutes = new Elysia({ prefix: '/subscriptions' })

  .get('/', ({ set }) => handleRoute(set, () => listSubscriptions()))

  .group('/buy', (app) =>
    app.use(authenticated).post(
      '/',
      ({ body, set, ...rest }) => {
        const auth = (rest as unknown as { auth: { userId: string } }).auth;
        return handleRoute(set, async () => {
          const result = await buySubscription(
            auth.userId,
            body.subscriptionId,
            body.paymentMethod,
          );
          set.status = 201;
          return { success: true, ...result };
        });
      },
      {
        body: t.Object({
          subscriptionId: t.String(),
          paymentMethod: t.Optional(t.String()),
        }),
      },
    ),
  );
