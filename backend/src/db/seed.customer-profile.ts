/**
 * Seed for testing the customer profile page (NUE-47).
 *
 * Creates a single test customer with:
 *   - An active Monthly Basic membership (valid 20 days from now)
 *   - 2 upcoming + 3 past lecture registrations
 *   - 3 payment history entries (1 this month, 2 older)
 *
 * The test customer is linked to a real Clerk account via SEED_TEST_CLERK_ID.
 * All other DB data (staff, lectures, schedule) is rebuilt from scratch.
 *
 * Run:
 *   SEED_TEST_CLERK_ID=user_xxxx bun run src/db/seed.customer-profile.ts
 *
 * If SEED_TEST_CLERK_ID is omitted the customer gets clerkId "seed_test_customer"
 * and will not be visible when you log in — useful for CI smoke checks.
 */
import { db, closeConnection } from './db';
import {
  customers,
  customerReservations,
  employees,
  employeeSpecializations,
  employeeTypes,
  exerciseTypes,
  lectures,
  paymentHistory,
  persons,
  rooms,
  schedules,
  scheduleInstructors,
  subscriptions,
} from './schema';

const TEST_CLERK_ID = process.env.SEED_TEST_CLERK_ID ?? 'seed_test_customer';

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(10, 0, 0, 0);
  return d;
}

function monthsAgo(months: number, dayOfMonth = 15): Date {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - months);
  d.setUTCDate(dayOfMonth);
  d.setUTCHours(12, 0, 0, 0);
  return d;
}

async function main() {
  console.log(`Seeding customer profile test data (clerkId: ${TEST_CLERK_ID})`);

  try {
    // ── 1. Clear (FK-safe order) ──────────────────────────────────────────
    console.log('Clearing old data...');
    await db.delete(paymentHistory);
    await db.delete(customerReservations);
    await db.delete(scheduleInstructors);
    await db.delete(schedules);
    await db.delete(lectures);
    await db.delete(customers);
    await db.delete(employeeSpecializations);
    await db.delete(employees);
    await db.delete(persons);
    await db.delete(employeeTypes);
    await db.delete(subscriptions);
    await db.delete(rooms);
    await db.delete(exerciseTypes);

    // ── 2. Reference data ────────────────────────────────────────────────
    console.log('Creating reference data...');
    const [instructorRole] = await db
      .insert(employeeTypes)
      .values([{ roleName: 'Instructor' }, { roleName: 'Reception' }])
      .returning();

    const [subMonthly, subYearly] = await db
      .insert(subscriptions)
      .values([
        { name: 'Monthly Basic', price: '490', durationDays: 30 },
        { name: 'Year PRO', price: '3990', durationDays: 365 },
      ])
      .returning();

    const [roomA, roomB] = await db
      .insert(rooms)
      .values([
        { name: 'Room A', capacity: 15 },
        { name: 'Room B', capacity: 20 },
      ])
      .returning();

    const [yoga, cardio, power] = await db
      .insert(exerciseTypes)
      .values([{ name: 'Yoga' }, { name: 'Cardio' }, { name: 'Power' }])
      .returning();

    // ── 3. One instructor ────────────────────────────────────────────────
    const [instructorPerson] = await db
      .insert(persons)
      .values({
        clerkId: 'seed_instructor_profile_test',
        name: 'Jana',
        surname: 'Novak',
        email: 'jana.novak@gym.test',
      })
      .returning();

    const [instructor] = await db
      .insert(employees)
      .values({
        personId: instructorPerson.id,
        employeeTypeId: instructorRole.id,
        hireDate: new Date().toISOString(),
      })
      .returning();

    await db.insert(employeeSpecializations).values([
      { employeeId: instructor.id, exerciseTypeId: yoga.id },
      { employeeId: instructor.id, exerciseTypeId: cardio.id },
    ]);

    // ── 4. Lectures ───────────────────────────────────────────────────────
    const [yogaLec, cardioLec, powerLec, spinLec, hiitLec] = await db
      .insert(lectures)
      .values([
        {
          exerciseTypeId: yoga.id,
          lectureName: 'Morning Yoga',
          description: 'Gentle morning stretch',
          forMembers: false,
        },
        {
          exerciseTypeId: cardio.id,
          lectureName: 'Cardio Blast',
          description: 'Mixed cardio drills',
          forMembers: false,
        },
        {
          exerciseTypeId: power.id,
          lectureName: 'Power Lifting',
          description: 'Heavy compound lifts — members only',
          forMembers: true,
        },
        {
          exerciseTypeId: cardio.id,
          lectureName: 'Spin Class',
          description: 'Indoor cycling workout — members only',
          forMembers: true,
        },
        {
          exerciseTypeId: cardio.id,
          lectureName: 'HIIT Cardio',
          description: 'High intensity intervals',
          forMembers: false,
        },
      ])
      .returning();

    // ── 5. Schedule slots ─────────────────────────────────────────────────
    // 2 upcoming + 3 past slots for registrations, plus extras for variety
    const slots = await db
      .insert(schedules)
      .values([
        // Upcoming (for the test customer)
        {
          lectureId: yogaLec.id,
          roomId: roomA.id,
          startTime: daysFromNow(2),
          endTime: new Date(daysFromNow(2).getTime() + 60 * 60 * 1000),
          forMembers: false,
        },
        {
          lectureId: spinLec.id,
          roomId: roomB.id,
          startTime: daysFromNow(5),
          endTime: new Date(daysFromNow(5).getTime() + 60 * 60 * 1000),
          forMembers: true,
        },
        // Past (for the test customer)
        {
          lectureId: cardioLec.id,
          roomId: roomA.id,
          startTime: daysFromNow(-7),
          endTime: new Date(daysFromNow(-7).getTime() + 60 * 60 * 1000),
          forMembers: false,
        },
        {
          lectureId: powerLec.id,
          roomId: roomB.id,
          startTime: daysFromNow(-14),
          endTime: new Date(daysFromNow(-14).getTime() + 60 * 60 * 1000),
          forMembers: true,
        },
        {
          lectureId: hiitLec.id,
          roomId: roomA.id,
          startTime: daysFromNow(-21),
          endTime: new Date(daysFromNow(-21).getTime() + 60 * 60 * 1000),
          forMembers: false,
        },
        // Extra slots (not reserved by test customer — fills schedule view)
        {
          lectureId: yogaLec.id,
          roomId: roomA.id,
          startTime: daysFromNow(3),
          endTime: new Date(daysFromNow(3).getTime() + 60 * 60 * 1000),
          forMembers: false,
        },
        {
          lectureId: cardioLec.id,
          roomId: roomB.id,
          startTime: daysFromNow(6),
          endTime: new Date(daysFromNow(6).getTime() + 60 * 60 * 1000),
          forMembers: false,
        },
      ])
      .returning();

    // Assign instructor to all slots
    await db
      .insert(scheduleInstructors)
      .values(slots.map((s) => ({ scheduleId: s.id, employeeId: instructor.id, isLead: true })));

    const [upcomingYoga, upcomingSpin, pastCardio, pastPower, pastHiit] = slots;

    // ── 6. Test customer ──────────────────────────────────────────────────
    console.log(`Creating test customer (clerkId: ${TEST_CLERK_ID})...`);
    const [testPerson] = await db
      .insert(persons)
      .values({
        clerkId: TEST_CLERK_ID,
        name: 'Test',
        surname: 'Customer',
        email: `test.customer.${Date.now()}@profile.test`,
      })
      .returning();

    const validUntil = new Date();
    validUntil.setUTCDate(validUntil.getUTCDate() + 20);

    const [testCustomer] = await db
      .insert(customers)
      .values({
        personId: testPerson.id,
        subscriptionId: subMonthly.id,
        subscriptionValidUntil: validUntil.toISOString().slice(0, 10),
      })
      .returning();

    // ── 7. Registrations ──────────────────────────────────────────────────
    console.log('Creating registrations...');
    await db.insert(customerReservations).values([
      // Upcoming
      {
        customerId: testCustomer.id,
        scheduleId: upcomingYoga.id,
        reservationDate: daysFromNow(-1),
      },
      {
        customerId: testCustomer.id,
        scheduleId: upcomingSpin.id,
        reservationDate: daysFromNow(-1),
      },
      // Past
      { customerId: testCustomer.id, scheduleId: pastCardio.id, reservationDate: daysFromNow(-8) },
      { customerId: testCustomer.id, scheduleId: pastPower.id, reservationDate: daysFromNow(-15) },
      { customerId: testCustomer.id, scheduleId: pastHiit.id, reservationDate: daysFromNow(-22) },
    ]);

    // ── 8. Payment history ────────────────────────────────────────────────
    console.log('Creating payment history...');
    await db.insert(paymentHistory).values([
      // This month — Monthly Basic
      {
        customerId: testCustomer.id,
        subscriptionId: subMonthly.id,
        amount: subMonthly.price,
        paymentDate: monthsAgo(0, 3),
        paymentMethod: 'card',
      },
      // 1 month ago — Monthly Basic
      {
        customerId: testCustomer.id,
        subscriptionId: subMonthly.id,
        amount: subMonthly.price,
        paymentDate: monthsAgo(1),
        paymentMethod: 'card',
      },
      // 6 months ago — Year PRO (old plan)
      {
        customerId: testCustomer.id,
        subscriptionId: subYearly.id,
        amount: subYearly.price,
        paymentDate: monthsAgo(6),
        paymentMethod: 'transfer',
      },
    ]);

    console.log(`
Done.
  Test customer clerkId : ${TEST_CLERK_ID}
  Membership            : Monthly Basic — active until ${validUntil.toISOString().slice(0, 10)}
  Registrations         : 2 upcoming, 3 past
  Payments              : 3 entries (total ${490 + 490 + 3990} CZK)

To link to your real account, re-run with:
  SEED_TEST_CLERK_ID=<your-clerk-id> bun run src/db/seed.customer-profile.ts
`);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    await closeConnection();
  }
}

void main();
