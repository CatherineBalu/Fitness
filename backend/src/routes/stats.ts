import { Elysia, t } from 'elysia';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { db } from '../db/db';
import {
  tbCustomer,
  tbCustomerReservation,
  tbEmployee,
  tbEmployeeType,
  tbLecture,
  tbPaymentHistory,
  tbPerson,
  tbRoom,
  tbSchedule,
  tbScheduleInstructor,
  tbSubscription,
} from '../db/schema';
import { requirePermission } from '../middleware/auth';

// ── Admin ─────────────────────────────────────────────────────────────

export const adminStatsRoutes = new Elysia({ prefix: '/api/stats/admin' })
  .use(requirePermission('stats:admin'))

  // GET /api/stats/admin/overview — KPI cards
  .get('/overview', async () => {
    const [memberships] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(tbCustomer)
      .where(gte(tbCustomer.subscriptionValidUntil, sql`current_date`));

    const [revenue] = await db
      .select({ total: sql<number>`coalesce(sum(${tbPaymentHistory.amount}), 0)::float` })
      .from(tbPaymentHistory)
      .where(gte(tbPaymentHistory.paymentDate, sql`date_trunc('month', current_date)`));

    const [reservations] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(tbCustomerReservation)
      .innerJoin(tbSchedule, eq(tbCustomerReservation.scheduleId, tbSchedule.id))
      .where(gte(tbSchedule.startTime, sql`date_trunc('month', current_date)`));

    const [occupancy] = await db
      .select({
        pct: sql<number>`coalesce(avg(
          case when ${tbRoom.capacity} > 0
            then coalesce(res_counts.cnt, 0)::float / ${tbRoom.capacity} * 100
            else 0
          end
        ), 0)::float`,
      })
      .from(tbSchedule)
      .innerJoin(tbRoom, eq(tbSchedule.roomId, tbRoom.id))
      .leftJoin(
        sql`(
          select ${tbCustomerReservation.scheduleId} as schedule_id, count(*)::int as cnt
          from ${tbCustomerReservation}
          group by ${tbCustomerReservation.scheduleId}
        ) res_counts`,
        sql`res_counts.schedule_id = ${tbSchedule.id}`,
      )
      .where(gte(tbSchedule.startTime, sql`date_trunc('month', current_date)`));

    return {
      activeMemberships: memberships.count,
      monthRevenue: revenue.total,
      monthReservations: reservations.count,
      avgOccupancyPct: Math.round((occupancy.pct ?? 0) * 10) / 10,
    };
  })

  // GET /api/stats/admin/revenue-monthly?months=12
  .get(
    '/revenue-monthly',
    async ({ query }) => {
      const months = Math.min(Math.max(query.months ?? 12, 1), 36);

      const rows = await db
        .select({
          month: sql<string>`to_char(${tbPaymentHistory.paymentDate}, 'YYYY-MM')`,
          total: sql<number>`sum(${tbPaymentHistory.amount})::float`,
        })
        .from(tbPaymentHistory)
        .where(
          gte(
            tbPaymentHistory.paymentDate,
            sql`(date_trunc('month', current_date) - (${months - 1} || ' months')::interval)`,
          ),
        )
        .groupBy(sql`1`)
        .orderBy(sql`1`);

      return rows;
    },
    {
      query: t.Object({ months: t.Optional(t.Numeric()) }),
    },
  )

  // GET /api/stats/admin/revenue-by-subscription
  .get('/revenue-by-subscription', async () => {
    const rows = await db
      .select({
        subscriptionName: tbSubscription.name,
        total: sql<number>`sum(${tbPaymentHistory.amount})::float`,
        count: sql<number>`count(*)::int`,
      })
      .from(tbPaymentHistory)
      .innerJoin(tbSubscription, eq(tbPaymentHistory.subscriptionId, tbSubscription.id))
      .groupBy(tbSubscription.id, tbSubscription.name)
      .orderBy(sql`sum(${tbPaymentHistory.amount}) desc`);

    return rows;
  })

  // GET /api/stats/admin/top-lectures?limit=10
  .get(
    '/top-lectures',
    async ({ query }) => {
      const limit = Math.min(Math.max(query.limit ?? 10, 1), 50);

      const rows = await db
        .select({
          lectureName: tbLecture.lectureName,
          reservationCount: sql<number>`count(${tbCustomerReservation.customerId})::int`,
        })
        .from(tbCustomerReservation)
        .innerJoin(tbSchedule, eq(tbCustomerReservation.scheduleId, tbSchedule.id))
        .innerJoin(tbLecture, eq(tbSchedule.lectureId, tbLecture.id))
        .groupBy(tbLecture.id, tbLecture.lectureName)
        .orderBy(desc(sql`count(${tbCustomerReservation.customerId})`))
        .limit(limit);

      return rows;
    },
    {
      query: t.Object({ limit: t.Optional(t.Numeric()) }),
    },
  )

  // GET /api/stats/admin/occupancy
  .get('/occupancy', async () => {
    const rows = await db
      .select({
        lectureName: tbLecture.lectureName,
        avgReservations: sql<number>`avg(coalesce(res_counts.cnt, 0))::float`,
        capacity: sql<number>`avg(${tbRoom.capacity})::float`,
        occupancyPct: sql<number>`avg(
          case when ${tbRoom.capacity} > 0
            then coalesce(res_counts.cnt, 0)::float / ${tbRoom.capacity} * 100
            else 0
          end
        )::float`,
      })
      .from(tbSchedule)
      .innerJoin(tbLecture, eq(tbSchedule.lectureId, tbLecture.id))
      .innerJoin(tbRoom, eq(tbSchedule.roomId, tbRoom.id))
      .leftJoin(
        sql`(
          select ${tbCustomerReservation.scheduleId} as schedule_id, count(*)::int as cnt
          from ${tbCustomerReservation}
          group by ${tbCustomerReservation.scheduleId}
        ) res_counts`,
        sql`res_counts.schedule_id = ${tbSchedule.id}`,
      )
      .groupBy(tbLecture.id, tbLecture.lectureName)
      .orderBy(
        desc(sql`avg(
          case when ${tbRoom.capacity} > 0
            then res_counts.cnt::float / ${tbRoom.capacity} * 100
            else 0
          end
        )`),
      );

    return rows.map((r) => ({
      lectureName: r.lectureName,
      avgReservations: Math.round(r.avgReservations * 10) / 10,
      capacity: Math.round(r.capacity),
      occupancyPct: Math.round(r.occupancyPct * 10) / 10,
    }));
  });

// ── Staff (instructor-owned) ──────────────────────────────────────────

export const staffStatsRoutes = new Elysia({ prefix: '/api/stats/staff' })
  .use(requirePermission('stats:staff'))

  // GET /api/stats/staff/me — instructor: own stats; reception: { available: false }
  .get('/me', async ({ set, ...rest }) => {
    const auth = (rest as unknown as { auth: { userId: string } }).auth;

    if (!auth) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    const [employee] = await db
      .select({
        employeeId: tbEmployee.id,
        employeeType: tbEmployeeType.roleName,
      })
      .from(tbEmployee)
      .innerJoin(tbPerson, eq(tbEmployee.personId, tbPerson.id))
      .innerJoin(tbEmployeeType, eq(tbEmployee.employeeTypeId, tbEmployeeType.id))
      .where(eq(tbPerson.clerkId, auth!.userId))
      .limit(1);

    if (!employee) {
      set.status = 404;
      return { error: 'Employee profile not found' };
    }

    if (employee.employeeType !== 'Instructor') {
      return { employeeType: employee.employeeType, available: false as const };
    }

    const monthStart = sql`date_trunc('month', current_date)`;

    const [monthLectures] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(tbScheduleInstructor)
      .innerJoin(tbSchedule, eq(tbScheduleInstructor.scheduleId, tbSchedule.id))
      .where(
        and(
          eq(tbScheduleInstructor.employeeId, employee.employeeId),
          gte(tbSchedule.startTime, monthStart),
        ),
      );

    const [monthAttendees] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(tbCustomerReservation)
      .innerJoin(
        tbScheduleInstructor,
        eq(tbCustomerReservation.scheduleId, tbScheduleInstructor.scheduleId),
      )
      .innerJoin(tbSchedule, eq(tbCustomerReservation.scheduleId, tbSchedule.id))
      .where(
        and(
          eq(tbScheduleInstructor.employeeId, employee.employeeId),
          gte(tbSchedule.startTime, monthStart),
        ),
      );

    const [fillRate] = await db
      .select({
        pct: sql<number>`coalesce(avg(
          case when ${tbRoom.capacity} > 0
            then coalesce(res_counts.cnt, 0)::float / ${tbRoom.capacity} * 100
            else 0
          end
        ), 0)::float`,
      })
      .from(tbSchedule)
      .innerJoin(tbScheduleInstructor, eq(tbScheduleInstructor.scheduleId, tbSchedule.id))
      .innerJoin(tbRoom, eq(tbSchedule.roomId, tbRoom.id))
      .leftJoin(
        sql`(
          select ${tbCustomerReservation.scheduleId} as schedule_id, count(*)::int as cnt
          from ${tbCustomerReservation}
          group by ${tbCustomerReservation.scheduleId}
        ) res_counts`,
        sql`res_counts.schedule_id = ${tbSchedule.id}`,
      )
      .where(eq(tbScheduleInstructor.employeeId, employee.employeeId));

    const lecturesByMonth = await db
      .select({
        month: sql<string>`to_char(${tbSchedule.startTime}, 'YYYY-MM')`,
        count: sql<number>`count(*)::int`,
      })
      .from(tbScheduleInstructor)
      .innerJoin(tbSchedule, eq(tbScheduleInstructor.scheduleId, tbSchedule.id))
      .where(
        and(
          eq(tbScheduleInstructor.employeeId, employee.employeeId),
          gte(tbSchedule.startTime, sql`(date_trunc('month', current_date) - interval '5 months')`),
        ),
      )
      .groupBy(sql`1`)
      .orderBy(sql`1`);

    const [mostPopular] = await db
      .select({
        lectureName: tbLecture.lectureName,
        reservationCount: sql<number>`count(${tbCustomerReservation.customerId})::int`,
      })
      .from(tbScheduleInstructor)
      .innerJoin(tbSchedule, eq(tbScheduleInstructor.scheduleId, tbSchedule.id))
      .innerJoin(tbLecture, eq(tbSchedule.lectureId, tbLecture.id))
      .leftJoin(tbCustomerReservation, eq(tbCustomerReservation.scheduleId, tbSchedule.id))
      .where(eq(tbScheduleInstructor.employeeId, employee.employeeId))
      .groupBy(tbLecture.id, tbLecture.lectureName)
      .orderBy(desc(sql`count(${tbCustomerReservation.customerId})`))
      .limit(1);

    return {
      employeeType: 'Instructor' as const,
      available: true as const,
      monthLectureCount: monthLectures.count,
      monthAttendees: monthAttendees.count,
      avgFillRatePct: Math.round(fillRate.pct * 10) / 10,
      lecturesByMonth,
      mostPopularLecture: mostPopular ?? null,
    };
  });
