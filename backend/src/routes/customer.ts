import { Elysia } from 'elysia';
import { desc, eq, sql } from 'drizzle-orm';
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
import { authenticated } from '../middleware/auth';

export const customerRoutes = new Elysia({ prefix: '/api/customer' })
  .use(authenticated)

  // GET /api/customer/me — profile + membership info
  .get('/me', async ({ auth, set }) => {
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
      .where(eq(tbPerson.clerkId, auth!.userId))
      .limit(1);

    if (!row) {
      set.status = 404;
      return { error: 'Customer profile not found' };
    }

    const today = new Date().toISOString().slice(0, 10);
    const isActive = !!row.subscriptionValidUntil && row.subscriptionValidUntil >= today;

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
            isActive,
          }
        : null,
    };
  })

  // DELETE /api/customer/membership — cancel membership
  .delete('/membership', async ({ auth, set }) => {
    const [customer] = await db
      .select({ id: tbCustomer.id })
      .from(tbCustomer)
      .innerJoin(tbPerson, eq(tbCustomer.personId, tbPerson.id))
      .where(eq(tbPerson.clerkId, auth!.userId))
      .limit(1);

    if (!customer) {
      set.status = 404;
      return { error: 'Customer not found' };
    }

    await db
      .update(tbCustomer)
      .set({ subscriptionId: null, subscriptionValidUntil: null })
      .where(eq(tbCustomer.id, customer.id));

    return { success: true };
  })

  // GET /api/customer/registrations — all reservations with schedule details
  .get('/registrations', async ({ auth, set }) => {
    const [customer] = await db
      .select({ id: tbCustomer.id })
      .from(tbCustomer)
      .innerJoin(tbPerson, eq(tbCustomer.personId, tbPerson.id))
      .where(eq(tbPerson.clerkId, auth!.userId))
      .limit(1);

    if (!customer) {
      set.status = 404;
      return { error: 'Customer not found' };
    }

    const rows = await db
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
      .where(eq(tbCustomerReservation.customerId, customer.id))
      .orderBy(desc(tbSchedule.startTime));

    return rows;
  })

  // GET /api/customer/spending — payment history + total
  .get('/spending', async ({ auth, set }) => {
    const [customer] = await db
      .select({ id: tbCustomer.id })
      .from(tbCustomer)
      .innerJoin(tbPerson, eq(tbCustomer.personId, tbPerson.id))
      .where(eq(tbPerson.clerkId, auth!.userId))
      .limit(1);

    if (!customer) {
      set.status = 404;
      return { error: 'Customer not found' };
    }

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
      .where(eq(tbPaymentHistory.customerId, customer.id))
      .orderBy(desc(tbPaymentHistory.paymentDate));

    const [totalRow] = await db
      .select({ total: sql<number>`coalesce(sum(${tbPaymentHistory.amount}), 0)::float` })
      .from(tbPaymentHistory)
      .where(eq(tbPaymentHistory.customerId, customer.id));

    return {
      total: totalRow.total,
      payments: payments.map((p) => ({ ...p, amount: Number(p.amount) })),
    };
  });
