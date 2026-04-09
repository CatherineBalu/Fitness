import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// Vytvoríme "bazén" pripojení, ktorý beží na adrese z tvojho .env súboru
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Exportujeme samotnú databázu, ktorú budeme volať z iných súborov
export const db = drizzle(pool, { schema });

// Pomocná funkcia na zatvorenie spojenia (využijeme ju na konci seedu)
export const closeConnection = async () => {
  await pool.end();
};