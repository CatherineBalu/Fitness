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

      if (schedules.length === 0) return [];

      const scheduleIds = schedules.map((s) => s.id);

      // Look up current customer's registered schedule ids in a single query
      let registeredSet = new Set<string>();
      if (auth) {
        const customer = await getCustomerByClerkId(auth.userId);
        if (customer) {
          const registered = await db
            .select({ scheduleId: tbCustomerReservation.scheduleId })
            .from(tbCustomerReservation)
            .where(
              and(
                eq(tbCustomerReservation.customerId, customer.customerId),
                inArray(tbCustomerReservation.scheduleId, scheduleIds),
              ),
            );
          registeredSet = new Set(registered.map((r) => r.scheduleId));
        }
      }

      // Batch-fetch all instructors for all schedule IDs (replaces N+1 loop)
      const allInstructors = await db
        .select({
          scheduleId: tbScheduleInstructor.scheduleId,
          name: tbPerson.name,
          surname: tbPerson.surname,
          isLead: tbScheduleInstructor.isLead,
        })
        .from(tbScheduleInstructor)
        .innerJoin(tbEmployee, eq(tbScheduleInstructor.employeeId, tbEmployee.id))
        .innerJoin(tbPerson, eq(tbEmployee.personId, tbPerson.id))
        .where(inArray(tbScheduleInstructor.scheduleId, scheduleIds));

      // Batch-fetch reservation counts for all schedule IDs (replaces N+1 loop)
      const allCounts = await db
        .select({
          scheduleId: tbCustomerReservation.scheduleId,
          count: sql<number>`count(*)::int`,
        })
        .from(tbCustomerReservation)
        .where(inArray(tbCustomerReservation.scheduleId, scheduleIds))
        .groupBy(tbCustomerReservation.scheduleId);

      const instructorsBySchedule = new Map<string, typeof allInstructors>();
      for (const row of allInstructors) {
        const list = instructorsBySchedule.get(row.scheduleId) ?? [];
        list.push(row);
        instructorsBySchedule.set(row.scheduleId, list);
      }

      const countBySchedule = new Map<string, number>();
      for (const row of allCounts) {
        countBySchedule.set(row.scheduleId, row.count);
      }

      return schedules.map((s) => {
        const instructors = instructorsBySchedule.get(s.id) ?? [];
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
          registered: countBySchedule.get(s.id) ?? 0,
          isRegistered: registeredSet.has(s.id),
        };
      });
    },
    {
      query: t.Object({
        from: t.String(),
        to: t.String(),
      }),
    },
  )

  // POST /schedule/:id/reservations — register current user
  // DELETE /schedule/:id/reservations — cancel current user's reservation
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
  );
