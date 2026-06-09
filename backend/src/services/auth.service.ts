import { and, eq } from 'drizzle-orm';

import { isMembershipActive } from './subscription.service';
import { db } from '../db/db';
import { customers, employees, persons } from '../db/schema';
import { NotFoundError } from '../lib/errors';
import { notDeleted } from '../lib/notDeleted';

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

  const [employee] = await db
    .select({ id: employees.id })
    .from(employees)
    .where(and(eq(employees.personId, person.id), notDeleted(employees)))
    .limit(1);

  return {
    id: person.id,
    name: person.name,
    surname: person.surname,
    email: person.email,
    phoneNumber: person.phoneNumber,
    role,
    employeeId: employee?.id ?? null,
    hasActiveMembership: isMembershipActive(customer?.subscriptionValidUntil ?? null),
    subscriptionValidUntil: customer?.subscriptionValidUntil ?? null,
  };
}
