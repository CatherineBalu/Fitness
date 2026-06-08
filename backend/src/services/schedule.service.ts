import { eq, and, gte, lte, sql, inArray } from 'drizzle-orm';

import { findCustomerByClerkId, getCustomerByClerkIdOrThrow } from './customer.service';
import { isMembershipActive } from './subscription.service';
import { db } from '../db/db';
import {
  customerReservations,
  employees,
  exerciseTypes,
  lectures,
  persons,
  rooms,
  schedules,
  scheduleInstructors,
} from '../db/schema';
import { getEmailsByClerkIds } from '../lib/clerk';
import { sendBookingConfirmationEmail, sendCancellationEmail } from '../lib/email';
import {
  DomainValidationError,
  ConflictError,
  PermissionError,
  NotFoundError,
} from '../lib/errors';
import { notDeleted } from '../lib/notDeleted';

export type ScheduleListItem = {
  id: string;
  startTime: string;
  endTime: string;
  lectureName: string;
  description: string;
  roomName: string;
  roomCapacity: number;
  exerciseType: string;
  forMembers: boolean;
  instructors: {
    name: string;
    isLead: boolean;
    phoneNumber: string | null;
    email: string | null;
  }[];
  registered: number;
  isRegistered: boolean;
};

export async function listSchedules(
  fromIso: string,
  toIso: string,
  clerkId: string | null,
): Promise<ScheduleListItem[]> {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  to.setHours(23, 59, 59, 999);

  const scheduleRows = await db
    .select({
      id: schedules.id,
      startTime: schedules.startTime,
      endTime: schedules.endTime,
      lectureName: lectures.lectureName,
      description: lectures.description,
      forMembers: lectures.forMembers,
      roomName: rooms.name,
      roomCapacity: rooms.capacity,
      exerciseType: exerciseTypes.name,
    })
    .from(schedules)
    .innerJoin(lectures, eq(schedules.lectureId, lectures.id))
    .innerJoin(rooms, eq(schedules.roomId, rooms.id))
    .innerJoin(exerciseTypes, eq(lectures.exerciseTypeId, exerciseTypes.id))
    .where(
      and(
        gte(schedules.startTime, from),
        lte(schedules.startTime, to),
        notDeleted(schedules),
        notDeleted(lectures),
        notDeleted(rooms),
        notDeleted(exerciseTypes),
      ),
    );

  if (scheduleRows.length === 0) return [];

  const scheduleIds = scheduleRows.map((s) => s.id);

  let registeredSet = new Set<string>();
  if (clerkId) {
    const customer = await findCustomerByClerkId(clerkId);
    if (customer) {
      const registered = await db
        .select({ scheduleId: customerReservations.scheduleId })
        .from(customerReservations)
        .where(
          and(
            eq(customerReservations.customerId, customer.customerId),
            inArray(customerReservations.scheduleId, scheduleIds),
            notDeleted(customerReservations),
          ),
        );
      registeredSet = new Set(registered.map((r) => r.scheduleId));
    }
  }

  const allInstructors = await db
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

  const emailByClerkId = await getEmailsByClerkIds(allInstructors.map((i) => i.clerkId));

  const allCounts = await db
    .select({
      scheduleId: customerReservations.scheduleId,
      count: sql<number>`count(*)::int`,
    })
    .from(customerReservations)
    .where(
      and(inArray(customerReservations.scheduleId, scheduleIds), notDeleted(customerReservations)),
    )
    .groupBy(customerReservations.scheduleId);

  const instructorsBySchedule = new Map<string, typeof allInstructors>();
  for (const row of allInstructors) {
    const list = instructorsBySchedule.get(row.scheduleId) ?? [];
    list.push(row);
    instructorsBySchedule.set(row.scheduleId, list);
  }

  const countBySchedule = new Map<string, number>();
  for (const row of allCounts) {
    countBySchedule.set(row.scheduleId, row.count);
  }

  return scheduleRows.map((s) => ({
    id: s.id,
    startTime: s.startTime.toISOString(),
    endTime: s.endTime.toISOString(),
    lectureName: s.lectureName,
    description: s.description,
    roomName: s.roomName,
    roomCapacity: s.roomCapacity,
    exerciseType: s.exerciseType,
    forMembers: s.forMembers,
    instructors: (instructorsBySchedule.get(s.id) ?? []).map((i) => ({
      name: `${i.name} ${i.surname}`,
      isLead: i.isLead,
      phoneNumber: i.phoneNumber,
      email: emailByClerkId.get(i.clerkId) ?? null,
    })),
    registered: countBySchedule.get(s.id) ?? 0,
    isRegistered: registeredSet.has(s.id),
  }));
}

export async function createReservation(clerkId: string, scheduleId: string): Promise<void> {
  const customer = await getCustomerByClerkIdOrThrow(clerkId);

  const [scheduleRow] = await db
    .select({
      id: schedules.id,
      startTime: schedules.startTime,
      endTime: schedules.endTime,
      forMembers: lectures.forMembers,
      lectureName: lectures.lectureName,
      roomCapacity: rooms.capacity,
      roomName: rooms.name,
    })
    .from(schedules)
    .innerJoin(lectures, eq(schedules.lectureId, lectures.id))
    .innerJoin(rooms, eq(schedules.roomId, rooms.id))
    .where(
      and(
        eq(schedules.id, scheduleId),
        notDeleted(schedules),
        notDeleted(lectures),
        notDeleted(rooms),
      ),
    )
    .limit(1);

  if (!scheduleRow) throw new NotFoundError('Lecture not found');
  if (scheduleRow.startTime < new Date()) {
    throw new DomainValidationError('Cannot register for a lecture that has already started');
  }
  if (scheduleRow.forMembers && !isMembershipActive(customer.subscriptionValidUntil)) {
    throw new PermissionError('This lecture is for members only');
  }

  const [existing] = await db
    .select({ customerId: customerReservations.customerId })
    .from(customerReservations)
    .where(
      and(
        eq(customerReservations.customerId, customer.customerId),
        eq(customerReservations.scheduleId, scheduleId),
        notDeleted(customerReservations),
      ),
    )
    .limit(1);
  if (existing) throw new ConflictError('Already registered');

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(customerReservations)
    .where(and(eq(customerReservations.scheduleId, scheduleId), notDeleted(customerReservations)));
  if (count >= scheduleRow.roomCapacity) throw new ConflictError('Lecture is full');

  await db.insert(customerReservations).values({
    customerId: customer.customerId,
    scheduleId,
  });

  void (async () => {
    try {
      await sendBookingConfirmationEmail(
        customer.email,
        customer.firstName,
        scheduleRow.lectureName,
        scheduleRow.startTime.toISOString(),
        scheduleRow.endTime.toISOString(),
        scheduleRow.roomName,
      );
    } catch (err) {
      console.error('[email] booking confirmation failed', err);
    }
  })();
}

export async function cancelReservation(clerkId: string, scheduleId: string): Promise<void> {
  const customer = await getCustomerByClerkIdOrThrow(clerkId);

  const [scheduleRow] = await db
    .select({ startTime: schedules.startTime, lectureName: lectures.lectureName })
    .from(schedules)
    .innerJoin(lectures, eq(schedules.lectureId, lectures.id))
    .where(and(eq(schedules.id, scheduleId), notDeleted(schedules), notDeleted(lectures)))
    .limit(1);

  const updated = await db
    .update(customerReservations)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(customerReservations.customerId, customer.customerId),
        eq(customerReservations.scheduleId, scheduleId),
        notDeleted(customerReservations),
      ),
    )
    .returning({ customerId: customerReservations.customerId });

  if (updated.length === 0) throw new NotFoundError('Reservation not found');

  if (scheduleRow) {
    void (async () => {
      try {
        await sendCancellationEmail(
          customer.email,
          customer.firstName,
          scheduleRow.lectureName,
          scheduleRow.startTime.toISOString(),
        );
      } catch (err) {
        console.error('[email] cancellation failed', err);
      }
    })();
  }
}
