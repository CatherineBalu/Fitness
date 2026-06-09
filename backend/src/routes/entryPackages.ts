import { Elysia, t } from 'elysia';

import { authenticated } from '../middleware/auth';
import { entryPackageService } from '../services/entryPackage.service';

export const entryPackageRoutes = new Elysia({ prefix: '/entry-packages' })

  .get('/', () => entryPackageService.list())

  .group('/buy', (app) =>
    app.use(authenticated).post(
      '/',
      async ({ body, set, ...rest }) => {
        const auth = (rest as unknown as { auth: { userId: string } }).auth;
        const result = await entryPackageService.buy(
          auth.userId,
          body.entryPackageId,
          body.paymentMethod,
        );
        set.status = 201;
        return { success: true, ...result };
      },
      {
        body: t.Object({
          entryPackageId: t.String({
            pattern:
              '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
          }),
          paymentMethod: t.Optional(t.Union([t.Literal('card'), t.Literal('cash')])),
        }),
      },
    ),
  );
