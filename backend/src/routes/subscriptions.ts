import { Elysia, t } from 'elysia';
import { asc, eq } from 'drizzle-orm';
import { db } from '../db/db';
import { tbSubscription, tbCustomer, tbPerson, tbPaymentHistory } from '../db/schema';
import { authenticated } from '../middleware/auth';

export const subscriptionRoutes = new Elysia({ prefix: '/subscriptions' })

  // GET /subscriptions — public list of plans (cheapest first)
  .get('/', async () => {
    return db.select().from(tbSubscription).orderBy(asc(tbSubscription.price));
  })

  // POST /subscriptions/buy — authenticated customers only
  .group('/buy', (app) =>
    app.use(authenticated).post(
      '/',
      async ({ body, auth, set }) => {
        const [row] = await db
          .select({
            customerId: tbCustomer.id,
            subscriptionValidUntil: tbCustomer.subscriptionValidUntil,
          })
          .from(tbCustomer)
          .innerJoin(tbPerson, eq(tbCustomer.personId, tbPerson.id))
          .where(eq(tbPerson.clerkId, auth!.userId))
          .limit(1);

        if (!row) {
          set.status = 404;
          return { error: 'Customer profile not found' };
        }

        const todayIso = new Date().toISOString().split('T')[0];
        if (
          row.subscriptionValidUntil &&
          new Date(row.subscriptionValidUntil) >= new Date(todayIso)
        ) {
          set.status = 409;
          return { error: 'You already have an active subscription' };
        }

        const [plan] = await db
          .select()
          .from(tbSubscription)
          .where(eq(tbSubscription.id, body.subscriptionId))
          .limit(1);
        if (!plan) {
          set.status = 404;
          return { error: 'Subscription plan not found' };
        }

        const startDate = new Date(todayIso);
        const validUntil = new Date(startDate);
        validUntil.setUTCDate(validUntil.getUTCDate() + plan.durationDays);
        const validUntilIso = validUntil.toISOString().split('T')[0];

        await db.insert(tbPaymentHistory).values({
          customerId: row.customerId,
          subscriptionId: plan.id,
          amount: plan.price,
          paymentMethod: body.paymentMethod ?? 'card',
        });

        await db
          .update(tbCustomer)
          .set({
            subscriptionId: plan.id,
            subscriptionValidUntil: validUntilIso,
          })
          .where(eq(tbCustomer.id, row.customerId));

        set.status = 201;
        return {
          success: true,
          subscriptionValidUntil: validUntilIso,
        };
      },
      {
        body: t.Object({
          subscriptionId: t.String(),
          paymentMethod: t.Optional(t.String()),
        }),
      },
    ),
  );
