import { db, closeConnection } from './db';
import { tbPerson } from './schema';

async function testSelect() {
  console.log('🔍 Skúšam vytiahnuť dáta z databázy...');

  try {
    // This is Drizzle version of "SELECT * FROM TB_person"
    const allPeople = await db.select().from(tbPerson);

    console.log('✅ Connected succesfully!');
    console.log(`Count of people in database: ${allPeople.length}`);
    
    // First 3 people
    console.table(allPeople.slice(0, 3)); 

  } catch (error) {
    console.error('Error', error);
  } finally {
    await closeConnection();
  }
}

testSelect();