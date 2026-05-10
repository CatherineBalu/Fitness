import { eq, desc, sql } from 'drizzle-orm';
import { db } from '../db/db';
import {
  tbCustomer,
  tbCustomerReservation,
  tbLecture,
  tbPaymentHistory,
  tbPerson,
  tbRoom,
  tbSchedule,
  tbSubscription,
} from '../db/schema';
import { NotFoundError } from './errors';
import { isMembershipActive } from './subscription.service';

export type CustomerLookup = {
  customerId: string;
  personId: string;
  subscriptionValidUntil: string | null;
};

export async function findCustomerByClerkId(clerkId: string): Promise<CustomerLookup | null> {
  const [row] = await db
    .select({
      customerId: tbCustomer.id,
      personId: tbCustomer.personId,
      subscriptionValidUntil: tbCustomer.subscriptionValidUntil,
    })
    .from(tbCustomer)
    .innerJoin(tbPerson, eq(tbCustomer.personId, tbPerson.id))
    .where(eq(tbPerson.clerkId, clerkId))
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
      name: tbPerson.name,
      surname: tbPerson.surname,
      email: tbPerson.email,
      phoneNumber: tbPerson.phoneNumber,
      subscriptionValidUntil: tbCustomer.subscriptionValidUntil,
      subscriptionName: tbSubscription.name,
      subscriptionPrice: tbSubscription.price,
      subscriptionDurationDays: tbSubscription.durationDays,
    })
    .from(tbPerson)
    .innerJoin(tbCustomer, eq(tbCustomer.personId, tbPerson.id))
    .leftJoin(tbSubscription, eq(tbCustomer.subscriptionId, tbSubscription.id))
    .where(eq(tbPerson.clerkId, clerkId))
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
    .update(tbCustomer)
    .set({ subscriptionId: null, subscriptionValidUntil: null, updatedAt: new Date() })
    .where(eq(tbCustomer.id, customer.customerId));
}

export async function getCustomerRegistrations(clerkId: string) {
  const customer = await getCustomerByClerkIdOrThrow(clerkId);
  return db
    .select({
      reservationId: tbCustomerReservation.id,
      scheduleId: tbSchedule.id,
      reservationDate: tbCustomerReservation.reservationDate,
      lectureName: tbLecture.lectureName,
      startTime: tbSchedule.startTime,
      endTime: tbSchedule.endTime,
      roomName: tbRoom.name,
    })
    .from(tbCustomerReservation)
    .innerJoin(tbSchedule, eq(tbCustomerReservation.scheduleId, tbSchedule.id))
    .innerJoin(tbLecture, eq(tbSchedule.lectureId, tbLecture.id))
    .innerJoin(tbRoom, eq(tbSchedule.roomId, tbRoom.id))
    .where(eq(tbCustomerReservation.customerId, customer.customerId))
    .orderBy(desc(tbSchedule.startTime));
}

export async function getCustomerSpending(clerkId: string) {
  const customer = await getCustomerByClerkIdOrThrow(clerkId);

  const payments = await db
    .select({
      id: tbPaymentHistory.id,
      subscriptionName: tbSubscription.name,
      amount: tbPaymentHistory.amount,
      paymentDate: tbPaymentHistory.paymentDate,
      paymentMethod: tbPaymentHistory.paymentMethod,
    })
    .from(tbPaymentHistory)
    .innerJoin(tbSubscription, eq(tbPaymentHistory.subscriptionId, tbSubscription.id))
    .where(eq(tbPaymentHistory.customerId, customer.customerId))
    .orderBy(desc(tbPaymentHistory.paymentDate));

  const [totalRow] = await db
    .select({ total: sql<number>`coalesce(sum(${tbPaymentHistory.amount}), 0)::float` })
    .from(tbPaymentHistory)
    .where(eq(tbPaymentHistory.customerId, customer.customerId));

  return {
    total: totalRow.total,
    payments: payments.map((p) => ({ ...p, amount: Number(p.amount) })),
  };
}

export async function findCustomerByEmail(email: string) {
  const [row] = await db
    .select({
      customerId: tbCustomer.id,
      personId: tbPerson.id,
      name: tbPerson.name,
      surname: tbPerson.surname,
      email: tbPerson.email,
    })
    .from(tbPerson)
    .innerJoin(tbCustomer, eq(tbCustomer.personId, tbPerson.id))
    .where(eq(tbPerson.email, email))
    .limit(1);
  return row ?? null;
}

export async function findCustomerByPersonId(personId: string) {
  const [row] = await db
    .select({ id: tbCustomer.id })
    .from(tbCustomer)
    .where(eq(tbCustomer.personId, personId))
    .limit(1);
  return row ?? null;
}
