import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { db } from '../db/db';
import {
  customers,
  customerReservations,
  employees,
  employeeTypes,
  lectures,
  paymentHistory,
  persons,
  rooms,
  schedules,
  scheduleInstructors,
  subscriptions,
} from '../db/schema';
import { NotFoundError, UnauthorizedError } from '../lib/errors';
import { notDeleted } from '../lib/notDeleted';

// ── Admin ─────────────────────────────────────────────────────────────

export async function getAdminOverview() {
  const [memberships] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(customers)
    .where(and(gte(customers.subscriptionValidUntil, sql`current_date`), notDeleted(customers)));

  const [revenue] = await db
    .select({ total: sql<number>`coalesce(sum(${paymentHistory.amount}), 0)::float` })
    .from(paymentHistory)
    .where(
      and(
        gte(paymentHistory.paymentDate, sql`date_trunc('month', current_date)`),
        notDeleted(paymentHistory),
      ),
    );

  const [reservations] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(customerReservations)
    .innerJoin(schedules, eq(customerReservations.scheduleId, schedules.id))
    .where(
      and(
        gte(schedules.startTime, sql`date_trunc('month', current_date)`),
        notDeleted(customerReservations),
        notDeleted(schedules),
      ),
    );

  const [occupancy] = await db
    .select({
      pct: sql<number>`coalesce(avg(
        case when ${rooms.capacity} > 0
          then coalesce(res_counts.cnt, 0)::float / ${rooms.capacity} * 100
          else 0
        end
      ), 0)::float`,
    })
    .from(schedules)
    .innerJoin(rooms, eq(schedules.roomId, rooms.id))
    .leftJoin(
      sql`(
        select ${customerReservations.scheduleId} as schedule_id, count(*)::int as cnt
        from ${customerReservations}
        where ${customerReservations.deletedAt} is null
        group by ${customerReservations.scheduleId}
      ) res_counts`,
      sql`res_counts.schedule_id = ${schedules.id}`,
    )
    .where(
      and(
        gte(schedules.startTime, sql`date_trunc('month', current_date)`),
        notDeleted(schedules),
        notDeleted(rooms),
      ),
    );

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
      month: sql<string>`to_char(${paymentHistory.paymentDate}, 'YYYY-MM')`,
      total: sql<number>`sum(${paymentHistory.amount})::float`,
    })
    .from(paymentHistory)
    .where(
      and(
        gte(
          paymentHistory.paymentDate,
          sql`(date_trunc('month', current_date) - (${months - 1} || ' months')::interval)`,
        ),
        notDeleted(paymentHistory),
      ),
    )
    .groupBy(sql`1`)
    .orderBy(sql`1`);
}

export async function getRevenueBySubscription() {
  return db
    .select({
      subscriptionName: subscriptions.name,
      total: sql<number>`sum(${paymentHistory.amount})::float`,
      count: sql<number>`count(*)::int`,
    })
    .from(paymentHistory)
    .innerJoin(subscriptions, eq(paymentHistory.subscriptionId, subscriptions.id))
    .where(and(notDeleted(paymentHistory), notDeleted(subscriptions)))
    .groupBy(subscriptions.id, subscriptions.name)
    .orderBy(sql`sum(${paymentHistory.amount}) desc`);
}

export async function getTopLectures(limitRaw = 10) {
  const limit = Math.min(Math.max(limitRaw, 1), 50);
  return db
    .select({
      lectureName: lectures.lectureName,
      reservationCount: sql<number>`count(${customerReservations.customerId})::int`,
    })
    .from(customerReservations)
    .innerJoin(schedules, eq(customerReservations.scheduleId, schedules.id))
    .innerJoin(lectures, eq(schedules.lectureId, lectures.id))
    .where(and(notDeleted(customerReservations), notDeleted(schedules), notDeleted(lectures)))
    .groupBy(lectures.id, lectures.lectureName)
    .orderBy(desc(sql`count(${customerReservations.customerId})`))
    .limit(limit);
}

export async function getOccupancy() {
  const rows = await db
    .select({
      lectureName: lectures.lectureName,
      avgReservations: sql<number>`avg(coalesce(res_counts.cnt, 0))::float`,
      capacity: sql<number>`avg(${rooms.capacity})::float`,
      occupancyPct: sql<number>`avg(
        case when ${rooms.capacity} > 0
          then coalesce(res_counts.cnt, 0)::float / ${rooms.capacity} * 100
          else 0
        end
      )::float`,
    })
    .from(schedules)
    .innerJoin(lectures, eq(schedules.lectureId, lectures.id))
    .innerJoin(rooms, eq(schedules.roomId, rooms.id))
    .leftJoin(
      sql`(
        select ${customerReservations.scheduleId} as schedule_id, count(*)::int as cnt
        from ${customerReservations}
        where ${customerReservations.deletedAt} is null
        group by ${customerReservations.scheduleId}
      ) res_counts`,
      sql`res_counts.schedule_id = ${schedules.id}`,
    )
    .where(and(notDeleted(schedules), notDeleted(lectures), notDeleted(rooms)))
    .groupBy(lectures.id, lectures.lectureName)
    .orderBy(
      desc(sql`avg(
        case when ${rooms.capacity} > 0
          then res_counts.cnt::float / ${rooms.capacity} * 100
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
      employeeId: employees.id,
      employeeType: employeeTypes.roleName,
    })
    .from(employees)
    .innerJoin(persons, eq(employees.personId, persons.id))
    .innerJoin(employeeTypes, eq(employees.employeeTypeId, employeeTypes.id))
    .where(
      and(
        eq(persons.clerkId, clerkId),
        notDeleted(employees),
        notDeleted(persons),
        notDeleted(employeeTypes),
      ),
    )
    .limit(1);

  if (!employee) throw new NotFoundError('Employee profile not found');

  if (employee.employeeType !== 'Instructor') {
    return { employeeType: employee.employeeType, available: false as const };
  }

  const monthStart = sql`date_trunc('month', current_date)`;

  const [monthLectures] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(scheduleInstructors)
    .innerJoin(schedules, eq(scheduleInstructors.scheduleId, schedules.id))
    .where(
      and(
        eq(scheduleInstructors.employeeId, employee.employeeId),
        gte(schedules.startTime, monthStart),
        notDeleted(scheduleInstructors),
        notDeleted(schedules),
      ),
    );

  const [monthAttendees] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(customerReservations)
    .innerJoin(
      scheduleInstructors,
      eq(customerReservations.scheduleId, scheduleInstructors.scheduleId),
    )
    .innerJoin(schedules, eq(customerReservations.scheduleId, schedules.id))
    .where(
      and(
        eq(scheduleInstructors.employeeId, employee.employeeId),
        gte(schedules.startTime, monthStart),
        notDeleted(customerReservations),
        notDeleted(scheduleInstructors),
        notDeleted(schedules),
      ),
    );

  const [fillRate] = await db
    .select({
      pct: sql<number>`coalesce(avg(
        case when ${rooms.capacity} > 0
          then coalesce(res_counts.cnt, 0)::float / ${rooms.capacity} * 100
          else 0
        end
      ), 0)::float`,
    })
    .from(schedules)
    .innerJoin(scheduleInstructors, eq(scheduleInstructors.scheduleId, schedules.id))
    .innerJoin(rooms, eq(schedules.roomId, rooms.id))
    .leftJoin(
      sql`(
        select ${customerReservations.scheduleId} as schedule_id, count(*)::int as cnt
        from ${customerReservations}
        where ${customerReservations.deletedAt} is null
        group by ${customerReservations.scheduleId}
      ) res_counts`,
      sql`res_counts.schedule_id = ${schedules.id}`,
    )
    .where(
      and(
        eq(scheduleInstructors.employeeId, employee.employeeId),
        notDeleted(schedules),
        notDeleted(scheduleInstructors),
        notDeleted(rooms),
      ),
    );

  const lecturesByMonth = await db
    .select({
      month: sql<string>`to_char(${schedules.startTime}, 'YYYY-MM')`,
      count: sql<number>`count(*)::int`,
    })
    .from(scheduleInstructors)
    .innerJoin(schedules, eq(scheduleInstructors.scheduleId, schedules.id))
    .where(
      and(
        eq(scheduleInstructors.employeeId, employee.employeeId),
        gte(schedules.startTime, sql`(date_trunc('month', current_date) - interval '5 months')`),
        notDeleted(scheduleInstructors),
        notDeleted(schedules),
      ),
    )
    .groupBy(sql`1`)
    .orderBy(sql`1`);

  const [mostPopular] = await db
    .select({
      lectureName: lectures.lectureName,
      reservationCount: sql<number>`count(${customerReservations.customerId})::int`,
    })
    .from(scheduleInstructors)
    .innerJoin(schedules, eq(scheduleInstructors.scheduleId, schedules.id))
    .innerJoin(lectures, eq(schedules.lectureId, lectures.id))
    .leftJoin(
      customerReservations,
      and(eq(customerReservations.scheduleId, schedules.id), notDeleted(customerReservations)),
    )
    .where(
      and(
        eq(scheduleInstructors.employeeId, employee.employeeId),
        notDeleted(scheduleInstructors),
        notDeleted(schedules),
        notDeleted(lectures),
      ),
    )
    .groupBy(lectures.id, lectures.lectureName)
    .orderBy(desc(sql`count(${customerReservations.customerId})`))
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
