import { createClerkClient } from '@clerk/backend';

import { db, closeConnection } from './db';
import * as schema from './schema';

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

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

const TEAM_EMAILS = [
  'k.baluseskulova@gmail.com',
  'stefan.murin2235@gmail.com',
  'janbreja123@gmail.com',
  'filip.kolar92@seznam.cz',
];

async function main() {
  console.log('Starting production seed');

  // 1. Clear all data
  console.log('Clearing existing data');
  await db.delete(schema.paymentHistory);
  await db.delete(schema.customerReservations);
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

  // 2. Base reference data
  console.log('Inserting base data');
  await db
    .insert(schema.employeeTypes)
    .values([{ roleName: 'Instructor' }, { roleName: 'Reception' }]);

  await db.insert(schema.subscriptions).values([
    { name: 'Basic', price: '19', durationDays: 30 },
    { name: 'Standard', price: '45', durationDays: 90 },
    { name: 'Premium', price: '149', durationDays: 365 },
  ]);

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
      {
        exerciseTypeId: pilates.id,
        lectureName: 'Pilates',
        description: 'Core strength and flexibility',
        forMembers: false,
      },
    ])
    .returning();

  const lec = Object.fromEntries(lectures.map((l) => [l.lectureName, l.id]));

  // 3. Schedule for current + prev/next week (no instructors assigned)
  console.log('Creating schedules');
  const mon = getCurrentWeekMonday();
  const scheduleEntries = [
    { lectureName: 'Morning Yoga', room: roomA, day: 0, startH: 7, endH: 8 },
    { lectureName: 'HIIT Cardio', room: roomC, day: 0, startH: 9, endH: 10 },
    { lectureName: 'Power Training', room: roomB, day: 0, startH: 17, endH: 18 },
    { lectureName: 'Spin Class', room: roomC, day: 1, startH: 7, endH: 8 },
    { lectureName: 'Vinyasa Yoga', room: roomA, day: 1, startH: 10, endH: 11 },
    { lectureName: 'Jumping Fitness', room: roomD, day: 1, startH: 18, endH: 19 },
    { lectureName: 'Power Lifting', room: roomB, day: 2, startH: 16, endH: 17 },
    { lectureName: 'Pilates', room: roomD, day: 3, startH: 9, endH: 10 },
  ];

  const scheduleValues = [-1, 0, 1].flatMap((weekOffset) => {
    const weekMon = new Date(mon);
    weekMon.setUTCDate(weekMon.getUTCDate() + weekOffset * 7);
    return scheduleEntries.map((e) => ({
      lectureId: lec[e.lectureName],
      roomId: e.room.id,
      startTime: weekDay(weekMon, e.day, e.startH),
      endTime: weekDay(weekMon, e.day, e.endH),
    }));
  });

  await db.insert(schema.schedules).values(scheduleValues);

  // 4. Look up team members in Clerk and create person + customer records
  console.log('Looking up team members in Clerk');
  for (const email of TEAM_EMAILS) {
    const result = await clerk.users.getUserList({ emailAddress: [email] });
    const user = result.data[0];
    if (!user) {
      console.warn(`  ⚠ No Clerk user found for ${email} — skipping`);
      continue;
    }

    const [person] = await db
      .insert(schema.persons)
      .values({
        clerkId: user.id,
        name: user.firstName ?? '',
        surname: user.lastName ?? '',
        email,
      })
      .returning();

    await db.insert(schema.customers).values({ personId: person.id });
    console.log(`  ✓ Created profile for ${email} (${user.firstName} ${user.lastName})`);
  }

  console.log('Production seed complete');
  await closeConnection();
}

void main();
