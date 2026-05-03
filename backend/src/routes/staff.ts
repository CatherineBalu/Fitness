import { Elysia, t } from 'elysia';
import { eq, sql, asc, inArray } from 'drizzle-orm';
import { db } from '../db/db';
import {
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
  tbCustomer,
} from '../db/schema';
import { clerk, requirePermission } from '../middleware/auth';

function generateTempPassword(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return `${Buffer.from(bytes).toString('base64url').slice(0, 14)}A1!`;
}

async function getEmployeeLectures(employeeId: string) {
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

// ── Read routes (requires staff:read) ────────────────────────────────

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

  // GET /api/staff/me/lectures — current authenticated staff member's lectures
  .get('/me/lectures', async ({ auth, set }) => {
    const [employee] = await db
      .select({ id: tbEmployee.id })
      .from(tbEmployee)
      .innerJoin(tbPerson, eq(tbEmployee.personId, tbPerson.id))
      .where(eq(tbPerson.clerkId, auth!.userId))
      .limit(1);

    if (!employee) {
      set.status = 404;
      return { error: 'Staff profile not found' };
    }

    return getEmployeeLectures(employee.id);
  })

  // GET /api/staff/:id/lectures — all scheduled lectures this employee teaches
  .get('/:id/lectures', async ({ params }) => {
    return getEmployeeLectures(params.id);
  });

// ── Write routes (requires staff:write) ──────────────────────────────

export const staffWriteRoutes = new Elysia({ prefix: '/api/staff' })
  .use(requirePermission('staff:write'))

  // POST /api/staff — Clerk invite + DB insert; for Instructor role also writes specializations
  .post(
    '/',
    async ({ body, set }) => {
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
        email: t.String({ pattern: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$' }),
        role: t.String({ minLength: 1 }),
        specializations: t.Optional(t.Array(t.String())),
      }),
    },
  )

  // PATCH /api/staff/:id — update first/last name (DB + Clerk); for Instructor also replace specializations
  .patch(
    '/:id',
    async ({ params, body, set }) => {
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
        .where(eq(tbEmployee.id, params.id))
        .limit(1);

      if (!employee) {
        set.status = 404;
        return { error: 'Staff member not found' };
      }

      // Clerk is best-effort: seed users have fake clerkIds. DB remains source of truth.
      await clerk.users
        .updateUser(employee.clerkId, {
          firstName: body.firstName,
          lastName: body.lastName,
        })
        .catch(() => {});

      await db
        .update(tbPerson)
        .set({ name: body.firstName, surname: body.lastName })
        .where(eq(tbPerson.id, employee.personId));

      if (employee.role === 'Instructor' && body.specializations) {
        await db
          .delete(tbEmployeeSpecialization)
          .where(eq(tbEmployeeSpecialization.employeeId, employee.employeeId));
        if (body.specializations.length > 0) {
          await db.insert(tbEmployeeSpecialization).values(
            body.specializations.map((exerciseTypeId) => ({
              employeeId: employee.employeeId,
              exerciseTypeId,
            })),
          );
        }
      }

      return { success: true };
    },
    {
      body: t.Object({
        firstName: t.String({ minLength: 1 }),
        lastName: t.String({ minLength: 1 }),
        specializations: t.Optional(t.Array(t.String())),
      }),
    },
  );

// ── Delete routes (requires staff:delete) ────────────────────────────

export const staffDeleteRoutes = new Elysia({ prefix: '/api/staff' })
  .use(requirePermission('staff:delete'))

  // DELETE /api/staff/:id — remove Clerk user, then delete all DB records atomically
  .delete('/:id', async ({ params, set }) => {
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

    // Clerk deletion is best-effort; DB deletion is atomic
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

    return { success: true };
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
