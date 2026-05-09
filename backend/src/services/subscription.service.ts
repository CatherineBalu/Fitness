import { asc, eq } from 'drizzle-orm';
import { db } from '../db/db';
import { tbCustomer, tbPaymentHistory, tbSubscription } from '../db/schema';
import { ConflictError, NotFoundError } from './errors';
import { getCustomerByClerkIdOrThrow } from './customer.service';

export function isMembershipActive(validUntil: string | null): boolean {
  if (!validUntil) return false;
  const today = new Date().toISOString().slice(0, 10);
  return validUntil >= today;
}

export async function listSubscriptions() {
  return db.select().from(tbSubscription).orderBy(asc(tbSubscription.price));
}

export async function buySubscription(
  clerkId: string,
  subscriptionId: string,
  paymentMethod = 'card',
): Promise<{ subscriptionValidUntil: string }> {
  const customer = await getCustomerByClerkIdOrThrow(clerkId);

  if (isMembershipActive(customer.subscriptionValidUntil)) {
    throw new ConflictError('You already have an active subscription');
  }

  const [plan] = await db
    .select()
    .from(tbSubscription)
    .where(eq(tbSubscription.id, subscriptionId))
    .limit(1);
  if (!plan) throw new NotFoundError('Subscription plan not found');

  const todayIso = new Date().toISOString().slice(0, 10);
  const validUntil = new Date(todayIso);
  validUntil.setUTCDate(validUntil.getUTCDate() + plan.durationDays);
  const validUntilIso = validUntil.toISOString().slice(0, 10);

  await db.transaction(async (tx) => {
    await tx.insert(tbPaymentHistory).values({
      customerId: customer.customerId,
      subscriptionId: plan.id,
      amount: plan.price,
      paymentMethod,
    });

    await tx
      .update(tbCustomer)
      .set({
        subscriptionId: plan.id,
        subscriptionValidUntil: validUntilIso,
        updatedAt: new Date(),
      })
      .where(eq(tbCustomer.id, customer.customerId));
  });

  return { subscriptionValidUntil: validUntilIso };
}
