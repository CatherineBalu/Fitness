import { eq, and, asc, lt, gt, ne, inArray } from 'drizzle-orm';

import { findCustomerByEmail, findCustomerByPersonId } from './customer.service';
import { db } from '../db/db';
import {
  customers,
  customerReservations,
  employees,
  exerciseTypes,
  lectures,
  persons,
  rooms,
  schedules,
  scheduleInstructors,
} from '../db/schema';
import { sendBookingConfirmationEmail, sendCancellationEmail } from '../lib/email';
import { ConflictError, DomainValidationError, NotFoundError } from '../lib/errors';
import { notDeleted } from '../lib/notDeleted';

export interface CreateScheduleInput {
  lectureId: string;
  roomId: string;
  startTime: string;
  endTime: string;
  instructors?: { employeeId: string; isLead: boolean }[];
}

// Reject double-booking: a room or any assigned instructor must not already be
// busy in an overlapping [start, end) window. `excludeScheduleId` skips the row
// being edited so a lecture never conflicts with itself.
async function assertNoOverlap(
  roomId: string,
  instructorIds: string[],
  start: Date,
  end: Date,
  excludeScheduleId?: string,
): Promise<void> {
  const overlaps = and(
    lt(schedules.startTime, end),
    gt(schedules.endTime, start),
    notDeleted(schedules),
    ...(excludeScheduleId ? [ne(schedules.id, excludeScheduleId)] : []),
  );

  const [roomClash] = await db
    .select({ id: schedules.id })
    .from(schedules)
    .where(and(eq(schedules.roomId, roomId), overlaps))
    .limit(1);
  if (roomClash) {
    throw new ConflictError('Room is already booked for an overlapping time.');
  }

  if (instructorIds.length > 0) {
    const [instructorClash] = await db
      .select({ id: schedules.id })
      .from(schedules)
      .innerJoin(scheduleInstructors, eq(scheduleInstructors.scheduleId, schedules.id))
      .where(
        and(
          inArray(scheduleInstructors.employeeId, instructorIds),
          notDeleted(scheduleInstructors),
          overlaps,
        ),
      )
      .limit(1);
    if (instructorClash) {
      throw new ConflictError('An instructor is already booked for an overlapping time.');
    }
  }
}

export async function listLectureTemplates() {
  return db
    .select({
      id: lectures.id,
      lectureName: lectures.lectureName,
      exerciseType: exerciseTypes.name,
    })
    .from(lectures)
    .innerJoin(exerciseTypes, eq(lectures.exerciseTypeId, exerciseTypes.id))
    .where(and(notDeleted(lectures), notDeleted(exerciseTypes)))
    .orderBy(lectures.lectureName);
}

export async function listRooms() {
  return db
    .select({ id: rooms.id, name: rooms.name, capacity: rooms.capacity })
    .from(rooms)
    .where(notDeleted(rooms))
    .orderBy(rooms.name);
}

export async function listInstructors() {
  const rows = await db
    .select({
      id: employees.id,
      name: persons.name,
      surname: persons.surname,
    })
    .from(employees)
    .innerJoin(persons, eq(employees.personId, persons.id))
    .where(and(notDeleted(employees), notDeleted(persons)))
    .orderBy(persons.surname);

  return rows.map((i) => ({ id: i.id, name: `${i.name} ${i.surname}` }));
}

export async function createSchedule(input: CreateScheduleInput): Promise<{ id: string }> {
  const { lectureId, roomId, startTime, endTime, instructors } = input;
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (end <= start) {
    throw new DomainValidationError('End time must be after start time.');
  }
  await assertNoOverlap(roomId, instructors?.map((i) => i.employeeId) ?? [], start, end);

  return db.transaction(async (tx) => {
    const [schedule] = await tx
      .insert(schedules)
      .values({
        lectureId,
        roomId,
        startTime: start,
        endTime: end,
      })
      .returning();

    if (instructors && instructors.length > 0) {
      await tx.insert(scheduleInstructors).values(
        instructors.map((inst) => ({
          scheduleId: schedule.id,
          employeeId: inst.employeeId,
          isLead: inst.isLead,
        })),
      );
    }

    return { id: schedule.id };
  });
}

export async function listScheduleMembers(scheduleId: string) {
  const rows = await db
    .select({
      id: persons.id,
      name: persons.name,
      surname: persons.surname,
      email: persons.email,
      attended: customerReservations.attended,
    })
    .from(customerReservations)
    .innerJoin(customers, eq(customerReservations.customerId, customers.id))
    .innerJoin(persons, eq(customers.personId, persons.id))
    .where(
      and(
        eq(customerReservations.scheduleId, scheduleId),
        notDeleted(customerReservations),
        notDeleted(customers),
        notDeleted(persons),
      ),
    )
    .orderBy(asc(persons.surname));

  return rows.map((m) => ({
    id: m.id,
    name: `${m.name} ${m.surname}`,
    email: m.email,
    attended: m.attended,
  }));
}

export async function addMemberByEmail(scheduleId: string, email: string) {
  const customer = await findCustomerByEmail(email);
  if (!customer) {
    const [person] = await db
      .select({ id: persons.id })
      .from(persons)
      .where(and(eq(persons.email, email), notDeleted(persons)))
      .limit(1);
    if (!person) throw new NotFoundError('Person with this email does not exist.');
    throw new DomainValidationError('This person is not a registered customer.');
  }

  const [existing] = await db
    .select({ id: customerReservations.id })
    .from(customerReservations)
    .where(
      and(
        eq(customerReservations.scheduleId, scheduleId),
        eq(customerReservations.customerId, customer.customerId),
        notDeleted(customerReservations),
      ),
    );
  if (existing) throw new ConflictError('Customer is already registered for this lecture.');

  const [scheduleRow] = await db
    .select({
      lectureName: lectures.lectureName,
      startTime: schedules.startTime,
      endTime: schedules.endTime,
      roomName: rooms.name,
    })
    .from(schedules)
    .innerJoin(lectures, eq(schedules.lectureId, lectures.id))
    .innerJoin(rooms, eq(schedules.roomId, rooms.id))
    .where(and(eq(schedules.id, scheduleId), notDeleted(schedules)))
    .limit(1);

  await db.insert(customerReservations).values({
    scheduleId,
    customerId: customer.customerId,
  });

  if (scheduleRow) {
    void (async () => {
      try {
        await sendBookingConfirmationEmail(
          customer.email,
          customer.name,
          scheduleRow.lectureName,
          scheduleRow.startTime.toISOString(),
          scheduleRow.endTime.toISOString(),
          scheduleRow.roomName,
        );
      } catch (err) {
        console.error('[email] admin booking confirmation failed', err);
      }
    })();
  }

  return {
    id: customer.personId,
    name: `${customer.name} ${customer.surname}`,
    email: customer.email,
  };
}

export async function removeMember(scheduleId: string, personId: string): Promise<void> {
  const customer = await findCustomerByPersonId(personId);
  if (!customer) throw new NotFoundError('Customer not found.');

  const [[personRow], [scheduleRow]] = await Promise.all([
    db
      .select({ name: persons.name, email: persons.email })
      .from(persons)
      .where(and(eq(persons.id, personId), notDeleted(persons)))
      .limit(1),
    db
      .select({ lectureName: lectures.lectureName, startTime: schedules.startTime })
      .from(schedules)
      .innerJoin(lectures, eq(schedules.lectureId, lectures.id))
      .where(and(eq(schedules.id, scheduleId), notDeleted(schedules)))
      .limit(1),
  ]);

  await db
    .update(customerReservations)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(customerReservations.scheduleId, scheduleId),
        eq(customerReservations.customerId, customer.id),
        notDeleted(customerReservations),
      ),
    );

  if (personRow && scheduleRow) {
    void (async () => {
      try {
        await sendCancellationEmail(
          personRow.email,
          personRow.name,
          scheduleRow.lectureName,
          scheduleRow.startTime.toISOString(),
        );
      } catch (err) {
        console.error('[email] admin cancellation failed', err);
      }
    })();
  }
}

export async function deleteSchedule(scheduleId: string): Promise<void> {
  const [scheduleRow] = await db
    .select({ lectureName: lectures.lectureName, startTime: schedules.startTime })
    .from(schedules)
    .innerJoin(lectures, eq(schedules.lectureId, lectures.id))
    .where(and(eq(schedules.id, scheduleId), notDeleted(schedules)))
    .limit(1);

  if (!scheduleRow) throw new NotFoundError('Schedule not found.');

  // Collect registered customers before the soft-delete so we can notify them.
  const registered = await db
    .select({ name: persons.name, email: persons.email })
    .from(customerReservations)
    .innerJoin(customers, eq(customerReservations.customerId, customers.id))
    .innerJoin(persons, eq(customers.personId, persons.id))
    .where(
      and(
        eq(customerReservations.scheduleId, scheduleId),
        notDeleted(customerReservations),
        notDeleted(customers),
        notDeleted(persons),
      ),
    );

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(schedules)
      .set({ deletedAt: now, updatedAt: now })
      .where(eq(schedules.id, scheduleId));
    await tx
      .update(customerReservations)
      .set({ deletedAt: now, updatedAt: now })
      .where(
        and(eq(customerReservations.scheduleId, scheduleId), notDeleted(customerReservations)),
      );
    await tx
      .update(scheduleInstructors)
      .set({ deletedAt: now, updatedAt: now })
      .where(and(eq(scheduleInstructors.scheduleId, scheduleId), notDeleted(scheduleInstructors)));
  });

  // Notify registered customers, but only for lectures that haven't happened yet.
  if (scheduleRow.startTime > now) {
    for (const member of registered) {
      void (async () => {
        try {
          await sendCancellationEmail(
            member.email,
            member.name,
            scheduleRow.lectureName,
            scheduleRow.startTime.toISOString(),
          );
        } catch (err) {
          console.error('[email] lecture cancellation failed', err);
        }
      })();
    }
  }
}

export async function updateSchedule(
  scheduleId: string,
  patch: { roomId?: string; startTime?: string; endTime?: string },
): Promise<void> {
  const [current] = await db
    .select({
      id: schedules.id,
      roomId: schedules.roomId,
      startTime: schedules.startTime,
      endTime: schedules.endTime,
    })
    .from(schedules)
    .where(and(eq(schedules.id, scheduleId), notDeleted(schedules)));

  if (!current) throw new NotFoundError('Schedule not found.');

  // startTime/endTime arrive as full ISO datetimes, so editing the date moves
  // the lecture to another day (not just its time within the original day).
  const newStartDate = patch.startTime ? new Date(patch.startTime) : new Date(current.startTime);
  const newEndDate = patch.endTime ? new Date(patch.endTime) : new Date(current.endTime);
  const newRoomId = patch.roomId ?? current.roomId;

  if (newEndDate <= newStartDate) {
    throw new DomainValidationError('End time must be after start time.');
  }

  const instructorRows = await db
    .select({ employeeId: scheduleInstructors.employeeId })
    .from(scheduleInstructors)
    .where(and(eq(scheduleInstructors.scheduleId, scheduleId), notDeleted(scheduleInstructors)));
  await assertNoOverlap(
    newRoomId,
    instructorRows.map((r) => r.employeeId),
    newStartDate,
    newEndDate,
    scheduleId,
  );

  await db
    .update(schedules)
    .set({
      roomId: newRoomId,
      startTime: newStartDate,
      endTime: newEndDate,
      updatedAt: new Date(),
    })
    .where(eq(schedules.id, scheduleId));
}

export async function bulkUpdateAttendance(
  scheduleId: string,
  records: { personId: string; attended: boolean }[],
): Promise<void> {
  await db.transaction(async (tx) => {
    for (const record of records) {
      const customer = await findCustomerByPersonId(record.personId);
      if (customer) {
        await tx
          .update(customerReservations)
          .set({ attended: record.attended, updatedAt: new Date() })
          .where(
            and(
              eq(customerReservations.scheduleId, scheduleId),
              eq(customerReservations.customerId, customer.id),
            ),
          );
      }
    }
  });
}
