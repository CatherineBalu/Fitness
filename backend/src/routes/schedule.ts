import { Elysia, t } from 'elysia';
import { db } from '../db/db';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import {
  tbSchedule,
  tbLecture,
  tbRoom,
  tbExerciseType,
  tbScheduleInstructor,
  tbEmployee,
  tbPerson,
  tbCustomerReservation,
} from '../db/schema';

export const scheduleRoutes = new Elysia({ prefix: '/schedule' })

  // GET /schedule?from=2026-04-13&to=2026-04-19
  .get(
    '/',
    async ({ query }) => {
      const from = new Date(query.from);
      const to = new Date(query.to);

      // Set 'to' to end of day so it includes the whole last day
      to.setHours(23, 59, 59, 999);

      // Get all schedules in the date range with lecture, room, exercise type
      const schedules = await db
        .select({
          id: tbSchedule.id,
          startTime: tbSchedule.startTime,
          endTime: tbSchedule.endTime,
          lectureName: tbLecture.lectureName,
          description: tbLecture.description,
          roomName: tbRoom.name,
          roomCapacity: tbRoom.capacity,
          exerciseType: tbExerciseType.name,
        })
        .from(tbSchedule)
        .innerJoin(tbLecture, eq(tbSchedule.lectureId, tbLecture.id))
        .innerJoin(tbRoom, eq(tbSchedule.roomId, tbRoom.id))
        .innerJoin(tbExerciseType, eq(tbLecture.exerciseTypeId, tbExerciseType.id))
        .where(and(gte(tbSchedule.startTime, from), lte(tbSchedule.startTime, to)));

      // For each schedule, get instructors and reservation count
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
            instructors: instructors.map((i) => ({
              name: `${i.name} ${i.surname}`,
              isLead: i.isLead,
            })),
            registered: count,
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
  );
