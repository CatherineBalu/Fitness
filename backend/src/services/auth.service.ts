import { eq } from 'drizzle-orm';
import { db } from '../db/db';
import { tbCustomer, tbPerson } from '../db/schema';
import { NotFoundError } from '../lib/errors';
import { isMembershipActive } from './subscription.service';

export async function getProfile(clerkId: string, role: string) {
  const [person] = await db.select().from(tbPerson).where(eq(tbPerson.clerkId, clerkId)).limit(1);

  if (!person) throw new NotFoundError('Profile not found');

  const [customer] = await db
    .select({ subscriptionValidUntil: tbCustomer.subscriptionValidUntil })
    .from(tbCustomer)
    .where(eq(tbCustomer.personId, person.id))
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
