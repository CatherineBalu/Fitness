import { and, asc, eq, inArray, sql } from 'drizzle-orm';

import { db } from '../db/db';
import {
  customers,
  customerReservations,
  employees,
  employeeSpecializations,
  employeeTypes,
  exerciseTypes,
  lectures,
  persons,
  rooms,
  schedules,
  scheduleInstructors,
} from '../db/schema';
import { sendTempPasswordEmail } from '../lib/email';
import { DomainValidationError, NotFoundError } from '../lib/errors';
import { notDeleted } from '../lib/notDeleted';
import { clerk } from '../middleware/auth';

function generateTempPassword(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return `${Buffer.from(bytes).toString('base64url').slice(0, 14)}A1!`;
}

export type CreateStaffInput = {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  specializations?: string[];
};

export type UpdateStaffInput = {
  firstName: string;
  lastName: string;
  specializations?: string[];
};

export async function listEmployees() {
  const rows = await db
    .select({
      id: employees.id,
      firstName: persons.name,
      lastName: persons.surname,
      email: persons.email,
      clerkId: persons.clerkId,
      role: employeeTypes.roleName,
      since: employees.hireDate,
    })
    .from(employees)
    .innerJoin(persons, eq(employees.personId, persons.id))
    .innerJoin(employeeTypes, eq(employees.employeeTypeId, employeeTypes.id))
    .where(and(notDeleted(employees), notDeleted(persons), notDeleted(employeeTypes)))
    .orderBy(asc(persons.surname));

  const specRows = await db
    .select({
      employeeId: employeeSpecializations.employeeId,
      name: exerciseTypes.name,
    })
    .from(employeeSpecializations)
    .innerJoin(exerciseTypes, eq(employeeSpecializations.exerciseTypeId, exerciseTypes.id))
    .where(and(notDeleted(employeeSpecializations), notDeleted(exerciseTypes)));

  const byEmployee = new Map<string, string[]>();
  for (const r of specRows) {
    const list = byEmployee.get(r.employeeId) ?? [];
    list.push(r.name);
    byEmployee.set(r.employeeId, list);
  }

  return rows.map((r) => ({
    ...r,
    specializations: byEmployee.get(r.id) ?? [],
  }));
}

export async function getEmployeeLectures(employeeId: string) {
  const rows = await db
    .select({
      id: schedules.id,
      lectureName: lectures.lectureName,
      startTime: schedules.startTime,
      endTime: schedules.endTime,
      roomName: rooms.name,
      capacity: rooms.capacity,
    })
    .from(scheduleInstructors)
    .innerJoin(schedules, eq(scheduleInstructors.scheduleId, schedules.id))
    .innerJoin(lectures, eq(schedules.lectureId, lectures.id))
    .innerJoin(rooms, eq(schedules.roomId, rooms.id))
    .where(
      and(
        eq(scheduleInstructors.employeeId, employeeId),
        notDeleted(scheduleInstructors),
        notDeleted(schedules),
        notDeleted(lectures),
        notDeleted(rooms),
      ),
    )
    .orderBy(asc(schedules.startTime));

  if (rows.length === 0) return [];

  const countRows = await db
    .select({
      scheduleId: customerReservations.scheduleId,
      count: sql<number>`count(*)::int`,
    })
    .from(customerReservations)
    .where(
      and(
        inArray(
          customerReservations.scheduleId,
          rows.map((r) => r.id),
        ),
        notDeleted(customerReservations),
      ),
    )
    .groupBy(customerReservations.scheduleId);

  const countBySchedule = new Map(countRows.map((r) => [r.scheduleId, r.count]));

  return rows.map((r) => ({
    id: r.id,
    name: r.lectureName,
    startTime: r.startTime.toISOString(),
    endTime: r.endTime.toISOString(),
    room: r.roomName,
    capacity: r.capacity,
    registered: countBySchedule.get(r.id) ?? 0,
  }));
}

export async function getEmployeeLecturesForClerkUser(clerkId: string) {
  const [employee] = await db
    .select({ id: employees.id })
    .from(employees)
    .innerJoin(persons, eq(employees.personId, persons.id))
    .where(and(eq(persons.clerkId, clerkId), notDeleted(employees), notDeleted(persons)))
    .limit(1);

  if (!employee) throw new NotFoundError('Staff profile not found');
  return getEmployeeLectures(employee.id);
}

export async function createStaff(input: CreateStaffInput): Promise<void> {
  const [roleRow] = await db
    .select()
    .from(employeeTypes)
    .where(and(eq(employeeTypes.roleName, input.role), notDeleted(employeeTypes)))
    .limit(1);

  if (!roleRow) throw new DomainValidationError(`Unknown role: ${input.role}`);

  const tempPassword = generateTempPassword();

  let clerkUser: Awaited<ReturnType<typeof clerk.users.createUser>>;
  try {
    clerkUser = await clerk.users.createUser({
      emailAddress: [input.email],
      firstName: input.firstName,
      lastName: input.lastName,
      password: tempPassword,
      publicMetadata: { role: 'employee' },
    });
  } catch (err: unknown) {
    const clerkErr = err as { errors?: Array<{ longMessage?: string; message?: string }> };
    const message =
      clerkErr.errors?.[0]?.longMessage ??
      clerkErr.errors?.[0]?.message ??
      (err instanceof Error ? err.message : 'Failed to create user');
    throw new DomainValidationError(message);
  }

  const today = new Date().toISOString().slice(0, 10);

  try {
    await db.transaction(async (tx) => {
      const [person] = await tx
        .insert(persons)
        .values({
          clerkId: clerkUser.id,
          name: input.firstName,
          surname: input.lastName,
          email: input.email,
        })
        .returning();

      const [employee] = await tx
        .insert(employees)
        .values({
          personId: person.id,
          employeeTypeId: roleRow.id,
          hireDate: today,
        })
        .returning();

      if (
        roleRow.roleName === 'Instructor' &&
        input.specializations &&
        input.specializations.length > 0
      ) {
        await tx.insert(employeeSpecializations).values(
          input.specializations.map((exerciseTypeId) => ({
            employeeId: employee.id,
            exerciseTypeId,
          })),
        );
      }
    });
  } catch (err) {
    await clerk.users.deleteUser(clerkUser.id).catch(() => {});
    console.error('[staff] Failed to save staff member', err);
    throw new Error('Failed to save staff member to database', { cause: err });
  }

  await sendTempPasswordEmail(input.email, input.firstName, tempPassword);
}

export async function updateStaff(employeeId: string, input: UpdateStaffInput): Promise<void> {
  const [employee] = await db
    .select({
      employeeId: employees.id,
      personId: persons.id,
      clerkId: persons.clerkId,
      role: employeeTypes.roleName,
    })
    .from(employees)
    .innerJoin(persons, eq(employees.personId, persons.id))
    .innerJoin(employeeTypes, eq(employees.employeeTypeId, employeeTypes.id))
    .where(
      and(
        eq(employees.id, employeeId),
        notDeleted(employees),
        notDeleted(persons),
        notDeleted(employeeTypes),
      ),
    )
    .limit(1);

  if (!employee) throw new NotFoundError('Staff member not found');

  await clerk.users
    .updateUser(employee.clerkId, {
      firstName: input.firstName,
      lastName: input.lastName,
    })
    .catch(() => {});

  await db
    .update(persons)
    .set({ name: input.firstName, surname: input.lastName, updatedAt: new Date() })
    .where(eq(persons.id, employee.personId));

  if (employee.role === 'Instructor' && input.specializations) {
    const now = new Date();
    await db
      .update(employeeSpecializations)
      .set({ deletedAt: now, updatedAt: now })
      .where(
        and(
          eq(employeeSpecializations.employeeId, employee.employeeId),
          notDeleted(employeeSpecializations),
        ),
      );
    if (input.specializations.length > 0) {
      await db
        .insert(employeeSpecializations)
        .values(
          input.specializations.map((exerciseTypeId) => ({
            employeeId: employee.employeeId,
            exerciseTypeId,
          })),
        )
        .onConflictDoUpdate({
          target: [employeeSpecializations.employeeId, employeeSpecializations.exerciseTypeId],
          set: { deletedAt: null, updatedAt: now },
        });
    }
  }
}

export async function deleteStaff(employeeId: string): Promise<void> {
  const [employee] = await db
    .select({
      employeeId: employees.id,
      personId: persons.id,
      clerkId: persons.clerkId,
    })
    .from(employees)
    .innerJoin(persons, eq(employees.personId, persons.id))
    .where(and(eq(employees.id, employeeId), notDeleted(employees), notDeleted(persons)))
    .limit(1);

  if (!employee) throw new NotFoundError('Staff member not found');

  await clerk.users.deleteUser(employee.clerkId).catch(() => {});
  await db.transaction(async (tx) => {
    const now = new Date();
    await tx
      .update(employeeSpecializations)
      .set({ deletedAt: now, updatedAt: now })
      .where(
        and(
          eq(employeeSpecializations.employeeId, employee.employeeId),
          notDeleted(employeeSpecializations),
        ),
      );
    await tx
      .update(scheduleInstructors)
      .set({ deletedAt: now, updatedAt: now })
      .where(
        and(
          eq(scheduleInstructors.employeeId, employee.employeeId),
          notDeleted(scheduleInstructors),
        ),
      );
    await tx
      .update(employees)
      .set({ deletedAt: now, updatedAt: now })
      .where(eq(employees.id, employee.employeeId));
    await tx
      .update(persons)
      .set({ deletedAt: now, updatedAt: now })
      .where(eq(persons.id, employee.personId));
  });
}

export async function listExerciseTypes() {
  return db
    .select({ id: exerciseTypes.id, name: exerciseTypes.name })
    .from(exerciseTypes)
    .where(notDeleted(exerciseTypes))
    .orderBy(asc(exerciseTypes.name));
}

export async function listEmployeeTypes() {
  return db
    .select({ id: employeeTypes.id, roleName: employeeTypes.roleName })
    .from(employeeTypes)
    .where(notDeleted(employeeTypes))
    .orderBy(asc(employeeTypes.roleName));
}

export async function listLectureMembers(scheduleId: string) {
  const rows = await db
    .select({
      id: customers.id,
      name: persons.name,
      surname: persons.surname,
      email: persons.email,
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

  return rows.map((r) => ({
    id: r.id,
    name: `${r.name} ${r.surname}`,
    email: r.email,
  }));
}
