import { and, asc, desc, eq, gt, isNull, sql } from 'drizzle-orm';

import { db } from '../db/db';
import { customers, entryCredits, entryLogs, persons, qrTokens } from '../db/schema';
import { DomainValidationError, NotFoundError, UnauthorizedError } from '../lib/errors';
import { notDeleted } from '../lib/notDeleted';

const TOKEN_TTL_MS = 5 * 60 * 1000;

// How long purchased entries stay valid, counted from the moment of purchase.
export const ENTRY_VALIDITY_DAYS = 180;
export const ENTRY_VALIDITY_MS = ENTRY_VALIDITY_DAYS * 24 * 60 * 60 * 1000;

/** Condition matching a customer's usable (non-expired, non-empty, non-deleted) credit batches. */
export function activeCreditConditions(customerId: string) {
  return and(
    eq(entryCredits.customerId, customerId),
    gt(entryCredits.remainingCount, 0),
    gt(entryCredits.expiresAt, sql`now()`),
    notDeleted(entryCredits),
  );
}

type Executor = Pick<typeof db, 'select' | 'update'>;

/** Live (non-expired) entry balance for a customer. The customers.entryBalance column is only a cache. */
export async function sumActiveCredits(exec: Executor, customerId: string): Promise<number> {
  const [row] = await exec
    .select({ total: sql<number>`coalesce(sum(${entryCredits.remainingCount}), 0)::int` })
    .from(entryCredits)
    .where(activeCreditConditions(customerId));
  return row?.total ?? 0;
}

/** Recompute the denormalized customers.entryBalance cache from the ledger. Returns the live balance. */
async function recalcEntryBalanceCache(exec: Executor, customerId: string): Promise<number> {
  const total = await sumActiveCredits(exec, customerId);
  await exec
    .update(customers)
    .set({ entryBalance: total, updatedAt: new Date() })
    .where(eq(customers.id, customerId));
  return total;
}

export const entryService = {
  generateToken,
  validateAndScan,
  getCustomerEntries,
  sumActiveCredits,
  recalcEntryBalanceCache,
};

async function generateToken(clerkId: string): Promise<{ token: string; expiresAt: Date }> {
  const [row] = await db
    .select({ customerId: customers.id })
    .from(customers)
    .innerJoin(persons, eq(customers.personId, persons.id))
    .where(and(eq(persons.clerkId, clerkId), notDeleted(customers), notDeleted(persons)))
    .limit(1);

  if (!row) throw new NotFoundError('Customer profile not found');

  // Balance is computed live from the ledger — the cache can be stale once a batch expires by time alone.
  const balance = await sumActiveCredits(db, row.customerId);
  if (balance <= 0) throw new DomainValidationError('No entries remaining');

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await db.insert(qrTokens).values({
    customerId: row.customerId,
    token,
    expiresAt,
  });

  return { token, expiresAt };
}

async function validateAndScan(
  token: string,
  staffClerkId: string,
): Promise<{ customerName: string; remainingBalance: number }> {
  const [tokenRow] = await db
    .select({
      id: qrTokens.id,
      customerId: qrTokens.customerId,
    })
    .from(qrTokens)
    .where(
      and(
        eq(qrTokens.token, token),
        isNull(qrTokens.usedAt),
        gt(qrTokens.expiresAt, sql`now()`),
        notDeleted(qrTokens),
      ),
    )
    .limit(1);

  if (!tokenRow) throw new DomainValidationError('Invalid or expired QR code');

  const [staffPerson] = await db
    .select({ id: persons.id })
    .from(persons)
    .where(and(eq(persons.clerkId, staffClerkId), notDeleted(persons)))
    .limit(1);

  if (!staffPerson) throw new UnauthorizedError('Staff profile not found');

  const [customerInfo] = await db
    .select({ name: persons.name, surname: persons.surname })
    .from(customers)
    .innerJoin(persons, eq(customers.personId, persons.id))
    .where(eq(customers.id, tokenRow.customerId))
    .limit(1);

  const result = await db.transaction(async (tx) => {
    // FIFO: consume from the batch that expires soonest, so the customer never
    // loses still-usable entries to expiry while later batches sit unused.
    const [credit] = await tx
      .select({ id: entryCredits.id })
      .from(entryCredits)
      .where(activeCreditConditions(tokenRow.customerId))
      .orderBy(asc(entryCredits.expiresAt))
      .limit(1);

    if (!credit) throw new DomainValidationError('No entries remaining');

    await tx
      .update(entryCredits)
      .set({ remainingCount: sql`${entryCredits.remainingCount} - 1`, updatedAt: new Date() })
      .where(eq(entryCredits.id, credit.id));

    // Refresh the denormalized cache from the ledger and read back the live balance.
    const remainingBalance = await recalcEntryBalanceCache(tx, tokenRow.customerId);

    await tx.update(qrTokens).set({ usedAt: new Date() }).where(eq(qrTokens.id, tokenRow.id));

    await tx.insert(entryLogs).values({
      customerId: tokenRow.customerId,
      staffId: staffPerson.id,
      qrTokenId: tokenRow.id,
    });

    return remainingBalance;
  });

  return {
    customerName: `${customerInfo.name} ${customerInfo.surname}`,
    remainingBalance: result,
  };
}

async function getCustomerEntries(clerkId: string) {
  const [row] = await db
    .select({ customerId: customers.id })
    .from(customers)
    .innerJoin(persons, eq(customers.personId, persons.id))
    .where(and(eq(persons.clerkId, clerkId), notDeleted(customers), notDeleted(persons)))
    .limit(1);

  if (!row) throw new NotFoundError('Customer profile not found');

  // Usable batches, soonest-expiring first — drives the "X entries expire on <date>" UI.
  const credits = await db
    .select({
      remainingCount: entryCredits.remainingCount,
      expiresAt: entryCredits.expiresAt,
    })
    .from(entryCredits)
    .where(activeCreditConditions(row.customerId))
    .orderBy(asc(entryCredits.expiresAt));

  const entryBalance = credits.reduce((sum, c) => sum + c.remainingCount, 0);

  const logs = await db
    .select({
      id: entryLogs.id,
      scannedAt: entryLogs.scannedAt,
      staffName: persons.name,
      staffSurname: persons.surname,
    })
    .from(entryLogs)
    .innerJoin(persons, eq(entryLogs.staffId, persons.id))
    .where(and(eq(entryLogs.customerId, row.customerId), notDeleted(entryLogs)))
    .orderBy(desc(entryLogs.scannedAt))
    .limit(20);

  return {
    entryBalance,
    credits,
    logs: logs.map((l) => ({
      id: l.id,
      scannedAt: l.scannedAt,
      staffName: `${l.staffName} ${l.staffSurname}`,
    })),
  };
}
