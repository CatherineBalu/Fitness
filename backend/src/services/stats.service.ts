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
import { NotFoundError, UnauthorizedError } from '../lib/errors';

// ── Admin ─────────────────────────────────────────────────────────────

export async function getAdminOverview() {
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
}

export async function getRevenueMonthly(monthsRaw = 12) {
  const months = Math.min(Math.max(monthsRaw, 1), 36);
  return db
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
}

export async function getRevenueBySubscription() {
  return db
    .select({
      subscriptionName: tbSubscription.name,
      total: sql<number>`sum(${tbPaymentHistory.amount})::float`,
      count: sql<number>`count(*)::int`,
    })
    .from(tbPaymentHistory)
    .innerJoin(tbSubscription, eq(tbPaymentHistory.subscriptionId, tbSubscription.id))
    .groupBy(tbSubscription.id, tbSubscription.name)
    .orderBy(sql`sum(${tbPaymentHistory.amount}) desc`);
}

export async function getTopLectures(limitRaw = 10) {
  const limit = Math.min(Math.max(limitRaw, 1), 50);
  return db
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
}

export async function getOccupancy() {
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
}

// ── Staff (instructor-owned) ──────────────────────────────────────────

export async function getInstructorStats(clerkId: string | null) {
  if (!clerkId) throw new UnauthorizedError();

  const [employee] = await db
    .select({
      employeeId: tbEmployee.id,
      employeeType: tbEmployeeType.roleName,
    })
    .from(tbEmployee)
    .innerJoin(tbPerson, eq(tbEmployee.personId, tbPerson.id))
    .innerJoin(tbEmployeeType, eq(tbEmployee.employeeTypeId, tbEmployeeType.id))
    .where(eq(tbPerson.clerkId, clerkId))
    .limit(1);

  if (!employee) throw new NotFoundError('Employee profile not found');

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
}
