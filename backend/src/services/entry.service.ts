import { and, asc, desc, eq, gt, gte, isNull, sql } from 'drizzle-orm';

import { isMembershipActive } from './subscription.service';
import { db } from '../db/db';
import { customers, entryCredits, entryLogs, persons, qrTokens } from '../db/schema';
import { DomainValidationError, NotFoundError, UnauthorizedError } from '../lib/errors';
import { notDeleted } from '../lib/notDeleted';

const TOKEN_TTL_MS = 5 * 60 * 1000;

type QrKind = 'entry' | 'membership';

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

/** True if the customer has already used a membership access pass today (calendar day, server tz). */
async function hasMembershipEntryToday(exec: Executor, customerId: string): Promise<boolean> {
  const [row] = await exec
    .select({ count: sql<number>`count(*)::int` })
    .from(entryLogs)
    .innerJoin(qrTokens, eq(entryLogs.qrTokenId, qrTokens.id))
    .where(
      and(
        eq(entryLogs.customerId, customerId),
        eq(qrTokens.kind, 'membership'),
        gte(entryLogs.scannedAt, sql`date_trunc('day', now())`),
        notDeleted(entryLogs),
      ),
    );
  return (row?.count ?? 0) > 0;
}

async function insertToken(
  customerId: string,
  kind: QrKind,
): Promise<{ token: string; expiresAt: Date }> {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
  await db.insert(qrTokens).values({ customerId, kind, token, expiresAt });
  return { token, expiresAt };
}

async function findCustomerIdByClerk(clerkId: string) {
  const [row] = await db
    .select({
      customerId: customers.id,
      subscriptionValidUntil: customers.subscriptionValidUntil,
    })
    .from(customers)
    .innerJoin(persons, eq(customers.personId, persons.id))
    .where(and(eq(persons.clerkId, clerkId), notDeleted(customers), notDeleted(persons)))
    .limit(1);
  return row ?? null;
}

export const entryService = {
  generateToken,
  generateMembershipToken,
  validateAndScan,
  getCustomerEntries,
  sumActiveCredits,
  recalcEntryBalanceCache,
};

async function generateToken(clerkId: string): Promise<{ token: string; expiresAt: Date }> {
  const row = await findCustomerIdByClerk(clerkId);
  if (!row) throw new NotFoundError('Customer profile not found');

  // Balance is computed live from the ledger — the cache can be stale once a batch expires by time alone.
  const balance = await sumActiveCredits(db, row.customerId);
  if (balance <= 0) throw new DomainValidationError('No entries remaining');

  return insertToken(row.customerId, 'entry');
}

async function generateMembershipToken(
  clerkId: string,
): Promise<{ token: string; expiresAt: Date }> {
  const row = await findCustomerIdByClerk(clerkId);
  if (!row) throw new NotFoundError('Customer profile not found');

  if (!isMembershipActive(row.subscriptionValidUntil)) {
    throw new DomainValidationError('No active membership');
  }
  if (await hasMembershipEntryToday(db, row.customerId)) {
    throw new DomainValidationError('You have already used your membership entry today');
  }

  return insertToken(row.customerId, 'membership');
}

async function validateAndScan(
  token: string,
  staffClerkId: string,
): Promise<{ customerName: string; remainingBalance: number | null; kind: QrKind }> {
  const [tokenRow] = await db
    .select({
      id: qrTokens.id,
      customerId: qrTokens.customerId,
      kind: qrTokens.kind,
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
    .select({
      name: persons.name,
      surname: persons.surname,
      subscriptionValidUntil: customers.subscriptionValidUntil,
    })
    .from(customers)
    .innerJoin(persons, eq(customers.personId, persons.id))
    .where(eq(customers.id, tokenRow.customerId))
    .limit(1);

  const kind = tokenRow.kind as QrKind;
  const customerName = `${customerInfo.name} ${customerInfo.surname}`;

  if (kind === 'membership') {
    await db.transaction(async (tx) => {
      // Re-check at scan time: membership still valid and not already used today (race guard).
      if (!isMembershipActive(customerInfo.subscriptionValidUntil)) {
        throw new DomainValidationError('No active membership');
      }
      if (await hasMembershipEntryToday(tx, tokenRow.customerId)) {
        throw new DomainValidationError('Membership entry already used today');
      }

      await tx.update(qrTokens).set({ usedAt: new Date() }).where(eq(qrTokens.id, tokenRow.id));
      await tx.insert(entryLogs).values({
        customerId: tokenRow.customerId,
        staffId: staffPerson.id,
        qrTokenId: tokenRow.id,
      });
    });

    return { customerName, remainingBalance: null, kind };
  }

  const remainingBalance = await db.transaction(async (tx) => {
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
    const balance = await recalcEntryBalanceCache(tx, tokenRow.customerId);

    await tx.update(qrTokens).set({ usedAt: new Date() }).where(eq(qrTokens.id, tokenRow.id));

    await tx.insert(entryLogs).values({
      customerId: tokenRow.customerId,
      staffId: staffPerson.id,
      qrTokenId: tokenRow.id,
    });

    return balance;
  });

  return { customerName, remainingBalance, kind };
}

async function getCustomerEntries(clerkId: string) {
  const [row] = await db
    .select({
      customerId: customers.id,
      subscriptionValidUntil: customers.subscriptionValidUntil,
    })
    .from(customers)
    .innerJoin(persons, eq(customers.personId, persons.id))
    .where(and(eq(persons.clerkId, clerkId), notDeleted(customers), notDeleted(persons)))
    .limit(1);

  if (!row) throw new NotFoundError('Customer profile not found');

  const membershipActive = isMembershipActive(row.subscriptionValidUntil);
  const membershipEnteredToday = membershipActive
    ? await hasMembershipEntryToday(db, row.customerId)
    : false;

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
    membershipEnteredToday,
    logs: logs.map((l) => ({
      id: l.id,
      scannedAt: l.scannedAt,
      staffName: `${l.staffName} ${l.staffSurname}`,
    })),
  };
}
