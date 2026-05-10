import { asc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../db/db';
import {
  tbCustomer,
  tbCustomerReservation,
  tbEmployee,
  tbEmployeeSpecialization,
  tbEmployeeType,
  tbExerciseType,
  tbLecture,
  tbPerson,
  tbRoom,
  tbSchedule,
  tbScheduleInstructor,
} from '../db/schema';
import { clerk } from '../middleware/auth';
import { DomainValidationError, NotFoundError } from '../lib/errors';

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
      id: tbEmployee.id,
      firstName: tbPerson.name,
      lastName: tbPerson.surname,
      email: tbPerson.email,
      clerkId: tbPerson.clerkId,
      role: tbEmployeeType.roleName,
      since: tbEmployee.hireDate,
    })
    .from(tbEmployee)
    .innerJoin(tbPerson, eq(tbEmployee.personId, tbPerson.id))
    .innerJoin(tbEmployeeType, eq(tbEmployee.employeeTypeId, tbEmployeeType.id))
    .orderBy(asc(tbPerson.surname));

  const specRows = await db
    .select({
      employeeId: tbEmployeeSpecialization.employeeId,
      name: tbExerciseType.name,
    })
    .from(tbEmployeeSpecialization)
    .innerJoin(tbExerciseType, eq(tbEmployeeSpecialization.exerciseTypeId, tbExerciseType.id));

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
      id: tbSchedule.id,
      lectureName: tbLecture.lectureName,
      startTime: tbSchedule.startTime,
      endTime: tbSchedule.endTime,
      roomName: tbRoom.name,
      capacity: tbRoom.capacity,
    })
    .from(tbScheduleInstructor)
    .innerJoin(tbSchedule, eq(tbScheduleInstructor.scheduleId, tbSchedule.id))
    .innerJoin(tbLecture, eq(tbSchedule.lectureId, tbLecture.id))
    .innerJoin(tbRoom, eq(tbSchedule.roomId, tbRoom.id))
    .where(eq(tbScheduleInstructor.employeeId, employeeId))
    .orderBy(asc(tbSchedule.startTime));

  if (rows.length === 0) return [];

  const countRows = await db
    .select({
      scheduleId: tbCustomerReservation.scheduleId,
      count: sql<number>`count(*)::int`,
    })
    .from(tbCustomerReservation)
    .where(
      inArray(
        tbCustomerReservation.scheduleId,
        rows.map((r) => r.id),
      ),
    )
    .groupBy(tbCustomerReservation.scheduleId);

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
    .select({ id: tbEmployee.id })
    .from(tbEmployee)
    .innerJoin(tbPerson, eq(tbEmployee.personId, tbPerson.id))
    .where(eq(tbPerson.clerkId, clerkId))
    .limit(1);

  if (!employee) throw new NotFoundError('Staff profile not found');
  return getEmployeeLectures(employee.id);
}

export async function createStaff(input: CreateStaffInput): Promise<{ temporaryPassword: string }> {
  const [roleRow] = await db
    .select()
    .from(tbEmployeeType)
    .where(eq(tbEmployeeType.roleName, input.role))
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
        .insert(tbPerson)
        .values({
          clerkId: clerkUser.id,
          name: input.firstName,
          surname: input.lastName,
          email: input.email,
        })
        .returning();

      const [employee] = await tx
        .insert(tbEmployee)
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
        await tx.insert(tbEmployeeSpecialization).values(
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

  return { temporaryPassword: tempPassword };
}

export async function updateStaff(employeeId: string, input: UpdateStaffInput): Promise<void> {
  const [employee] = await db
    .select({
      employeeId: tbEmployee.id,
      personId: tbPerson.id,
      clerkId: tbPerson.clerkId,
      role: tbEmployeeType.roleName,
    })
    .from(tbEmployee)
    .innerJoin(tbPerson, eq(tbEmployee.personId, tbPerson.id))
    .innerJoin(tbEmployeeType, eq(tbEmployee.employeeTypeId, tbEmployeeType.id))
    .where(eq(tbEmployee.id, employeeId))
    .limit(1);

  if (!employee) throw new NotFoundError('Staff member not found');

  await clerk.users
    .updateUser(employee.clerkId, {
      firstName: input.firstName,
      lastName: input.lastName,
    })
    .catch(() => {});

  await db
    .update(tbPerson)
    .set({ name: input.firstName, surname: input.lastName, updatedAt: new Date() })
    .where(eq(tbPerson.id, employee.personId));

  if (employee.role === 'Instructor' && input.specializations) {
    await db
      .delete(tbEmployeeSpecialization)
      .where(eq(tbEmployeeSpecialization.employeeId, employee.employeeId));
    if (input.specializations.length > 0) {
      await db.insert(tbEmployeeSpecialization).values(
        input.specializations.map((exerciseTypeId) => ({
          employeeId: employee.employeeId,
          exerciseTypeId,
        })),
      );
    }
  }
}

export async function deleteStaff(employeeId: string): Promise<void> {
  const [employee] = await db
    .select({
      employeeId: tbEmployee.id,
      personId: tbPerson.id,
      clerkId: tbPerson.clerkId,
    })
    .from(tbEmployee)
    .innerJoin(tbPerson, eq(tbEmployee.personId, tbPerson.id))
    .where(eq(tbEmployee.id, employeeId))
    .limit(1);

  if (!employee) throw new NotFoundError('Staff member not found');

  await clerk.users.deleteUser(employee.clerkId).catch(() => {});
  await db.transaction(async (tx) => {
    await tx
      .delete(tbEmployeeSpecialization)
      .where(eq(tbEmployeeSpecialization.employeeId, employee.employeeId));
    await tx
      .delete(tbScheduleInstructor)
      .where(eq(tbScheduleInstructor.employeeId, employee.employeeId));
    await tx.delete(tbEmployee).where(eq(tbEmployee.id, employee.employeeId));
    await tx.delete(tbPerson).where(eq(tbPerson.id, employee.personId));
  });
}

export async function listExerciseTypes() {
  return db
    .select({ id: tbExerciseType.id, name: tbExerciseType.name })
    .from(tbExerciseType)
    .orderBy(asc(tbExerciseType.name));
}

export async function listEmployeeTypes() {
  return db
    .select({ id: tbEmployeeType.id, roleName: tbEmployeeType.roleName })
    .from(tbEmployeeType)
    .orderBy(asc(tbEmployeeType.roleName));
}

export async function listLectureMembers(scheduleId: string) {
  const rows = await db
    .select({
      id: tbCustomer.id,
      name: tbPerson.name,
      surname: tbPerson.surname,
      email: tbPerson.email,
    })
    .from(tbCustomerReservation)
    .innerJoin(tbCustomer, eq(tbCustomerReservation.customerId, tbCustomer.id))
    .innerJoin(tbPerson, eq(tbCustomer.personId, tbPerson.id))
    .where(eq(tbCustomerReservation.scheduleId, scheduleId))
    .orderBy(asc(tbPerson.surname));

  return rows.map((r) => ({
    id: r.id,
    name: `${r.name} ${r.surname}`,
    email: r.email,
  }));
}
