import { Elysia, t } from 'elysia';
import { z } from 'zod';
import { db } from '../db/db';
import { eq, and, gte, lte, sql, inArray } from 'drizzle-orm';
import {
  tbSchedule,
  tbLecture,
  tbRoom,
  tbExerciseType,
  tbScheduleInstructor,
  tbEmployee,
  tbPerson,
  tbCustomer,
  tbCustomerReservation,
} from '../db/schema';
import { requirePermission } from '../middleware/auth';

async function getCustomerByClerkId(clerkId: string) {
  const [row] = await db
    .select({
      customerId: tbCustomer.id,
      subscriptionValidUntil: tbCustomer.subscriptionValidUntil,
    })
    .from(tbCustomer)
    .innerJoin(tbPerson, eq(tbCustomer.personId, tbPerson.id))
    .where(eq(tbPerson.clerkId, clerkId))
    .limit(1);
  return row ?? null;
}

function isSubscriptionActive(validUntil: string | null): boolean {
  if (!validUntil) return false;
  return new Date(validUntil) >= new Date(new Date().toISOString().split('T')[0]);
}

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

export const scheduleRoutes = new Elysia({ prefix: '/schedule' })

  // ==========================================
  // MANAGE MEMBERS (ADD & REMOVE)
  // ==========================================

  // POST /schedule/:id/members — Add a member by email
  .post(
    '/:id/members',
    async ({ params, body, set }) => {
      const { id: scheduleId } = params;
      const { email } = body;

      // 1. Find the person by email
      const [person] = await db.select().from(tbPerson).where(eq(tbPerson.email, email));

      if (!person) {
        set.status = 404;
        return { error: 'Person with this email does not exist.' };
      }

      // 2. Verify if this person is a registered customer
      const [customer] = await db
        .select()
        .from(tbCustomer)
        .where(eq(tbCustomer.personId, person.id));

      if (!customer) {
        set.status = 400;
        return { error: 'This person is not a registered customer.' };
      }

      try {
        // 3. Create the reservation
        await db.insert(tbCustomerReservation).values({
          scheduleId,
          customerId: customer.id,
        });

        set.status = 201;
        return {
          id: person.id,
          name: `${person.name} ${person.surname}`,
          email: person.email,
        };
      } catch {
        set.status = 409;
        return { error: 'Customer is already registered for this lecture.' };
      }
    },
    {
      params: t.Object({ id: t.String({ format: 'uuid' }) }),
      body: t.Object({ email: t.String({ format: 'email' }) }),
    },
  )

  // DELETE /schedule/:id/members/:personId — Remove a member from schedule
  .delete(
    '/:id/members/:personId',
    async ({ params, set }) => {
      const { id: scheduleId, personId } = params;

      // Find customer ID based on person ID
      const [customer] = await db
        .select()
        .from(tbCustomer)
        .where(eq(tbCustomer.personId, personId));

      if (!customer) {
        set.status = 404;
        return { error: 'Customer not found.' };
      }

      await db
        .delete(tbCustomerReservation)
        .where(
          and(
            eq(tbCustomerReservation.scheduleId, scheduleId),
            eq(tbCustomerReservation.customerId, customer.id),
          ),
        );

      return { success: true };
    },
    {
      params: t.Object({
        id: t.String({ format: 'uuid' }),
        personId: t.String({ format: 'uuid' }),
      }),
    },
  )

  // ==========================================
  // EDIT SCHEDULE (Room & Time)
  // ==========================================

  // PATCH /schedule/:id — Update room or time for a specific schedule instance
  .patch(
    '/:id',
    async ({ params, body, set }) => {
      const { id } = params;

      // Note: We intentionally do NOT update the 'name' here, because the name
      // belongs to the global Lecture Template (tbLecture). Changing it here
      // would rename all historical and future classes of this type.

      try {
        // Fetch current schedule to construct accurate Date objects for time updates
        const [currentSchedule] = await db.select().from(tbSchedule).where(eq(tbSchedule.id, id));

        if (!currentSchedule) {
          set.status = 404;
          return { error: 'Schedule not found.' };
        }

        // Base dates keep the same YYYY-MM-DD, just modifying the time
        const newStartDate = new Date(currentSchedule.startTime);
        const newEndDate = new Date(currentSchedule.endTime);

        if (body.startTime) {
          const [hours, minutes] = body.startTime.split(':');
          newStartDate.setUTCHours(parseInt(hours), parseInt(minutes), 0, 0);
        }

        if (body.endTime) {
          const [hours, minutes] = body.endTime.split(':');
          newEndDate.setUTCHours(parseInt(hours), parseInt(minutes), 0, 0);
        }

        await db
          .update(tbSchedule)
          .set({
            roomId: body.roomId ?? currentSchedule.roomId,
            startTime: newStartDate,
            endTime: newEndDate,
          })
          .where(eq(tbSchedule.id, id));

        return { success: true };
      } catch (error) {
        console.error(error);
        set.status = 500;
        return { error: 'Failed to update schedule.' };
      }
    },
    {
      params: t.Object({ id: t.String({ format: 'uuid' }) }),
      body: t.Object({
        roomId: t.Optional(t.String({ format: 'uuid' })),
        startTime: t.Optional(t.String()), // Expected format "HH:MM"
        endTime: t.Optional(t.String()), // Expected format "HH:MM"
      }),
    },
  )

  // ==========================================
  // ATTENDANCE
  // ==========================================

  // PATCH /schedule/:id/attendance — Bulk update attendance
  .patch(
    '/:id/attendance',
    async ({ params, body }) => {
      const { id: scheduleId } = params;
      const { attendanceRecords } = body; // Array of { personId, attended }

      // Drizzle doesn't have a clean bulk-update for different values yet,
      // so we map through and update individually using a transaction
      await db.transaction(async (tx) => {
        for (const record of attendanceRecords) {
          // Look up customerId for the person
          const [customer] = await tx
            .select()
            .from(tbCustomer)
            .where(eq(tbCustomer.personId, record.personId));

          if (customer) {
            await tx
              .update(tbCustomerReservation)
              .set({ attended: record.attended })
              .where(
                and(
                  eq(tbCustomerReservation.scheduleId, scheduleId),
                  eq(tbCustomerReservation.customerId, customer.id),
                ),
              );
          }
        }
      });

      return { success: true };
    },
    {
      params: t.Object({ id: t.String({ format: 'uuid' }) }),
      body: t.Object({
        attendanceRecords: t.Array(
          t.Object({
            personId: t.String({ format: 'uuid' }),
            attended: t.Boolean(),
          }),
        ),
      }),
    },
  )

  // GET /schedule?from=2026-04-13&to=2026-04-19
  .get(
    '/',
    async ({ query, ...rest }) => {
      const auth = (rest as unknown as { auth: { userId: string } }).auth;
      const from = new Date(query.from);
      const to = new Date(query.to);
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

      // Look up current customer's registered schedule ids in a single query
      let registeredSet = new Set<string>();
      if (auth && schedules.length > 0) {
        const customer = await getCustomerByClerkId(auth.userId);
        if (customer) {
          const registered = await db
            .select({ scheduleId: tbCustomerReservation.scheduleId })
            .from(tbCustomerReservation)
            .where(
              and(
                eq(tbCustomerReservation.customerId, customer.customerId),
                inArray(
                  tbCustomerReservation.scheduleId,
                  schedules.map((s) => s.id),
                ),
              ),
            );
          registeredSet = new Set(registered.map((r) => r.scheduleId));
        }
      }

      const result = await Promise.all(
        schedules.map(async (s) => {
          const instructors = await db
            .select({
              name: tbPerson.name,
              surname: tbPerson.surname,
              isLead: tbScheduleInstructor.isLead,
            })
            .from(tbScheduleInstructor)
            .innerJoin(tbEmployee, eq(tbScheduleInstructor.employeeId, tbEmployee.id))
            .innerJoin(tbPerson, eq(tbEmployee.personId, tbPerson.id))
            .where(eq(tbScheduleInstructor.scheduleId, s.id));

          const [{ count }] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(tbCustomerReservation)
            .where(eq(tbCustomerReservation.scheduleId, s.id));

          return {
            id: s.id,
            startTime: s.startTime.toISOString(),
            endTime: s.endTime.toISOString(),
            lectureName: s.lectureName,
            description: s.description,
            roomName: s.roomName,
            roomCapacity: s.roomCapacity,
            exerciseType: s.exerciseType,
            forMembers: s.forMembers,
            instructors: instructors.map((i) => ({
              name: `${i.name} ${i.surname}`,
              isLead: i.isLead,
            })),
            registered: count,
            isRegistered: registeredSet.has(s.id),
          };
        }),
      );

      return result;
    },
    {
      query: t.Object({
        from: t.String(),
        to: t.String(),
      }),
    },
  )

  // POST /schedule/:id/reservations — register current user
  .group('/:id/reservations', (app) =>
    app
      .use(requirePermission('reservation:write'))
      .post('/', async ({ params, set, ...rest }) => {
        const auth = (rest as unknown as { auth: { userId: string } }).auth;

        const customer = await getCustomerByClerkId(auth!.userId);
        if (!customer) {
          set.status = 404;
          return { error: 'Customer profile not found' };
        }

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
          .where(eq(tbSchedule.id, params.id))
          .limit(1);

        if (!schedule) {
          set.status = 404;
          return { error: 'Lecture not found' };
        }

        if (schedule.startTime < new Date()) {
          set.status = 400;
          return { error: 'Cannot register for a lecture that has already started' };
        }

        if (schedule.forMembers && !isSubscriptionActive(customer.subscriptionValidUntil)) {
          set.status = 403;
          return { error: 'This lecture is for members only' };
        }

        const [existing] = await db
          .select({ customerId: tbCustomerReservation.customerId })
          .from(tbCustomerReservation)
          .where(
            and(
              eq(tbCustomerReservation.customerId, customer.customerId),
              eq(tbCustomerReservation.scheduleId, params.id),
            ),
          )
          .limit(1);
        if (existing) {
          set.status = 409;
          return { error: 'Already registered' };
        }

        const [{ count }] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(tbCustomerReservation)
          .where(eq(tbCustomerReservation.scheduleId, params.id));
        if (count >= schedule.roomCapacity) {
          set.status = 409;
          return { error: 'Lecture is full' };
        }

        await db.insert(tbCustomerReservation).values({
          customerId: customer.customerId,
          scheduleId: params.id,
        });

        set.status = 201;
        return { success: true };
      })

      // DELETE /schedule/:id/reservations — cancel current user's reservation
      .delete('/', async ({ params, set, ...rest }) => {
        const auth = (rest as unknown as { auth: { userId: string } }).auth;

        const customer = await getCustomerByClerkId(auth!.userId);
        if (!customer) {
          set.status = 404;
          return { error: 'Customer profile not found' };
        }

        const deleted = await db
          .delete(tbCustomerReservation)
          .where(
            and(
              eq(tbCustomerReservation.customerId, customer.customerId),
              eq(tbCustomerReservation.scheduleId, params.id),
            ),
          )
          .returning({ customerId: tbCustomerReservation.customerId });

        if (deleted.length === 0) {
          set.status = 404;
          return { error: 'Reservation not found' };
        }

        return { success: true };
      }),
  )

  // GET /schedule/:id/members — list all members registered for a specific schedule
  .get(
    '/:id/members',
    async ({ params, set }) => {
      try {
        const { id: scheduleId } = params;

        const members = await db
          .select({
            id: tbPerson.id,
            name: tbPerson.name,
            surname: tbPerson.surname,
            email: tbPerson.email,
            attended: tbCustomerReservation.attended,
          })
          .from(tbCustomerReservation)
          .innerJoin(tbCustomer, eq(tbCustomerReservation.customerId, tbCustomer.id))
          .innerJoin(tbPerson, eq(tbCustomer.personId, tbPerson.id))
          .where(eq(tbCustomerReservation.scheduleId, scheduleId))
          .orderBy(tbPerson.surname);

        return members.map((member) => ({
          id: member.id,
          name: `${member.name} ${member.surname}`,
          email: member.email,
          attended: member.attended,
        }));
      } catch (error) {
        console.error('Failed to fetch schedule members:', error);
        set.status = 500;
        return { error: 'Failed to retrieve members.' };
      }
    },
    {
      params: t.Object({
        id: t.String({ format: 'uuid', error: 'Invalid schedule ID format' }),
      }),
    },
  )

  // GET /schedule/lectures — list all lecture templates
  .get('/lectures', async () => {
    const lectures = await db
      .select({
        id: tbLecture.id,
        lectureName: tbLecture.lectureName,
        exerciseType: tbExerciseType.name,
      })
      .from(tbLecture)
      .innerJoin(tbExerciseType, eq(tbLecture.exerciseTypeId, tbExerciseType.id))
      .orderBy(tbLecture.lectureName);

    return lectures;
  })

  // GET /schedule/rooms — list all rooms
  .get('/rooms', async () => {
    const rooms = await db
      .select({ id: tbRoom.id, name: tbRoom.name, capacity: tbRoom.capacity })
      .from(tbRoom)
      .orderBy(tbRoom.name);

    return rooms;
  })

  // GET /schedule/instructors — list all employees
  .get('/instructors', async () => {
    const instructors = await db
      .select({
        id: tbEmployee.id,
        name: tbPerson.name,
        surname: tbPerson.surname,
      })
      .from(tbEmployee)
      .innerJoin(tbPerson, eq(tbEmployee.personId, tbPerson.id))
      .orderBy(tbPerson.surname);

    return instructors.map((i) => ({ id: i.id, name: `${i.name} ${i.surname}` }));
  })

  // POST /schedule — create a new scheduled lecture
  .post(
    '/',
    async ({ body, set }) => {
      const result = createScheduleSchema.safeParse(body);

      if (!result.success) {
        set.status = 422;
        return { errors: result.error.flatten().fieldErrors };
      }

      const { lectureId, roomId, startTime, endTime, instructors } = result.data;

      const [schedule] = await db
        .insert(tbSchedule)
        .values({
          lectureId,
          roomId,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
        })
        .returning();

      if (instructors && instructors.length > 0) {
        await db.insert(tbScheduleInstructor).values(
          instructors.map((inst) => ({
            scheduleId: schedule.id,
            employeeId: inst.employeeId,
            isLead: inst.isLead,
          })),
        );
      }

      set.status = 201;
      return { id: schedule.id };
    },
    {
      body: t.Object({
        lectureId: t.String(),
        roomId: t.String(),
        startTime: t.String(),
        endTime: t.String(),
        instructors: t.Optional(
          t.Array(
            t.Object({
              employeeId: t.String(),
              isLead: t.Boolean(),
            }),
          ),
        ),
      }),
    },
  );
