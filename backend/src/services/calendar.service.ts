import { eq, and, asc } from 'drizzle-orm';
import { z } from 'zod';
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
import { ConflictError, DomainValidationError, NotFoundError } from '../lib/errors';
import { findCustomerByEmail, findCustomerByPersonId } from './customer.service';

const createScheduleSchema = z
  .object({
    lectureId: z.string().uuid('lectureId must be a valid UUID'),
    roomId: z.string().uuid('roomId must be a valid UUID'),
    startTime: z.iso.datetime('startTime must be a valid ISO datetime'),
    endTime: z.iso.datetime('endTime must be a valid ISO datetime'),
    instructors: z
      .array(
        z.object({
          employeeId: z.string().uuid('employeeId must be a valid UUID'),
          isLead: z.boolean(),
        }),
      )
      .optional(),
  })
  .refine((d) => new Date(d.endTime) > new Date(d.startTime), {
    message: 'End time must be after start time',
    path: ['endTime'],
  });

export type CreateScheduleInput = z.input<typeof createScheduleSchema>;

export async function listLectureTemplates() {
  return db
    .select({
      id: lectures.id,
      lectureName: lectures.lectureName,
      exerciseType: exerciseTypes.name,
    })
    .from(lectures)
    .innerJoin(exerciseTypes, eq(lectures.exerciseTypeId, exerciseTypes.id))
    .orderBy(lectures.lectureName);
}

export async function listRooms() {
  return db
    .select({ id: rooms.id, name: rooms.name, capacity: rooms.capacity })
    .from(rooms)
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
    .orderBy(persons.surname);

  return rows.map((i) => ({ id: i.id, name: `${i.name} ${i.surname}` }));
}

export async function createSchedule(input: CreateScheduleInput): Promise<{ id: string }> {
  const result = createScheduleSchema.safeParse(input);
  if (!result.success) {
    throw new DomainValidationError('Validation failed', result.error.flatten().fieldErrors);
  }
  const { lectureId, roomId, startTime, endTime, instructors } = result.data;

  return db.transaction(async (tx) => {
    const [schedule] = await tx
      .insert(schedules)
      .values({
        lectureId,
        roomId,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
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
    .where(eq(customerReservations.scheduleId, scheduleId))
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
      .where(eq(persons.email, email))
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
      ),
    );
  if (existing) throw new ConflictError('Customer is already registered for this lecture.');

  await db.insert(customerReservations).values({
    scheduleId,
    customerId: customer.customerId,
  });

  return {
    id: customer.personId,
    name: `${customer.name} ${customer.surname}`,
    email: customer.email,
  };
}

export async function removeMember(scheduleId: string, personId: string): Promise<void> {
  const customer = await findCustomerByPersonId(personId);
  if (!customer) throw new NotFoundError('Customer not found.');

  await db
    .delete(customerReservations)
    .where(
      and(
        eq(customerReservations.scheduleId, scheduleId),
        eq(customerReservations.customerId, customer.id),
      ),
    );
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
    .where(eq(schedules.id, scheduleId));

  if (!current) throw new NotFoundError('Schedule not found.');

  const newStartDate = new Date(current.startTime);
  const newEndDate = new Date(current.endTime);

  if (patch.startTime) {
    const [hours, minutes] = patch.startTime.split(':');
    newStartDate.setUTCHours(parseInt(hours), parseInt(minutes), 0, 0);
  }
  if (patch.endTime) {
    const [hours, minutes] = patch.endTime.split(':');
    newEndDate.setUTCHours(parseInt(hours), parseInt(minutes), 0, 0);
  }

  await db
    .update(schedules)
    .set({
      roomId: patch.roomId ?? current.roomId,
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
