import { Elysia } from 'elysia';
import { eq } from 'drizzle-orm';
import { db } from '../db/db';
import { tbPerson } from '../db/schema';
import { authenticated } from '../middleware/auth';

export const profileRoutes = new Elysia({ prefix: '/auth' })
  .use(authenticated)
  .get('/profile', async ({ auth }) => {
    const [person] = await db
      .select()
      .from(tbPerson)
      .where(eq(tbPerson.clerkId, auth!.userId))
      .limit(1);

    if (!person) return { error: 'Profile not found' };

    return {
      id: person.id,
      name: person.name,
      surname: person.surname,
      email: person.email,
      phoneNumber: person.phoneNumber,
      role: auth!.role,
    };
  });
