import { Elysia, t } from 'elysia';
import { eq } from 'drizzle-orm';
import { db } from '../db/db';
import { tbPerson, tbEmployee, tbEmployeeType } from '../db/schema';
import { clerk, requirePermission } from '../middleware/auth';

function generateTempPassword(): string {
  const lower = Math.random().toString(36).slice(2, 7);
  const upper = Math.random().toString(36).slice(2, 5).toUpperCase();
  const digits = Math.floor(100 + Math.random() * 900).toString();
  return `${lower}${upper}${digits}!`;
}

export const staffRoutes = new Elysia({ prefix: '/api/staff' })
  .use(requirePermission('staff:read'))

  // GET /api/staff — list all employees
  .get('/', async () => {
    return db
      .select({
        id: tbEmployee.id,
        firstName: tbPerson.name,
        lastName: tbPerson.surname,
        email: tbPerson.email,
        clerkId: tbPerson.clerkId,
        roleType: tbEmployeeType.roleName,
        hireDate: tbEmployee.hireDate,
      })
      .from(tbEmployee)
      .innerJoin(tbPerson, eq(tbEmployee.personId, tbPerson.id))
      .innerJoin(tbEmployeeType, eq(tbEmployee.employeeTypeId, tbEmployeeType.id));
  })

  // POST /api/staff — create a new employee
  .post(
    '/',
    async ({ body, set, auth }) => {
      console.log('[POST /api/staff] reached, auth:', auth);
      if (!auth!.can('staff:write')) {
        set.status = 403;
        return { error: 'Forbidden' };
      }

      const [empType] = await db.select().from(tbEmployeeType).limit(1);

      if (!empType) {
        set.status = 500;
        return { error: 'No employee types configured in database' };
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
        console.log('[POST /api/staff] Clerk error:', JSON.stringify(err, null, 2));
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

        await db.insert(tbEmployee).values({
          personId: person.id,
          employeeTypeId: empType.id,
          hireDate: today,
        });
      } catch (err) {
        console.log('[POST /api/staff] DB error:', err);
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
      }),
    },
  )

  // DELETE /api/staff/:id — remove an employee
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

    await clerk.users.deleteUser(employee.clerkId);
    await db.delete(tbEmployee).where(eq(tbEmployee.id, employee.employeeId));
    await db.delete(tbPerson).where(eq(tbPerson.id, employee.personId));

    return { success: true };
  })

  .get('/:id/lectures', ({ set }) => {
    set.status = 501;
    return { error: 'Not implemented' };
  });

export const lectureRoutes = new Elysia({ prefix: '/api/lectures' })
  .use(requirePermission('staff:read'))
  .get('/:id/members', ({ set }) => {
    set.status = 501;
    return { error: 'Not implemented' };
  });
