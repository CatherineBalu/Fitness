/**
 * TEMPORARY demo seed — populates customers, payment history and reservations
 * so admin statistics have something to display. Safe to delete once real Clerk
 * signups + reservation flow fill the DB naturally.
 *
 * Run:  cd backend && bun run src/db/seed.demo.ts
 */
import { faker } from '@faker-js/faker';
import { db, closeConnection } from './db';
import {
  tbEmployeeType,
  tbSubscription,
  tbRoom,
  tbExerciseType,
  tbPerson,
  tbEmployee,
  tbEmployeeSpecialization,
  tbCustomer,
  tbLecture,
  tbSchedule,
  tbScheduleInstructor,
  tbCustomerReservation,
  tbPaymentHistory,
} from './schema';

console.log('TESTING DB URL:', process.env.DATABASE_URL);

function getCurrentWeekMonday(): Date {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff));
}

function weekDay(monday: Date, dayOffset: number, hour: number, minutes = 0): Date {
  const d = new Date(monday);
  d.setUTCDate(d.getUTCDate() + dayOffset);
  d.setUTCHours(hour, minutes, 0, 0);
  return d;
}

/** Random integer in [min, max] inclusive */
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Pick N distinct elements from an array */
function pickN<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

async function main() {
  console.log('Starting DEMO seeding the database');

  try {
    // 1. Clear (order matters for FKs — payments + reservations first)
    console.log('Deleting old data');
    await db.delete(tbPaymentHistory);
    await db.delete(tbCustomerReservation);
    await db.delete(tbScheduleInstructor);
    await db.delete(tbSchedule);
    await db.delete(tbLecture);
    await db.delete(tbCustomer);
    await db.delete(tbEmployeeSpecialization);
    await db.delete(tbEmployee);
    await db.delete(tbPerson);
    await db.delete(tbEmployeeType);
    await db.delete(tbSubscription);
    await db.delete(tbRoom);
    await db.delete(tbExerciseType);

    // 2. Base data
    console.log('Creating base data');
    const [trainerRole, receptionRole] = await db
      .insert(tbEmployeeType)
      .values([{ roleName: 'Instructor' }, { roleName: 'Reception' }])
      .returning();

    const subscriptions = await db
      .insert(tbSubscription)
      .values([
        { name: 'Monthly Basic', price: '29.99', durationDays: 30 },
        { name: 'Year PRO', price: '299.99', durationDays: 365 },
      ])
      .returning();
    const [subMonthly, subYearly] = subscriptions;

    const rooms = await db
      .insert(tbRoom)
      .values([
        { name: 'Room A', capacity: 15 },
        { name: 'Room B', capacity: 20 },
        { name: 'Room C', capacity: 25 },
        { name: 'Room D', capacity: 12 },
      ])
      .returning();
    const [roomA, roomB, roomC, roomD] = rooms;

    const exerciseTypes = await db
      .insert(tbExerciseType)
      .values([
        { name: 'Yoga' },
        { name: 'Power' },
        { name: 'Cardio' },
        { name: 'Jumping fitness' },
        { name: 'Pilates' },
        { name: 'Spinning' },
      ])
      .returning();
    const [yoga, power, cardio, jumping, pilates, spinning] = exerciseTypes;

    // 3. Trainers + reception
    console.log('Creating persons');
    const trainerNames = [
      { name: 'Sarah', surname: 'Miller' },
      { name: 'Mike', surname: 'Johnson' },
      { name: 'Jana', surname: 'Novak' },
      { name: 'Lucia', surname: 'Fernandez' },
      { name: 'Tom', surname: 'Kral' },
    ];

    const trainerPersons = await db
      .insert(tbPerson)
      .values(
        trainerNames.map((t, i) => ({
          clerkId: `seed_instructor_${i + 1}`,
          name: t.name,
          surname: t.surname,
          email: `${t.name.toLowerCase()}@gym.com`,
          phoneNumber: faker.phone.number(),
        })),
      )
      .returning();

    const receptionPerson = (
      await db
        .insert(tbPerson)
        .values({
          clerkId: 'seed_reception_1',
          name: 'Admin',
          surname: 'User',
          email: 'admin@gym.com',
          phoneNumber: faker.phone.number(),
        })
        .returning()
    )[0];

    console.log('Creating employees');
    const trainers = await db
      .insert(tbEmployee)
      .values(
        trainerPersons.map((p) => ({
          personId: p.id,
          employeeTypeId: trainerRole.id,
          hireDate: new Date().toISOString(),
        })),
      )
      .returning();

    await db.insert(tbEmployee).values({
      personId: receptionPerson.id,
      employeeTypeId: receptionRole.id,
      hireDate: new Date().toISOString(),
    });

    const [sarah, mike, jana, lucia, tom] = trainers;

    console.log('Assigning specializations');
    await db.insert(tbEmployeeSpecialization).values([
      { employeeId: sarah.id, exerciseTypeId: yoga.id },
      { employeeId: mike.id, exerciseTypeId: power.id },
      { employeeId: jana.id, exerciseTypeId: cardio.id },
      { employeeId: jana.id, exerciseTypeId: spinning.id },
      { employeeId: lucia.id, exerciseTypeId: jumping.id },
      { employeeId: tom.id, exerciseTypeId: power.id },
      { employeeId: tom.id, exerciseTypeId: pilates.id },
    ]);

    // 4. Demo customers — 12 fake people. clerkIds never match real Clerk users.
    console.log('Creating demo customers');
    const CUSTOMER_COUNT = 12;
    const customerPersons = await db
      .insert(tbPerson)
      .values(
        Array.from({ length: CUSTOMER_COUNT }, (_, i) => {
          const name = faker.person.firstName();
          const surname = faker.person.lastName();
          return {
            clerkId: `seed_customer_${i + 1}`,
            name,
            surname,
            email: `${name.toLowerCase()}.${surname.toLowerCase()}.${i + 1}@demo.test`,
            phoneNumber: faker.phone.number(),
          };
        }),
      )
      .returning();

    // 8 active subscribers (5 monthly, 3 yearly), 4 expired / no subscription
    const today = new Date();
    const customerRows = customerPersons.map((p, i) => {
      if (i < 5) {
        // Monthly active — valid for ~15-30 days from today
        const validUntil = new Date(today);
        validUntil.setUTCDate(validUntil.getUTCDate() + randInt(15, 30));
        return {
          personId: p.id,
          subscriptionId: subMonthly.id,
          subscriptionValidUntil: validUntil.toISOString().slice(0, 10),
        };
      }
      if (i < 8) {
        // Yearly active — valid 3-10 months from today
        const validUntil = new Date(today);
        validUntil.setUTCMonth(validUntil.getUTCMonth() + randInt(3, 10));
        return {
          personId: p.id,
          subscriptionId: subYearly.id,
          subscriptionValidUntil: validUntil.toISOString().slice(0, 10),
        };
      }
      // Expired / none
      const expired = new Date(today);
      expired.setUTCMonth(expired.getUTCMonth() - randInt(1, 6));
      return {
        personId: p.id,
        subscriptionId: i === 11 ? null : subMonthly.id,
        subscriptionValidUntil: i === 11 ? null : expired.toISOString().slice(0, 10),
      };
    });

    const customers = await db.insert(tbCustomer).values(customerRows).returning();

    // 5. Lectures
    console.log('Creating lectures');
    const lectures = await db
      .insert(tbLecture)
      .values([
        {
          exerciseTypeId: yoga.id,
          lectureName: 'Vinyasa Yoga',
          description: 'Flowing yoga sequences',
          forMembers: false,
        },
        {
          exerciseTypeId: yoga.id,
          lectureName: 'Morning Yoga',
          description: 'Gentle morning stretch',
          forMembers: false,
        },
        {
          exerciseTypeId: yoga.id,
          lectureName: 'Power Yoga',
          description: 'Strength-focused yoga',
          forMembers: false,
        },
        {
          exerciseTypeId: power.id,
          lectureName: 'Power Training',
          description: 'Full body strength',
          forMembers: false,
        },
        {
          exerciseTypeId: power.id,
          lectureName: 'Power Lifting',
          description: 'Heavy compound lifts',
          forMembers: true,
        },
        {
          exerciseTypeId: power.id,
          lectureName: 'Power Hour',
          description: 'Intense power session',
          forMembers: false,
        },
        {
          exerciseTypeId: cardio.id,
          lectureName: 'HIIT Cardio',
          description: 'High intensity intervals',
          forMembers: false,
        },
        {
          exerciseTypeId: spinning.id,
          lectureName: 'Spin Class',
          description: 'Indoor cycling workout',
          forMembers: true,
        },
        {
          exerciseTypeId: cardio.id,
          lectureName: 'Cardio Blast',
          description: 'Mixed cardio drills',
          forMembers: false,
        },
        {
          exerciseTypeId: jumping.id,
          lectureName: 'Jumping Fitness',
          description: 'Trampoline-based workout',
          forMembers: false,
        },
      ])
      .returning();
    const lec = Object.fromEntries(lectures.map((l) => [l.lectureName, l.id]));

    // 6. Schedule — previous / current / next week
    console.log('Creating schedule');
    const mon = getCurrentWeekMonday();
    const scheduleEntries: {
      lectureName: string;
      room: (typeof rooms)[number];
      day: number;
      startH: number;
      startM: number;
      endH: number;
      endM: number;
      lead: (typeof trainers)[number];
      assist?: (typeof trainers)[number];
    }[] = [
      {
        lectureName: 'Morning Yoga',
        room: roomA,
        day: 0,
        startH: 7,
        startM: 0,
        endH: 8,
        endM: 0,
        lead: sarah,
      },
      {
        lectureName: 'HIIT Cardio',
        room: roomC,
        day: 0,
        startH: 9,
        startM: 0,
        endH: 10,
        endM: 0,
        lead: jana,
      },
      {
        lectureName: 'Power Training',
        room: roomB,
        day: 0,
        startH: 17,
        startM: 0,
        endH: 18,
        endM: 0,
        lead: mike,
      },
      {
        lectureName: 'Spin Class',
        room: roomC,
        day: 1,
        startH: 7,
        startM: 0,
        endH: 8,
        endM: 0,
        lead: jana,
      },
      {
        lectureName: 'Vinyasa Yoga',
        room: roomA,
        day: 1,
        startH: 10,
        startM: 0,
        endH: 11,
        endM: 0,
        lead: sarah,
      },
      {
        lectureName: 'Jumping Fitness',
        room: roomD,
        day: 1,
        startH: 18,
        startM: 0,
        endH: 19,
        endM: 0,
        lead: lucia,
      },
      {
        lectureName: 'Morning Yoga',
        room: roomA,
        day: 2,
        startH: 7,
        startM: 0,
        endH: 8,
        endM: 0,
        lead: sarah,
      },
      {
        lectureName: 'Cardio Blast',
        room: roomC,
        day: 2,
        startH: 11,
        startM: 0,
        endH: 12,
        endM: 0,
        lead: jana,
        assist: tom,
      },
      {
        lectureName: 'Power Lifting',
        room: roomB,
        day: 2,
        startH: 16,
        startM: 0,
        endH: 17,
        endM: 0,
        lead: mike,
      },
      {
        lectureName: 'Vinyasa Yoga',
        room: roomA,
        day: 2,
        startH: 18,
        startM: 0,
        endH: 19,
        endM: 0,
        lead: sarah,
      },
      {
        lectureName: 'Spin Class',
        room: roomC,
        day: 3,
        startH: 7,
        startM: 0,
        endH: 8,
        endM: 0,
        lead: jana,
      },
      {
        lectureName: 'Power Hour',
        room: roomB,
        day: 3,
        startH: 12,
        startM: 0,
        endH: 13,
        endM: 0,
        lead: mike,
        assist: tom,
      },
      {
        lectureName: 'Power Yoga',
        room: roomA,
        day: 3,
        startH: 17,
        startM: 0,
        endH: 18,
        endM: 0,
        lead: sarah,
      },
      {
        lectureName: 'HIIT Cardio',
        room: roomC,
        day: 4,
        startH: 9,
        startM: 0,
        endH: 10,
        endM: 0,
        lead: jana,
      },
      {
        lectureName: 'Power Training',
        room: roomB,
        day: 4,
        startH: 10,
        startM: 0,
        endH: 11,
        endM: 0,
        lead: mike,
      },
      {
        lectureName: 'Jumping Fitness',
        room: roomD,
        day: 4,
        startH: 17,
        startM: 0,
        endH: 18,
        endM: 0,
        lead: lucia,
      },
      {
        lectureName: 'Cardio Blast',
        room: roomC,
        day: 4,
        startH: 18,
        startM: 0,
        endH: 19,
        endM: 0,
        lead: tom,
      },
      {
        lectureName: 'Vinyasa Yoga',
        room: roomA,
        day: 5,
        startH: 10,
        startM: 0,
        endH: 11,
        endM: 0,
        lead: sarah,
      },
      {
        lectureName: 'Power Hour',
        room: roomB,
        day: 5,
        startH: 14,
        startM: 0,
        endH: 15,
        endM: 0,
        lead: mike,
      },
      {
        lectureName: 'Jumping Fitness',
        room: roomD,
        day: 5,
        startH: 16,
        startM: 0,
        endH: 17,
        endM: 0,
        lead: lucia,
        assist: tom,
      },
      {
        lectureName: 'Morning Yoga',
        room: roomA,
        day: 6,
        startH: 9,
        startM: 0,
        endH: 10,
        endM: 0,
        lead: sarah,
      },
      {
        lectureName: 'Cardio Blast',
        room: roomC,
        day: 6,
        startH: 11,
        startM: 0,
        endH: 12,
        endM: 0,
        lead: jana,
      },
      {
        lectureName: 'Jumping Fitness',
        room: roomD,
        day: 6,
        startH: 15,
        startM: 0,
        endH: 16,
        endM: 0,
        lead: lucia,
      },
    ];

    const weekOffsets = [-1, 0, 1];
    const scheduleValues = weekOffsets.flatMap((weekOffset) => {
      const weekMon = new Date(mon);
      weekMon.setUTCDate(weekMon.getUTCDate() + weekOffset * 7);
      return scheduleEntries.map((e) => ({
        lectureId: lec[e.lectureName],
        roomId: e.room.id,
        startTime: weekDay(weekMon, e.day, e.startH, e.startM),
        endTime: weekDay(weekMon, e.day, e.endH, e.endM),
      }));
    });

    const createdSchedules = await db.insert(tbSchedule).values(scheduleValues).returning();

    console.log('Assigning instructors');
    const instructorValues = createdSchedules.flatMap((schedule, i) => {
      const entry = scheduleEntries[i % scheduleEntries.length];
      const entries = [{ scheduleId: schedule.id, employeeId: entry.lead.id, isLead: true }];
      if (entry.assist) {
        entries.push({ scheduleId: schedule.id, employeeId: entry.assist.id, isLead: false });
      }
      return entries;
    });
    await db.insert(tbScheduleInstructor).values(instructorValues);

    // 7. Payment history — 12 months back
    console.log('Creating payment history');
    type PaymentRow = typeof tbPaymentHistory.$inferInsert;
    const payments: PaymentRow[] = [];
    const methods = ['card', 'cash', 'transfer'];

    for (const c of customers) {
      if (!c.subscriptionId) continue;

      const sub = c.subscriptionId === subMonthly.id ? subMonthly : subYearly;
      // 2–6 historical payments per subscriber, spread over last 12 months
      const count = randInt(2, 6);
      for (let i = 0; i < count; i++) {
        const monthsAgo = randInt(0, 11);
        const d = new Date(today);
        d.setUTCMonth(d.getUTCMonth() - monthsAgo);
        d.setUTCDate(randInt(1, 27));
        payments.push({
          customerId: c.id,
          subscriptionId: sub.id,
          amount: sub.price,
          paymentDate: d,
          paymentMethod: methods[randInt(0, methods.length - 1)],
        });
      }
    }

    // Guarantee at least some revenue in the current month for KPI cards
    for (let i = 0; i < 5; i++) {
      const c = customers[i];
      if (!c.subscriptionId) continue;
      const sub = c.subscriptionId === subMonthly.id ? subMonthly : subYearly;
      const d = new Date(today);
      d.setUTCDate(randInt(1, Math.max(1, today.getUTCDate())));
      payments.push({
        customerId: c.id,
        subscriptionId: sub.id,
        amount: sub.price,
        paymentDate: d,
        paymentMethod: methods[randInt(0, methods.length - 1)],
      });
    }

    await db.insert(tbPaymentHistory).values(payments);

    // 8. Reservations — 3-9 per schedule, random customers, capped by capacity
    console.log('Creating reservations');
    type ReservationRow = typeof tbCustomerReservation.$inferInsert;
    const reservations: ReservationRow[] = [];

    // Build capacity lookup via lecture → room (we only need room capacity per schedule)
    const roomByScheduleId = new Map(createdSchedules.map((s) => [s.id, s.roomId]));
    const capacityByRoomId = new Map(rooms.map((r) => [r.id, r.capacity]));

    for (const s of createdSchedules) {
      const cap = capacityByRoomId.get(roomByScheduleId.get(s.id)!) ?? 15;
      const desired = randInt(3, Math.min(9, cap));
      const attendees = pickN(customers, desired);
      for (const a of attendees) {
        // Reservation created 1-10 days before the schedule
        const rd = new Date(s.startTime);
        rd.setUTCDate(rd.getUTCDate() - randInt(1, 10));
        // Clamp to the past so reservationDate <= now
        if (rd > today) rd.setTime(today.getTime());
        reservations.push({
          customerId: a.id,
          scheduleId: s.id,
          reservationDate: rd,
        });
      }
    }

    await db.insert(tbCustomerReservation).values(reservations);

    console.log(
      `DEMO seed complete: ${customers.length} customers, ${payments.length} payments, ${reservations.length} reservations across ${createdSchedules.length} schedules`,
    );
  } catch (error) {
    console.error('Error while seeding', error);
  } finally {
    await closeConnection();
  }
}

main();
