import { and, asc, eq } from 'drizzle-orm';

import { getCustomerByClerkIdOrThrow } from './customer.service';
import { ENTRY_VALIDITY_MS, entryService } from './entry.service';
import { db } from '../db/db';
import { entryCredits, entryPackages, paymentHistory } from '../db/schema';
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

  const entryBalance = await db.transaction(async (tx) => {
    await tx.insert(paymentHistory).values({
      customerId: customer.customerId,
      entryPackageId: pkg.id,
      amount: pkg.price,
      paymentMethod,
    });

    // Each purchase is its own batch with its own expiry (validity counted from now).
    await tx.insert(entryCredits).values({
      customerId: customer.customerId,
      entryPackageId: pkg.id,
      remainingCount: pkg.entryCount,
      expiresAt: new Date(Date.now() + ENTRY_VALIDITY_MS),
    });

    return entryService.recalcEntryBalanceCache(tx, customer.customerId);
  });

  return { entryBalance };
}
