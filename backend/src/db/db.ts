import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Exporting database
export const db = drizzle(pool, { schema });

export const closeConnection = async () => {
  await pool.end();
};