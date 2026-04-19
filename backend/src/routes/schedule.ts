import { Elysia, t } from 'elysia';
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

export const scheduleRoutes = new Elysia({ prefix: '/schedule' })

  // GET /schedule?from=2026-04-13&to=2026-04-19
  .get(
    '/',
    async ({ query, auth }) => {
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
      .post('/', async ({ params, auth, set }) => {
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
          .select({ id: tbCustomerReservation.id })
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
      .delete('/', async ({ params, auth, set }) => {
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
          .returning({ id: tbCustomerReservation.id });

        if (deleted.length === 0) {
          set.status = 404;
          return { error: 'Reservation not found' };
        }

        return { success: true };
      }),
  );
