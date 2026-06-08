import { and, eq, desc, inArray, sql } from 'drizzle-orm';

import { isMembershipActive } from './subscription.service';
import { db } from '../db/db';
import {
  customers,
  customerReservations,
  employees,
  lectures,
  paymentHistory,
  persons,
  rooms,
  schedules,
  scheduleInstructors,
  subscriptions,
} from '../db/schema';
import { getEmailsByClerkIds } from '../lib/clerk';
import { NotFoundError } from '../lib/errors';
import { notDeleted } from '../lib/notDeleted';

export type CustomerLookup = {
  customerId: string;
  personId: string;
  email: string;
  firstName: string;
  subscriptionValidUntil: string | null;
};

export async function findCustomerByClerkId(clerkId: string): Promise<CustomerLookup | null> {
  const [row] = await db
    .select({
      customerId: customers.id,
      personId: customers.personId,
      email: persons.email,
      firstName: persons.name,
      subscriptionValidUntil: customers.subscriptionValidUntil,
    })
    .from(customers)
    .innerJoin(persons, eq(customers.personId, persons.id))
    .where(and(eq(persons.clerkId, clerkId), notDeleted(customers), notDeleted(persons)))
    .limit(1);
  return row ?? null;
}

export async function getCustomerByClerkIdOrThrow(clerkId: string): Promise<CustomerLookup> {
  const customer = await findCustomerByClerkId(clerkId);
  if (!customer) throw new NotFoundError('Customer profile not found');
  return customer;
}

export async function getCustomerProfile(clerkId: string) {
  const [row] = await db
    .select({
      name: persons.name,
      surname: persons.surname,
      email: persons.email,
      phoneNumber: persons.phoneNumber,
      subscriptionValidUntil: customers.subscriptionValidUntil,
      subscriptionName: subscriptions.name,
      subscriptionPrice: subscriptions.price,
      subscriptionDurationDays: subscriptions.durationDays,
    })
    .from(persons)
    .innerJoin(customers, eq(customers.personId, persons.id))
    .leftJoin(
      subscriptions,
      and(eq(customers.subscriptionId, subscriptions.id), notDeleted(subscriptions)),
    )
    .where(and(eq(persons.clerkId, clerkId), notDeleted(persons), notDeleted(customers)))
    .limit(1);

  if (!row) throw new NotFoundError('Customer profile not found');

  return {
    name: row.name,
    surname: row.surname,
    email: row.email,
    phoneNumber: row.phoneNumber,
    membership: row.subscriptionName
      ? {
          name: row.subscriptionName,
          price: Number(row.subscriptionPrice),
          durationDays: row.subscriptionDurationDays,
          validUntil: row.subscriptionValidUntil,
          isActive: isMembershipActive(row.subscriptionValidUntil),
        }
      : null,
  };
}

export async function cancelMembership(clerkId: string): Promise<void> {
  const customer = await getCustomerByClerkIdOrThrow(clerkId);
  await db
    .update(customers)
    .set({ subscriptionId: null, subscriptionValidUntil: null, updatedAt: new Date() })
    .where(eq(customers.id, customer.customerId));
}

export async function getCustomerRegistrations(clerkId: string) {
  const customer = await getCustomerByClerkIdOrThrow(clerkId);
  const rows = await db
    .select({
      reservationId: customerReservations.id,
      scheduleId: schedules.id,
      reservationDate: customerReservations.reservationDate,
      lectureName: lectures.lectureName,
      startTime: schedules.startTime,
      endTime: schedules.endTime,
      roomName: rooms.name,
    })
    .from(customerReservations)
    .innerJoin(schedules, eq(customerReservations.scheduleId, schedules.id))
    .innerJoin(lectures, eq(schedules.lectureId, lectures.id))
    .innerJoin(rooms, eq(schedules.roomId, rooms.id))
    .where(
      and(
        eq(customerReservations.customerId, customer.customerId),
        notDeleted(customerReservations),
        notDeleted(schedules),
        notDeleted(lectures),
        notDeleted(rooms),
      ),
    )
    .orderBy(desc(schedules.startTime));

  if (rows.length === 0) return [];

  const scheduleIds = rows.map((r) => r.scheduleId);
  const instructorRows = await db
    .select({
      scheduleId: scheduleInstructors.scheduleId,
      name: persons.name,
      surname: persons.surname,
      phoneNumber: persons.phoneNumber,
      clerkId: persons.clerkId,
      isLead: scheduleInstructors.isLead,
    })
    .from(scheduleInstructors)
    .innerJoin(employees, eq(scheduleInstructors.employeeId, employees.id))
    .innerJoin(persons, eq(employees.personId, persons.id))
    .where(
      and(
        inArray(scheduleInstructors.scheduleId, scheduleIds),
        notDeleted(scheduleInstructors),
        notDeleted(employees),
        notDeleted(persons),
      ),
    );

  const emailByClerkId = await getEmailsByClerkIds(instructorRows.map((i) => i.clerkId));

  const instructorsBySchedule = new Map<
    string,
    { name: string; phoneNumber: string | null; email: string | null; isLead: boolean }[]
  >();
  for (const i of instructorRows) {
    const list = instructorsBySchedule.get(i.scheduleId) ?? [];
    list.push({
      name: `${i.name} ${i.surname}`,
      phoneNumber: i.phoneNumber,
      email: emailByClerkId.get(i.clerkId) ?? null,
      isLead: i.isLead,
    });
    instructorsBySchedule.set(i.scheduleId, list);
  }

  return rows.map((r) => ({
    ...r,
    instructors: instructorsBySchedule.get(r.scheduleId) ?? [],
  }));
}

export async function getCustomerSpending(clerkId: string) {
  const customer = await getCustomerByClerkIdOrThrow(clerkId);

  const payments = await db
    .select({
      id: paymentHistory.id,
      subscriptionName: subscriptions.name,
      amount: paymentHistory.amount,
      paymentDate: paymentHistory.paymentDate,
      paymentMethod: paymentHistory.paymentMethod,
    })
    .from(paymentHistory)
    .innerJoin(subscriptions, eq(paymentHistory.subscriptionId, subscriptions.id))
    .where(
      and(
        eq(paymentHistory.customerId, customer.customerId),
        notDeleted(paymentHistory),
        notDeleted(subscriptions),
      ),
    )
    .orderBy(desc(paymentHistory.paymentDate));

  const [totalRow] = await db
    .select({ total: sql<number>`coalesce(sum(${paymentHistory.amount}), 0)::float` })
    .from(paymentHistory)
    .where(and(eq(paymentHistory.customerId, customer.customerId), notDeleted(paymentHistory)));

  return {
    total: totalRow.total,
    payments: payments.map((p) => ({ ...p, amount: Number(p.amount) })),
  };
}

export async function findCustomerByEmail(email: string) {
  const [row] = await db
    .select({
      customerId: customers.id,
      personId: persons.id,
      name: persons.name,
      surname: persons.surname,
      email: persons.email,
    })
    .from(persons)
    .innerJoin(customers, eq(customers.personId, persons.id))
    .where(and(eq(persons.email, email), notDeleted(persons), notDeleted(customers)))
    .limit(1);
  return row ?? null;
}

export async function findCustomerByPersonId(personId: string) {
  const [row] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(and(eq(customers.personId, personId), notDeleted(customers)))
    .limit(1);
  return row ?? null;
}
