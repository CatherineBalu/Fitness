import { and, asc, eq } from 'drizzle-orm';

import { getCustomerByClerkIdOrThrow } from './customer.service';
import { db } from '../db/db';
import { customers, paymentHistory, subscriptions } from '../db/schema';
import { ConflictError, NotFoundError } from '../lib/errors';
import { notDeleted } from '../lib/notDeleted';

export function isMembershipActive(validUntil: string | null): boolean {
  if (!validUntil) return false;
  const today = new Date().toISOString().slice(0, 10);
  return validUntil >= today;
}

export async function listSubscriptions() {
  return db
    .select()
    .from(subscriptions)
    .where(notDeleted(subscriptions))
    .orderBy(asc(subscriptions.price));
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
    .from(subscriptions)
    .where(and(eq(subscriptions.id, subscriptionId), notDeleted(subscriptions)))
    .limit(1);
  if (!plan) throw new NotFoundError('Subscription plan not found');

  const todayIso = new Date().toISOString().slice(0, 10);
  const validUntil = new Date(todayIso);
  validUntil.setUTCDate(validUntil.getUTCDate() + plan.durationDays);
  const validUntilIso = validUntil.toISOString().slice(0, 10);

  await db.transaction(async (tx) => {
    await tx.insert(paymentHistory).values({
      customerId: customer.customerId,
      subscriptionId: plan.id,
      amount: plan.price,
      paymentMethod,
    });

    await tx
      .update(customers)
      .set({
        subscriptionId: plan.id,
        subscriptionValidUntil: validUntilIso,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, customer.customerId));
  });

  return { subscriptionValidUntil: validUntilIso };
}
