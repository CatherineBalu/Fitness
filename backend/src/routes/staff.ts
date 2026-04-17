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

function formatTimeRange(start: Date, end: Date): string {
  const hhmm = (d: Date) => d.toISOString().slice(11, 16);
  return `${hhmm(start)} - ${hhmm(end)}`;
}

export const staffRoutes = new Elysia({ prefix: '/api/staff' })
  // GET /api/staff — list all employees (Instructors + Reception) with their specializations
  .get('/', async () => {
    const rows = await db
      .select({
        id: tbEmployee.id,
        firstName: tbPerson.name,
        lastName: tbPerson.surname,
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

  // POST /api/staff — create new employee (person + employee row)
  .post(
    '/',
    async ({ body, set }) => {
      const [first, ...rest] = body.fullName.trim().split(/\s+/);
      const last = rest.join(' ');

      if (!first || !last) {
        set.status = 400;
        return { error: 'Full name must contain first and last name' };
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

      const [existing] = await db
        .select({ id: tbPerson.id })
        .from(tbPerson)
        .where(eq(tbPerson.email, body.email))
        .limit(1);

      if (existing) {
        set.status = 409;
        return { error: 'Email already registered' };
      }

      const hashedPassword = await Bun.password.hash(body.password);

      const [newPerson] = await db
        .insert(tbPerson)
        .values({
          name: first,
          surname: last,
          email: body.email,
          password: hashedPassword,
          phoneNumber: '',
        })
        .returning();

      const [newEmployee] = await db
        .insert(tbEmployee)
        .values({
          personId: newPerson.id,
          employeeTypeId: roleRow.id,
          hireDate: new Date().toISOString().slice(0, 10),
        })
        .returning();

      set.status = 201;
      return {
        id: newEmployee.id,
        firstName: newPerson.name,
        lastName: newPerson.surname,
        role: roleRow.roleName,
        since: newEmployee.hireDate,
      };
    },
    {
      body: t.Object({
        fullName: t.String({ minLength: 1 }),
        role: t.String({ minLength: 1 }),
        email: t.String({ format: 'email' }),
        password: t.String({ minLength: 6 }),
      }),
    },
  )

  // DELETE /api/staff/:id — remove employee and underlying person
  .delete('/:id', async ({ params, set }) => {
    const [employee] = await db
      .select({ personId: tbEmployee.personId })
      .from(tbEmployee)
      .where(eq(tbEmployee.id, params.id))
      .limit(1);

    if (!employee) {
      set.status = 404;
      return { error: 'Employee not found' };
    }

    await db.delete(tbScheduleInstructor).where(eq(tbScheduleInstructor.employeeId, params.id));
    await db.delete(tbEmployee).where(eq(tbEmployee.id, params.id));
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

export const exerciseTypeRoutes = new Elysia({ prefix: '/api/exercise-types' })
  // GET /api/exercise-types — list all exercise types (used for staff filter chips and specializations)
  .get('/', async () => {
    const rows = await db
      .select({ id: tbExerciseType.id, name: tbExerciseType.name })
      .from(tbExerciseType)
      .orderBy(asc(tbExerciseType.name));

    return rows;
  });

export const employeeTypeRoutes = new Elysia({ prefix: '/api/employee-types' })
  // GET /api/employee-types — list all employee roles (used for Add staff role dropdown)
  .get('/', async () => {
    const rows = await db
      .select({ id: tbEmployeeType.id, roleName: tbEmployeeType.roleName })
      .from(tbEmployeeType)
      .orderBy(asc(tbEmployeeType.roleName));

    return rows;
  });

export const lectureRoutes = new Elysia({ prefix: '/api/lectures' })
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
