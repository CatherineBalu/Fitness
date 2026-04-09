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
  console.log(' Spúšťam seedovanie databázy...');

  try {
    // 1. Vyčistíme tabuľky (od detí k rodičom, aby sme neporušili Foreign Keys)
    console.log(' Čistím staré dáta...');
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

    // 2. Vytvoríme číselníky (Typy zamestnancov, miestnosti, predplatné)
    console.log(' Vytváram číselníky...');
    const [trainerRole, adminRole] = await db.insert(tbEmployeeType).values([
      { roleName: 'Tréner' },
      { roleName: 'Recepcia' },
    ]).returning();

    const [basicSub, proSub] = await db.insert(tbSubscription).values([
      { name: 'Mesačné Basic', price: '29.99', durationDays: 30 },
      { name: 'Ročné PRO', price: '299.99', durationDays: 365 },
    ]).returning();

    const [roomA] = await db.insert(tbRoom).values([
      { name: 'Veľká Sála', capacity: 30 },
      { name: 'Spinningová Miestnosť', capacity: 15 },
    ]).returning();

    const [cardio, yoga] = await db.insert(tbExerciseType).values([
      { name: 'Kardio' },
      { name: 'Joga' },
    ]).returning();

    // 3. Vytvoríme zopár ľudí (Faker nám vymyslí mená a maily)
    console.log('🧑‍🤝‍🧑 Vytváram ľudí (Person)...');
    const peopleData = Array.from({ length: 10 }).map(() => ({
      name: faker.person.firstName(),
      surname: faker.person.lastName(),
      email: faker.internet.email(),
      password: faker.internet.password(), // V reálnej apke by si to hashoval (napr. bcrypt)
      phoneNumber: faker.phone.number(),
    }));
    
    const createdPeople = await db.insert(tbPerson).values(peopleData).returning();

    // 4. Z prvých dvoch ľudí spravíme Zamestnancov
    console.log('💪 Vytváram zamestnancov...');
    await db.insert(tbEmployee).values([
      { personId: createdPeople[0].id, employeeTypeId: trainerRole.id, hireDate: new Date().toISOString() },
      { personId: createdPeople[1].id, employeeTypeId: adminRole.id, hireDate: new Date().toISOString() },
    ]);

    // 5. Z ďalších piatich urobíme Zákazníkov
    console.log('🏋️ Vytváram zákazníkov...');
    const customersData = createdPeople.slice(2, 7).map((person) => ({
      personId: person.id,
      subscriptionId: faker.helpers.arrayElement([basicSub.id, proSub.id, null]), // Niekto má Basic, niekto Pro, niekto nič
      subscriptionValidUntil: faker.date.future().toISOString(),
    }));
    await db.insert(tbCustomer).values(customersData);

    console.log('🗓️ Vytváram rozvrh a priraďujem trénerov...');
    
    // Vytvoríme 3 rôzne lekcie v rozvrhu
    const scheduleData = [
      {
        lectureId: (await db.insert(tbLecture).values({ 
          exerciseTypeId: cardio.id, 
          lectureName: 'Ranný HIIT', 
          description: 'Intenzívny kardio tréning' 
        }).returning())[0].id,
        roomId: roomA.id,
        startTime: new Date('2024-05-20T08:00:00Z'),
        endTime: new Date('2024-05-20T09:00:00Z'),
      },
      {
        lectureId: (await db.insert(tbLecture).values({ 
          exerciseTypeId: yoga.id, 
          lectureName: 'Večerná Joga', 
          description: 'Relaxácia pri sviečkach' 
        }).returning())[0].id,
        roomId: roomA.id,
        startTime: new Date('2024-05-20T18:00:00Z'),
        endTime: new Date('2024-05-20T19:30:00Z'),
      },
      {
        lectureId: (await db.insert(tbLecture).values({ 
          exerciseTypeId: cardio.id, 
          lectureName: 'Kruhové tréningy', 
          description: 'Pre pokročilých' 
        }).returning())[0].id,
        roomId: roomA.id,
        startTime: new Date('2024-05-21T10:00:00Z'),
        endTime: new Date('2024-05-21T11:00:00Z'),
      }
    ];

    const createdSchedules = await db.insert(tbSchedule).values(scheduleData).returning();

    // 7. Priradenie trénerov (M:N vzťah)
    
    // Získame všetkých zamestnancov, ktorých sme vytvorili
    const allEmployees = await db.select().from(tbEmployee);

    await db.insert(tbScheduleInstructor).values([
      // Lekcia 1: Iba jeden tréner (Hlavný)
      {
        scheduleId: createdSchedules[0].id,
        employeeId: allEmployees[0].id,
        isLead: true,
      },
      // Lekcia 2: Dva tréneri (Jeden hlavný, jeden pomocný)
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
      // Lekcia 3: Iný hlavný tréner
      {
        scheduleId: createdSchedules[2].id,
        employeeId: allEmployees[1].id,
        isLead: true,
      }
    ]);

    console.log('✅ Rozvrh a inštruktori boli úspešne pridaní!');

    console.log('✅ Databáza bola úspešne zaseedovaná!');

  } catch (error) {
    console.error('❌ Chyba pri seedovaní:', error);
  } finally {
    // Vždy musíme zatvoriť spojenie, inak terminál "zamrzne" a nevypne sa
    await closeConnection();
  }
}

main();