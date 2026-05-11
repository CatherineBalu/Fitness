import { and, eq } from 'drizzle-orm';
import { db } from '../db/db';
import { customers, persons } from '../db/schema';
import { NotFoundError } from '../lib/errors';
import { notDeleted } from '../lib/notDeleted';
import { isMembershipActive } from './subscription.service';

export async function getProfile(clerkId: string, role: string) {
  const [person] = await db
    .select()
    .from(persons)
    .where(and(eq(persons.clerkId, clerkId), notDeleted(persons)))
    .limit(1);

  if (!person) throw new NotFoundError('Profile not found');

  const [customer] = await db
    .select({ subscriptionValidUntil: customers.subscriptionValidUntil })
    .from(customers)
    .where(and(eq(customers.personId, person.id), notDeleted(customers)))
    .limit(1);

  return {
    id: person.id,
    name: person.name,
    surname: person.surname,
    email: person.email,
    phoneNumber: person.phoneNumber,
    role,
    hasActiveMembership: isMembershipActive(customer?.subscriptionValidUntil ?? null),
    subscriptionValidUntil: customer?.subscriptionValidUntil ?? null,
  };
}
