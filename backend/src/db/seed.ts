import { faker } from '@faker-js/faker';

import { db, closeConnection } from './db';
import * as schema from './schema';

console.log('TESTING DB URL:', process.env.DATABASE_URL);

/** Returns the Monday of the current week at 00:00 UTC */
function getCurrentWeekMonday(): Date {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff),
  );
  return monday;
}

/** Helper: Monday + dayOffset at given hour (UTC) */
function weekDay(monday: Date, dayOffset: number, hour: number, minutes = 0): Date {
  const d = new Date(monday);
  d.setUTCDate(d.getUTCDate() + dayOffset);
  d.setUTCHours(hour, minutes, 0, 0);
  return d;
}

async function main() {
  console.log('Starting seeding the database');

  try {
    // 1. Clearing database (Important: deletion order matters due to foreign keys)
    console.log('Deleting old data');
    await db.delete(schema.paymentHistory);
    await db.delete(schema.customerReservations);
    await db.delete(schema.paymentHistory);
    await db.delete(schema.scheduleInstructors);
    await db.delete(schema.schedules);
    await db.delete(schema.lectures);
    await db.delete(schema.customers);
    await db.delete(schema.employeeSpecializations);
    await db.delete(schema.employees);
    await db.delete(schema.persons);
    await db.delete(schema.employeeTypes);
    await db.delete(schema.subscriptions);
    await db.delete(schema.rooms);
    await db.delete(schema.exerciseTypes);

    // 2. Base data
    console.log('Creating base data');
    const [trainerRole, receptionRole] = await db
      .insert(schema.employeeTypes)
      .values([{ roleName: 'Instructor' }, { roleName: 'Reception' }])
      .returning();

    const [basicSub, proSub] = await db
      .insert(schema.subscriptions)
      .values([
        { name: 'Basic', price: '19', durationDays: 30 },
        { name: 'Standard', price: '45', durationDays: 90 },
        { name: 'Premium', price: '149', durationDays: 365 },
      ])
      .returning();

    const rooms = await db
      .insert(schema.rooms)
      .values([
        { name: 'Room A', capacity: 15 },
        { name: 'Room B', capacity: 20 },
        { name: 'Room C', capacity: 25 },
        { name: 'Room D', capacity: 12 },
      ])
      .returning();
    const [roomA, roomB, roomC, roomD] = rooms;

    const exerciseTypes = await db
      .insert(schema.exerciseTypes)
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

    // 3. Persons
    console.log('Creating persons');
    const trainerNames = [
      { name: 'Sarah', surname: 'Miller' },
      { name: 'Mike', surname: 'Johnson' },
      { name: 'Jana', surname: 'Novak' },
      { name: 'Lucia', surname: 'Fernandez' },
      { name: 'Tom', surname: 'Kral' },
    ];

    // Seed persons use placeholder clerkIds — real users are created via Clerk signup
    const trainerPersons = await db
      .insert(schema.persons)
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
        .insert(schema.persons)
        .values({
          clerkId: 'seed_reception_1',
          name: 'Admin',
          surname: 'User',
          email: 'admin@gym.com',
          phoneNumber: faker.phone.number(),
        })
        .returning()
    )[0];

    const customerPersons = await db
      .insert(schema.persons)
      .values(
        Array.from({ length: 15 }).map(() => ({
          clerkId: `user_${faker.string.uuid()}`,
          name: faker.person.firstName(),
          surname: faker.person.lastName(),
          email: faker.internet.email(),
          phoneNumber: faker.phone.number(),
        })),
      )
      .returning();

    // 4. Employees — trainers + reception
    console.log('Creating employees');
    const trainers = await db
      .insert(schema.employees)
      .values(
        trainerPersons.map((p) => ({
          personId: p.id,
          employeeTypeId: trainerRole.id,
          hireDate: new Date().toISOString(),
        })),
      )
      .returning();

    await db.insert(schema.employees).values({
      personId: receptionPerson.id,
      employeeTypeId: receptionRole.id,
      hireDate: new Date().toISOString(),
    });

    const [sarah, mike, jana, lucia, tom] = trainers;

    // 4.5 Assign specializations to instructors
    console.log('Assigning specializations to trainers');
    await db.insert(schema.employeeSpecializations).values([
      { employeeId: sarah.id, exerciseTypeId: yoga.id },
      { employeeId: mike.id, exerciseTypeId: power.id },
      { employeeId: jana.id, exerciseTypeId: cardio.id },
      { employeeId: jana.id, exerciseTypeId: spinning.id },
      { employeeId: lucia.id, exerciseTypeId: jumping.id },
      { employeeId: tom.id, exerciseTypeId: power.id },
      { employeeId: tom.id, exerciseTypeId: pilates.id },
    ]);

    // 5. Customers
    console.log('Creating customers');
    const customers = await db
      .insert(schema.customers)
      .values(
        customerPersons.map((p) => ({
          personId: p.id,
          subscriptionId: faker.helpers.arrayElement([basicSub.id, proSub.id, null]),
          subscriptionValidUntil: faker.date.future().toISOString(),
        })),
      )
      .returning();

    // 6. Lectures (customers are created via Clerk signup, not seeded)
    console.log('Creating lectures');
    const lectures = await db
      .insert(schema.lectures)
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
          exerciseTypeId: jumping.id,
          lectureName: 'Jumping Fitness',
          description: 'Trampoline-based workout',
          forMembers: true,
        },
      ])
      .returning();

    const lec = Object.fromEntries(lectures.map((l) => [l.lectureName, l.id]));

    // 7. Schedule — spread across current week (Mon-Sun)
    console.log('Creating schedule for current week');
    const mon = getCurrentWeekMonday();

    const scheduleEntries = [
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
        lectureName: 'Power Lifting',
        room: roomB,
        day: 2,
        startH: 16,
        startM: 0,
        endH: 17,
        endM: 0,
        lead: mike,
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

    const createdSchedules = await db.insert(schema.schedules).values(scheduleValues).returning();

    // 8. Assign instructors
    console.log('Assigning instructors');
    const instructorValues = createdSchedules.flatMap((schedule, i) => {
      const entry = scheduleEntries[i % scheduleEntries.length];
      return [{ scheduleId: schedule.id, employeeId: entry.lead.id, isLead: true }];
    });
    await db.insert(schema.scheduleInstructors).values(instructorValues);

    // 9. Reservations
    console.log('Creating reservations');
    const reservationValues = createdSchedules.flatMap((schedule) => {
      // Pick random number of customers for this schedule
      const count = faker.number.int({ min: 0, max: 5 });
      const shuffled = faker.helpers.shuffle([...customers]);

      return shuffled.slice(0, count).map((c) => ({
        customerId: c.id,
        scheduleId: schedule.id,
        // Randomly mark some as attended if it's in the past
        attended: schedule.startTime < new Date() ? faker.datatype.boolean() : false,
      }));
    });

    if (reservationValues.length > 0) {
      await db.insert(schema.customerReservations).values(reservationValues);
    }

    console.log(`Seed complete: ${createdSchedules.length} scheduled lectures with reservations`);
  } catch (error) {
    console.error('Error while seeding', error);
  } finally {
    await closeConnection();
  }
}

main();
