import { and, desc, eq, gt, isNull, sql } from 'drizzle-orm';

import { db } from '../db/db';
import { customers, entryLogs, persons, qrTokens } from '../db/schema';
import { DomainValidationError, NotFoundError, UnauthorizedError } from '../lib/errors';
import { notDeleted } from '../lib/notDeleted';

const TOKEN_TTL_MS = 5 * 60 * 1000;

export const entryService = {
  generateToken,
  validateAndScan,
  getCustomerEntries,
};

async function generateToken(clerkId: string): Promise<{ token: string; expiresAt: Date }> {
  const [row] = await db
    .select({ customerId: customers.id, entryBalance: customers.entryBalance })
    .from(customers)
    .innerJoin(persons, eq(customers.personId, persons.id))
    .where(and(eq(persons.clerkId, clerkId), notDeleted(customers), notDeleted(persons)))
    .limit(1);

  if (!row) throw new NotFoundError('Customer profile not found');
  if (row.entryBalance <= 0) throw new DomainValidationError('No entries remaining');

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
    const updated = await tx
      .update(customers)
      .set({ entryBalance: sql`${customers.entryBalance} - 1`, updatedAt: new Date() })
      .where(and(eq(customers.id, tokenRow.customerId), gt(customers.entryBalance, 0)))
      .returning({ entryBalance: customers.entryBalance });

    if (updated.length === 0) throw new DomainValidationError('No entries remaining');

    await tx.update(qrTokens).set({ usedAt: new Date() }).where(eq(qrTokens.id, tokenRow.id));

    await tx.insert(entryLogs).values({
      customerId: tokenRow.customerId,
      staffId: staffPerson.id,
      qrTokenId: tokenRow.id,
    });

    return updated[0].entryBalance;
  });

  return {
    customerName: `${customerInfo.name} ${customerInfo.surname}`,
    remainingBalance: result,
  };
}

async function getCustomerEntries(clerkId: string) {
  const [row] = await db
    .select({ customerId: customers.id, entryBalance: customers.entryBalance })
    .from(customers)
    .innerJoin(persons, eq(customers.personId, persons.id))
    .where(and(eq(persons.clerkId, clerkId), notDeleted(customers), notDeleted(persons)))
    .limit(1);

  if (!row) throw new NotFoundError('Customer profile not found');

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
    entryBalance: row.entryBalance,
    logs: logs.map((l) => ({
      id: l.id,
      scannedAt: l.scannedAt,
      staffName: `${l.staffName} ${l.staffSurname}`,
    })),
  };
}
