import { Elysia, t } from 'elysia';
import { z } from 'zod';
import { db } from '../db/db';
import { eq, and } from 'drizzle-orm';
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

export const calendarRoutes = new Elysia({ prefix: '/calendar' })

  // GET /calendar/lectures — list all lecture templates
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

  // GET /calendar/rooms — list all rooms
  .get('/rooms', async () => {
    const rooms = await db
      .select({ id: tbRoom.id, name: tbRoom.name, capacity: tbRoom.capacity })
      .from(tbRoom)
      .orderBy(tbRoom.name);

    return rooms;
  })

  // GET /calendar/instructors — list all employees
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

  // POST /calendar — create a new scheduled lecture
  .post(
    '/',
    async ({ body, set }) => {
      const result = createScheduleSchema.safeParse(body);

      if (!result.success) {
        set.status = 422;
        return { errors: result.error.flatten().fieldErrors };
      }

      const { lectureId, roomId, startTime, endTime, instructors } = result.data;

      return await db.transaction(async (tx) => {
        const [schedule] = await tx
          .insert(tbSchedule)
          .values({
            lectureId,
            roomId,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
          })
          .returning();

        if (instructors && instructors.length > 0) {
          await tx.insert(tbScheduleInstructor).values(
            instructors.map((inst) => ({
              scheduleId: schedule.id,
              employeeId: inst.employeeId,
              isLead: inst.isLead,
            })),
          );
        }

        set.status = 201;
        return { id: schedule.id };
      });
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
  )

  // GET /calendar/:id/members — list all members registered for a schedule
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

        return members.map((m) => ({
          id: m.id,
          name: `${m.name} ${m.surname}`,
          email: m.email,
          attended: m.attended,
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

  // POST /calendar/:id/members — add a member by email
  .post(
    '/:id/members',
    async ({ params, body, set }) => {
      const { id: scheduleId } = params;
      const { email } = body;

      const [person] = await db.select().from(tbPerson).where(eq(tbPerson.email, email));

      if (!person) {
        set.status = 404;
        return { error: 'Person with this email does not exist.' };
      }

      const [customer] = await db
        .select()
        .from(tbCustomer)
        .where(eq(tbCustomer.personId, person.id));

      if (!customer) {
        set.status = 400;
        return { error: 'This person is not a registered customer.' };
      }

      try {
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

  // DELETE /calendar/:id/members/:personId — remove a member from a schedule
  .delete(
    '/:id/members/:personId',
    async ({ params, set }) => {
      const { id: scheduleId, personId } = params;

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

  // PATCH /calendar/:id — update room or time for a schedule instance
  .patch(
    '/:id',
    async ({ params, body, set }) => {
      const { id } = params;

      try {
        const [currentSchedule] = await db.select().from(tbSchedule).where(eq(tbSchedule.id, id));

        if (!currentSchedule) {
          set.status = 404;
          return { error: 'Schedule not found.' };
        }

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
        startTime: t.Optional(t.String()),
        endTime: t.Optional(t.String()),
      }),
    },
  )

  // PATCH /calendar/:id/attendance — bulk update attendance
  .patch(
    '/:id/attendance',
    async ({ params, body }) => {
      const { id: scheduleId } = params;
      const { attendanceRecords } = body;

      await db.transaction(async (tx) => {
        for (const record of attendanceRecords) {
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
  );
