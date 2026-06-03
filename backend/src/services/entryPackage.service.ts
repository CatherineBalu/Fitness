import { and, asc, eq, sql } from 'drizzle-orm';

import { getCustomerByClerkIdOrThrow } from './customer.service';
import { db } from '../db/db';
import { customers, entryPackages, paymentHistory } from '../db/schema';
import { NotFoundError } from '../lib/errors';
import { notDeleted } from '../lib/notDeleted';

export const entryPackageService = {
  list,
  buy,
};

async function list() {
  return db
    .select()
    .from(entryPackages)
    .where(notDeleted(entryPackages))
    .orderBy(asc(entryPackages.price));
}

async function buy(
  clerkId: string,
  entryPackageId: string,
  paymentMethod = 'card',
): Promise<{ entryBalance: number }> {
  const customer = await getCustomerByClerkIdOrThrow(clerkId);

  const [pkg] = await db
    .select()
    .from(entryPackages)
    .where(and(eq(entryPackages.id, entryPackageId), notDeleted(entryPackages)))
    .limit(1);
  if (!pkg) throw new NotFoundError('Entry package not found');

  const [updated] = await db.transaction(async (tx) => {
    await tx.insert(paymentHistory).values({
      customerId: customer.customerId,
      entryPackageId: pkg.id,
      amount: pkg.price,
      paymentMethod,
    });

    return tx
      .update(customers)
      .set({
        entryBalance: sql`${customers.entryBalance} + ${pkg.entryCount}`,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, customer.customerId))
      .returning({ entryBalance: customers.entryBalance });
  });

  return { entryBalance: updated.entryBalance };
}
