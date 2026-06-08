import { createClerkClient } from '@clerk/backend';

import { db, closeConnection } from './db';
import * as schema from './schema';

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

const TEAM_EMAILS = [
  'theodard.fitnessxy@gmail.com',
  'filip.kolar92@seznam.cz',
  'janbreja123@gmail.com',
  'stefan.murin2235@gmail.com',
  'k.baluseskulova@gmail.com',
];

async function main() {
  console.log('Starting production seed');

  // 1. Clear all data
  console.log('Clearing existing data');
  await db.delete(schema.entryLogs);
  await db.delete(schema.qrTokens);
  await db.delete(schema.entryCredits);
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
  await db.delete(schema.entryPackages);
  await db.delete(schema.subscriptions);
  await db.delete(schema.rooms);
  await db.delete(schema.exerciseTypes);

  // 2. Reference data
  console.log('Inserting reference data');

  await db
    .insert(schema.employeeTypes)
    .values([{ roleName: 'Instructor' }, { roleName: 'Reception' }]);

  await db.insert(schema.subscriptions).values([
    { name: 'Basic', price: '19', durationDays: 30 },
    { name: 'Standard', price: '45', durationDays: 90 },
    { name: 'Premium', price: '149', durationDays: 365 },
  ]);

  await db.insert(schema.entryPackages).values([
    { name: 'Single Entry', entryCount: 1, price: '5.00' },
    { name: '10-Entry Bundle', entryCount: 10, price: '40.00' },
  ]);

  await db.insert(schema.rooms).values([
    { name: 'Room A', capacity: 15 },
    { name: 'Room B', capacity: 20 },
    { name: 'Room C', capacity: 25 },
    { name: 'Room D', capacity: 12 },
  ]);

  const exerciseTypes = await db
    .insert(schema.exerciseTypes)
    .values([
      { name: 'Yoga' },
      { name: 'Power' },
      { name: 'Cardio' },
      { name: 'Jumping Fitness' },
      { name: 'Pilates' },
      { name: 'Spinning' },
    ])
    .returning();

  const byName = Object.fromEntries(exerciseTypes.map((e) => [e.name, e.id]));

  await db.insert(schema.lectures).values([
    {
      exerciseTypeId: byName['Yoga'],
      lectureName: 'Vinyasa Yoga',
      description: 'Flowing yoga sequences',
      forMembers: false,
    },
    {
      exerciseTypeId: byName['Yoga'],
      lectureName: 'Morning Yoga',
      description: 'Gentle morning stretch',
      forMembers: false,
    },
    {
      exerciseTypeId: byName['Power'],
      lectureName: 'Power Training',
      description: 'Full body strength',
      forMembers: false,
    },
    {
      exerciseTypeId: byName['Power'],
      lectureName: 'Power Lifting',
      description: 'Heavy compound lifts',
      forMembers: true,
    },
    {
      exerciseTypeId: byName['Cardio'],
      lectureName: 'HIIT Cardio',
      description: 'High intensity intervals',
      forMembers: false,
    },
    {
      exerciseTypeId: byName['Spinning'],
      lectureName: 'Spin Class',
      description: 'Indoor cycling workout',
      forMembers: true,
    },
    {
      exerciseTypeId: byName['Jumping Fitness'],
      lectureName: 'Jumping Fitness',
      description: 'Trampoline-based workout',
      forMembers: true,
    },
    {
      exerciseTypeId: byName['Pilates'],
      lectureName: 'Pilates',
      description: 'Core strength and flexibility',
      forMembers: false,
    },
  ]);

  // 3. Team accounts — Johann gets admin role, everyone else gets customer
  console.log('Creating team profiles');
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

    console.log(`  ✓ ${user.firstName} ${user.lastName} (${email})`);
  }

  console.log('Production seed complete');
  await closeConnection();
}

void main();
