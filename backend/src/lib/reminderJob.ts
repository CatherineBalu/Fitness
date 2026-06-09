import { and, eq, gte, isNull, lte, sql } from 'drizzle-orm';

import { sendReminderEmail } from './email';
import { notDeleted } from './notDeleted';
import { db } from '../db/db';
import { customerReservations, customers, lectures, persons, rooms, schedules } from '../db/schema';

export async function sendPendingReminders(): Promise<void> {
  const now = new Date();
  const from = new Date(now.getTime() + 23 * 60 * 60 * 1000);
  const to = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  let rows: {
    reservationId: string;
    email: string;
    firstName: string;
    lectureName: string;
    startTime: Date;
    endTime: Date;
    roomName: string;
  }[];

  try {
    rows = await db
      .select({
        reservationId: customerReservations.id,
        email: persons.email,
        firstName: persons.name,
        lectureName: lectures.lectureName,
        startTime: schedules.startTime,
        endTime: schedules.endTime,
        roomName: rooms.name,
      })
      .from(customerReservations)
      .innerJoin(customers, eq(customerReservations.customerId, customers.id))
      .innerJoin(persons, eq(customers.personId, persons.id))
      .innerJoin(schedules, eq(customerReservations.scheduleId, schedules.id))
      .innerJoin(lectures, eq(schedules.lectureId, lectures.id))
      .innerJoin(rooms, eq(schedules.roomId, rooms.id))
      .where(
        and(
          gte(schedules.startTime, from),
          lte(schedules.startTime, to),
          isNull(customerReservations.reminderSentAt),
          notDeleted(customerReservations),
          notDeleted(schedules),
          notDeleted(lectures),
          notDeleted(rooms),
          notDeleted(customers),
          notDeleted(persons),
        ),
      );
  } catch (err) {
    console.error('[reminder] DB query failed', err);
    return;
  }

  let sent = 0;
  for (const row of rows) {
    try {
      await sendReminderEmail(
        row.email,
        row.firstName,
        row.lectureName,
        row.startTime.toISOString(),
        row.endTime.toISOString(),
        row.roomName,
      );
      await db
        .update(customerReservations)
        .set({ reminderSentAt: sql`now()` })
        .where(eq(customerReservations.id, row.reservationId));
      sent++;
    } catch (err) {
      console.error('[email] reminder failed for', row.email, err);
    }
  }

  if (sent > 0) {
    console.log(`[reminder] sent ${sent} reminder(s)`);
  }
}

export function startReminderJob(): void {
  void sendPendingReminders();
  setInterval(() => void sendPendingReminders(), 60 * 60 * 1000);
}
