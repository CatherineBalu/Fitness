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
} from './schema';

async function main() {
  console.log(' Starting seeding the database');

  try {
    // 1. Clearing database
    console.log(' Deleting old data');
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

    console.log(' Creating basic databases');
    const [trainerRole, adminRole] = await db
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

    const [roomA] = await db
      .insert(tbRoom)
      .values([
        { name: 'Big room', capacity: 30 },
        { name: 'Small room', capacity: 15 },
      ])
      .returning();

    const [cardio, yoga] = await db
      .insert(tbExerciseType)
      .values([{ name: 'Cardio' }, { name: 'Joga' }])
      .returning();

    // Creating persons
    console.log('🧑‍🤝‍🧑 Creating persons');
    const peopleData = Array.from({ length: 10 }).map(() => ({
      name: faker.person.firstName(),
      surname: faker.person.lastName(),
      email: faker.internet.email(),
      password: faker.internet.password(), // IN REAL APP HASH THIS
      phoneNumber: faker.phone.number(),
    }));

    const createdPeople = await db.insert(tbPerson).values(peopleData).returning();

    // Creating employes
    console.log(' Creating employes...');
    await db.insert(tbEmployee).values([
      {
        personId: createdPeople[0].id,
        employeeTypeId: trainerRole.id,
        hireDate: new Date().toISOString(),
      },
      {
        personId: createdPeople[1].id,
        employeeTypeId: adminRole.id,
        hireDate: new Date().toISOString(),
      },
    ]);

    // 5. Creating customers
    console.log('Creating customers');
    const customersData = createdPeople.slice(2, 7).map((person) => ({
      personId: person.id,
      subscriptionId: faker.helpers.arrayElement([basicSub.id, proSub.id, null]),
      subscriptionValidUntil: faker.date.future().toISOString(),
    }));
    await db.insert(tbCustomer).values(customersData);

    console.log('Creating schedule and adding lectures.');
    // Creating 3 lectures
    const scheduleData = [
      {
        lectureId: (
          await db
            .insert(tbLecture)
            .values({
              exerciseTypeId: cardio.id,
              lectureName: 'Morning HIIT',
              description: 'Intensive cardio',
            })
            .returning()
        )[0].id,
        roomId: roomA.id,
        startTime: new Date('2024-05-20T08:00:00Z'),
        endTime: new Date('2024-05-20T09:00:00Z'),
      },
      {
        lectureId: (
          await db
            .insert(tbLecture)
            .values({
              exerciseTypeId: yoga.id,
              lectureName: 'Afternoon yoga',
              description: 'Relaxative yoga next to candles',
            })
            .returning()
        )[0].id,
        roomId: roomA.id,
        startTime: new Date('2024-05-20T18:00:00Z'),
        endTime: new Date('2024-05-20T19:30:00Z'),
      },
      {
        lectureId: (
          await db
            .insert(tbLecture)
            .values({
              exerciseTypeId: cardio.id,
              lectureName: 'Circle trening',
              description: 'For advents',
            })
            .returning()
        )[0].id,
        roomId: roomA.id,
        startTime: new Date('2024-05-21T10:00:00Z'),
        endTime: new Date('2024-05-21T11:00:00Z'),
      },
    ];

    const createdSchedules = await db.insert(tbSchedule).values(scheduleData).returning();

    // 7. Adding instructors (M:N)

    const allEmployees = await db.select().from(tbEmployee);

    await db.insert(tbScheduleInstructor).values([
      {
        scheduleId: createdSchedules[0].id,
        employeeId: allEmployees[0].id,
        isLead: true,
      },
      {
        scheduleId: createdSchedules[1].id,
        employeeId: allEmployees[0].id,
        isLead: true,
      },
      {
        scheduleId: createdSchedules[1].id,
        employeeId: allEmployees[1].id,
        isLead: false,
      },
      {
        scheduleId: createdSchedules[2].id,
        employeeId: allEmployees[1].id,
        isLead: true,
      },
    ]);

    console.log('Lectures and instructors successfully created');

    console.log('Database seed successfully');
  } catch (error) {
    console.error('Error while seeding', error);
  } finally {
    // Allways close connection
    await closeConnection();
  }
}

main();
