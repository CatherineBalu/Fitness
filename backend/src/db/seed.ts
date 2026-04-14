import { faker } from '@faker-js/faker';
import { db, closeConnection } from './db';
import {
  tbEmployeeType,
  tbSubscription,
  tbRoom,
  tbExerciseType,
  tbPerson,
  tbEmployee,
  tbCustomer,
  tbLecture,
  tbSchedule,
  tbScheduleInstructor,
  tbCustomerReservation,
} from './schema';
console.log("TESTING DB URL:", process.env.DATABASE_URL);

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
    // 1. Clearing database
    console.log('Deleting old data');
    await db.delete(tbCustomerReservation);
    await db.delete(tbScheduleInstructor);
    await db.delete(tbSchedule);
    await db.delete(tbLecture);
    await db.delete(tbCustomer);
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

    const [basicSub, proSub] = await db
      .insert(tbSubscription)
      .values([
        { name: 'Monthly Basic', price: '29.99', durationDays: 30 },
        { name: 'Year PRO', price: '299.99', durationDays: 365 },
      ])
      .returning();

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
      ])
      .returning();
    const [yoga, power, cardio, jumping] = exerciseTypes;

    // 3. Persons — 5 trainers + 1 receptionist + 10 customers
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
        trainerNames.map((t) => ({
          name: t.name,
          surname: t.surname,
          email: `${t.name.toLowerCase()}@gym.com`,
          password: faker.internet.password(),
          phoneNumber: faker.phone.number(),
        })),
      )
      .returning();

    const receptionPerson = (
      await db
        .insert(tbPerson)
        .values({
          name: 'Admin',
          surname: 'User',
          email: 'admin@gym.com',
          password: 'admin123',
          phoneNumber: faker.phone.number(),
        })
        .returning()
    )[0];

    const customerPersons = await db
      .insert(tbPerson)
      .values(
        Array.from({ length: 10 }).map(() => ({
          name: faker.person.firstName(),
          surname: faker.person.lastName(),
          email: faker.internet.email(),
          password: faker.internet.password(),
          phoneNumber: faker.phone.number(),
        })),
      )
      .returning();

    // 4. Employees — trainers + reception
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

    // 5. Customers
    console.log('Creating customers');
    const customers = await db
      .insert(tbCustomer)
      .values(
        customerPersons.map((p) => ({
          personId: p.id,
          subscriptionId: faker.helpers.arrayElement([basicSub.id, proSub.id, null]),
          subscriptionValidUntil: faker.date.future().toISOString(),
        })),
      )
      .returning();

    // 6. Lectures
    console.log('Creating lectures');
    const lectures = await db
      .insert(tbLecture)
      .values([
        {
          exerciseTypeId: yoga.id,
          lectureName: 'Vinyasa Yoga',
          description: 'Flowing yoga sequences',
        },
        {
          exerciseTypeId: yoga.id,
          lectureName: 'Morning Yoga',
          description: 'Gentle morning stretch',
        },
        {
          exerciseTypeId: yoga.id,
          lectureName: 'Power Yoga',
          description: 'Strength-focused yoga',
        },
        {
          exerciseTypeId: power.id,
          lectureName: 'Power Training',
          description: 'Full body strength',
        },
        {
          exerciseTypeId: power.id,
          lectureName: 'Power Lifting',
          description: 'Heavy compound lifts',
        },
        {
          exerciseTypeId: power.id,
          lectureName: 'Power Hour',
          description: 'Intense power session',
        },
        {
          exerciseTypeId: cardio.id,
          lectureName: 'HIIT Cardio',
          description: 'High intensity intervals',
        },
        {
          exerciseTypeId: cardio.id,
          lectureName: 'Spin Class',
          description: 'Indoor cycling workout',
        },
        {
          exerciseTypeId: cardio.id,
          lectureName: 'Cardio Blast',
          description: 'Mixed cardio drills',
        },
        {
          exerciseTypeId: jumping.id,
          lectureName: 'Jumping Fitness',
          description: 'Trampoline-based workout',
        },
      ])
      .returning();

// Map lectures by name for easy reference
const lec = Object.fromEntries(lectures.map((l) => [l.lectureName, l.id]));

// Creating persons
console.log('Creating persons');
const peopleData = Array.from({ length: 10 }).map(() => ({
  name: faker.person.firstName(),
  surname: faker.person.lastName(),
  email: faker.internet.email(),
  password: faker.internet.password(), // IN REAL APP HASH THIS
  phoneNumber: faker.phone.number(),
}));

// Map trainers: Sarah=yoga, Mike=power, Jana=cardio, Lucia=jumping, Tom=mixed
const [sarah, mike, jana, lucia, tom] = trainers;

    // 7. Schedule — spread across current week (Mon-Sun)
    console.log('Creating schedule for current week');
    const mon = getCurrentWeekMonday();

    // Each entry: [lectureName, roomIndex, dayOffset, startHour, startMin, endHour, endMin, trainerId, extraTrainerId?]
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
      // Monday
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
      // Tuesday
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
      // Wednesday
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
      // Thursday
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
      // Friday
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
      // Saturday
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
      // Sunday
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

    // Create schedules for previous, current, and next week
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

    // 8. Assign instructors — one block of entries per week
    console.log('Assigning instructors');
    const instructorValues = createdSchedules.flatMap((schedule, i) => {
      const entry = scheduleEntries[i % scheduleEntries.length];
      const entries = [{ scheduleId: schedule.id, employeeId: entry.lead.id, isLead: true }];
      if (entry.assist) {
        entries.push({
          scheduleId: schedule.id,
          employeeId: entry.assist.id,
          isLead: false,
        });
      }
      return entries;
    });
    await db.insert(tbScheduleInstructor).values(instructorValues);

    // 9. Create some reservations so the calendar shows registration counts
    console.log('Creating reservations');
    const reservationValues = createdSchedules.flatMap((schedule) => {
      const count = faker.number.int({ min: 0, max: Math.min(8, customers.length) });
      const shuffled = faker.helpers.shuffle([...customers]);
      return shuffled.slice(0, count).map((c) => ({
        customerId: c.id,
        scheduleId: schedule.id,
      }));
    });
    if (reservationValues.length > 0) {
      await db.insert(tbCustomerReservation).values(reservationValues);
    }

    console.log(`Seed complete: ${createdSchedules.length} scheduled lectures this week`);
  } catch (error) {
    console.error('Error while seeding', error);
  } finally {
    await closeConnection();
  }
}

main();
