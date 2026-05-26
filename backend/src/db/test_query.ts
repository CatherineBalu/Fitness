import { db, closeConnection } from './db';
import { persons } from './schema';

async function testSelect() {
  console.log('🔍 Trying to select from database...');

  try {
    // This is Drizzle version of "SELECT * FROM TB_person"
    const allPeople = await db.select().from(persons);

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

void testSelect();
