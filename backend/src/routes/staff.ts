import { Elysia, t } from 'elysia';
import { eq, sql, asc } from 'drizzle-orm';
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
import { clerk, requirePermission } from '../middleware/auth';

function formatTimeRange(start: Date, end: Date): string {
  const hhmm = (d: Date) => d.toISOString().slice(11, 16);
  return `${hhmm(start)} - ${hhmm(end)}`;
}

function generateTempPassword(): string {
  const lower = Math.random().toString(36).slice(2, 7);
  const upper = Math.random().toString(36).slice(2, 5).toUpperCase();
  const digits = Math.floor(100 + Math.random() * 900).toString();
  return `${lower}${upper}${digits}!`;
}

export const staffRoutes = new Elysia({ prefix: '/api/staff' })
  .use(requirePermission('staff:read'))

  // GET /api/staff — list all employees with their specializations
  .get('/', async () => {
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
  })

  // POST /api/staff — Clerk invite + DB insert; for Instructor role also writes specializations
  .post(
    '/',
    async ({ body, set, auth }) => {
      if (!auth!.can('staff:write')) {
        set.status = 403;
        return { error: 'Forbidden' };
      }

      const [roleRow] = await db
        .select()
        .from(tbEmployeeType)
        .where(eq(tbEmployeeType.roleName, body.role))
        .limit(1);

      if (!roleRow) {
        set.status = 400;
        return { error: `Unknown role: ${body.role}` };
      }

      const tempPassword = generateTempPassword();

      let clerkUser: Awaited<ReturnType<typeof clerk.users.createUser>>;
      try {
        clerkUser = await clerk.users.createUser({
          emailAddress: [body.email],
          firstName: body.firstName,
          lastName: body.lastName,
          password: tempPassword,
          publicMetadata: { role: 'employee' },
        });
      } catch (err: unknown) {
        set.status = 400;
        const clerkErr = err as { errors?: Array<{ longMessage?: string; message?: string }> };
        const message =
          clerkErr.errors?.[0]?.longMessage ??
          clerkErr.errors?.[0]?.message ??
          (err instanceof Error ? err.message : 'Failed to create user');
        return { error: message };
      }

      const today = new Date().toISOString().split('T')[0];

      try {
        const [person] = await db
          .insert(tbPerson)
          .values({
            clerkId: clerkUser.id,
            name: body.firstName,
            surname: body.lastName,
            email: body.email,
          })
          .returning();

        const [employee] = await db
          .insert(tbEmployee)
          .values({
            personId: person.id,
            employeeTypeId: roleRow.id,
            hireDate: today,
          })
          .returning();

        if (
          roleRow.roleName === 'Instructor' &&
          body.specializations &&
          body.specializations.length > 0
        ) {
          await db.insert(tbEmployeeSpecialization).values(
            body.specializations.map((exerciseTypeId) => ({
              employeeId: employee.id,
              exerciseTypeId,
            })),
          );
        }
      } catch {
        // Clerk user was created — clean it up to avoid orphans
        await clerk.users.deleteUser(clerkUser.id).catch(() => {});
        set.status = 500;
        return { error: 'Failed to save staff member to database' };
      }

      set.status = 201;
      return { success: true, temporaryPassword: tempPassword };
    },
    {
      body: t.Object({
        firstName: t.String({ minLength: 1 }),
        lastName: t.String({ minLength: 1 }),
        email: t.String({ minLength: 5 }),
        role: t.String({ minLength: 1 }),
        specializations: t.Optional(t.Array(t.String())),
      }),
    },
  )

  // DELETE /api/staff/:id — remove Clerk user, employee, specializations, schedule links, and person
  .delete('/:id', async ({ params, set, auth }) => {
    if (!auth!.can('staff:delete')) {
      set.status = 403;
      return { error: 'Forbidden' };
    }

    const [employee] = await db
      .select({
        employeeId: tbEmployee.id,
        personId: tbPerson.id,
        clerkId: tbPerson.clerkId,
      })
      .from(tbEmployee)
      .innerJoin(tbPerson, eq(tbEmployee.personId, tbPerson.id))
      .where(eq(tbEmployee.id, params.id))
      .limit(1);

    if (!employee) {
      set.status = 404;
      return { error: 'Staff member not found' };
    }

    await clerk.users.deleteUser(employee.clerkId).catch(() => {});
    await db
      .delete(tbEmployeeSpecialization)
      .where(eq(tbEmployeeSpecialization.employeeId, employee.employeeId));
    await db
      .delete(tbScheduleInstructor)
      .where(eq(tbScheduleInstructor.employeeId, employee.employeeId));
    await db.delete(tbEmployee).where(eq(tbEmployee.id, employee.employeeId));
    await db.delete(tbPerson).where(eq(tbPerson.id, employee.personId));

    return { success: true };
  })

  // GET /api/staff/:id/lectures — all scheduled lectures this employee teaches
  .get('/:id/lectures', async ({ params }) => {
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
      .where(eq(tbScheduleInstructor.employeeId, params.id))
      .orderBy(asc(tbSchedule.startTime));

    return await Promise.all(
      rows.map(async (r) => {
        const [{ count }] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(tbCustomerReservation)
          .where(eq(tbCustomerReservation.scheduleId, r.id));

        return {
          id: r.id,
          name: r.lectureName,
          time: formatTimeRange(r.startTime, r.endTime),
          room: r.roomName,
          capacity: r.capacity,
          registered: count,
        };
      }),
    );
  });

// GET /api/exercise-types — used for staff filter chips and specializations multi-select
export const exerciseTypeRoutes = new Elysia({ prefix: '/api/exercise-types' })
  .use(requirePermission('staff:read'))
  .get('/', async () => {
    return db
      .select({ id: tbExerciseType.id, name: tbExerciseType.name })
      .from(tbExerciseType)
      .orderBy(asc(tbExerciseType.name));
  });

// GET /api/employee-types — used for Add staff role dropdown
export const employeeTypeRoutes = new Elysia({ prefix: '/api/employee-types' })
  .use(requirePermission('staff:read'))
  .get('/', async () => {
    return db
      .select({ id: tbEmployeeType.id, roleName: tbEmployeeType.roleName })
      .from(tbEmployeeType)
      .orderBy(asc(tbEmployeeType.roleName));
  });

export const lectureRoutes = new Elysia({ prefix: '/api/lectures' })
  .use(requirePermission('staff:read'))
  // GET /api/lectures/:id/members — customers registered on a schedule instance
  .get('/:id/members', async ({ params }) => {
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
      .where(eq(tbCustomerReservation.scheduleId, params.id))
      .orderBy(asc(tbPerson.surname));

    return rows.map((r) => ({
      id: r.id,
      name: `${r.name} ${r.surname}`,
      email: r.email,
    }));
  });
