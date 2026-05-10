import { eq, and, gte, lte, sql, inArray } from 'drizzle-orm';
import { db } from '../db/db';
import {
  tbCustomerReservation,
  tbEmployee,
  tbExerciseType,
  tbLecture,
  tbPerson,
  tbRoom,
  tbSchedule,
  tbScheduleInstructor,
} from '../db/schema';
import {
  DomainValidationError,
  ConflictError,
  PermissionError,
  NotFoundError,
} from '../lib/errors';
import { findCustomerByClerkId, getCustomerByClerkIdOrThrow } from './customer.service';
import { isMembershipActive } from './subscription.service';

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
  instructors: { name: string; isLead: boolean }[];
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

  const schedules = await db
    .select({
      id: tbSchedule.id,
      startTime: tbSchedule.startTime,
      endTime: tbSchedule.endTime,
      lectureName: tbLecture.lectureName,
      description: tbLecture.description,
      forMembers: tbLecture.forMembers,
      roomName: tbRoom.name,
      roomCapacity: tbRoom.capacity,
      exerciseType: tbExerciseType.name,
    })
    .from(tbSchedule)
    .innerJoin(tbLecture, eq(tbSchedule.lectureId, tbLecture.id))
    .innerJoin(tbRoom, eq(tbSchedule.roomId, tbRoom.id))
    .innerJoin(tbExerciseType, eq(tbLecture.exerciseTypeId, tbExerciseType.id))
    .where(and(gte(tbSchedule.startTime, from), lte(tbSchedule.startTime, to)));

  if (schedules.length === 0) return [];

  const scheduleIds = schedules.map((s) => s.id);

  let registeredSet = new Set<string>();
  if (clerkId) {
    const customer = await findCustomerByClerkId(clerkId);
    if (customer) {
      const registered = await db
        .select({ scheduleId: tbCustomerReservation.scheduleId })
        .from(tbCustomerReservation)
        .where(
          and(
            eq(tbCustomerReservation.customerId, customer.customerId),
            inArray(tbCustomerReservation.scheduleId, scheduleIds),
          ),
        );
      registeredSet = new Set(registered.map((r) => r.scheduleId));
    }
  }

  const allInstructors = await db
    .select({
      scheduleId: tbScheduleInstructor.scheduleId,
      name: tbPerson.name,
      surname: tbPerson.surname,
      isLead: tbScheduleInstructor.isLead,
    })
    .from(tbScheduleInstructor)
    .innerJoin(tbEmployee, eq(tbScheduleInstructor.employeeId, tbEmployee.id))
    .innerJoin(tbPerson, eq(tbEmployee.personId, tbPerson.id))
    .where(inArray(tbScheduleInstructor.scheduleId, scheduleIds));

  const allCounts = await db
    .select({
      scheduleId: tbCustomerReservation.scheduleId,
      count: sql<number>`count(*)::int`,
    })
    .from(tbCustomerReservation)
    .where(inArray(tbCustomerReservation.scheduleId, scheduleIds))
    .groupBy(tbCustomerReservation.scheduleId);

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

  return schedules.map((s) => ({
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
    })),
    registered: countBySchedule.get(s.id) ?? 0,
    isRegistered: registeredSet.has(s.id),
  }));
}

export async function createReservation(clerkId: string, scheduleId: string): Promise<void> {
  const customer = await getCustomerByClerkIdOrThrow(clerkId);

  const [schedule] = await db
    .select({
      id: tbSchedule.id,
      startTime: tbSchedule.startTime,
      forMembers: tbLecture.forMembers,
      roomCapacity: tbRoom.capacity,
    })
    .from(tbSchedule)
    .innerJoin(tbLecture, eq(tbSchedule.lectureId, tbLecture.id))
    .innerJoin(tbRoom, eq(tbSchedule.roomId, tbRoom.id))
    .where(eq(tbSchedule.id, scheduleId))
    .limit(1);

  if (!schedule) throw new NotFoundError('Lecture not found');
  if (schedule.startTime < new Date()) {
    throw new DomainValidationError('Cannot register for a lecture that has already started');
  }
  if (schedule.forMembers && !isMembershipActive(customer.subscriptionValidUntil)) {
    throw new PermissionError('This lecture is for members only');
  }

  const [existing] = await db
    .select({ customerId: tbCustomerReservation.customerId })
    .from(tbCustomerReservation)
    .where(
      and(
        eq(tbCustomerReservation.customerId, customer.customerId),
        eq(tbCustomerReservation.scheduleId, scheduleId),
      ),
    )
    .limit(1);
  if (existing) throw new ConflictError('Already registered');

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tbCustomerReservation)
    .where(eq(tbCustomerReservation.scheduleId, scheduleId));
  if (count >= schedule.roomCapacity) throw new ConflictError('Lecture is full');

  await db.insert(tbCustomerReservation).values({
    customerId: customer.customerId,
    scheduleId,
  });
}

export async function cancelReservation(clerkId: string, scheduleId: string): Promise<void> {
  const customer = await getCustomerByClerkIdOrThrow(clerkId);

  const deleted = await db
    .delete(tbCustomerReservation)
    .where(
      and(
        eq(tbCustomerReservation.customerId, customer.customerId),
        eq(tbCustomerReservation.scheduleId, scheduleId),
      ),
    )
    .returning({ customerId: tbCustomerReservation.customerId });

  if (deleted.length === 0) throw new NotFoundError('Reservation not found');
}
