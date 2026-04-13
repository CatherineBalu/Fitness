import { Elysia, t } from 'elysia';
import { jwtPlugin, authGuard, type JwtPayload } from '../middleware/auth';
import { eq } from 'drizzle-orm';
import { db } from '../db/db';
import { tbPerson, tbCustomer } from '../db/schema';

// TODO: replace mock user lookup with Drizzle DB queries
const MOCK_USERS = [
  { id: '1', email: 'admin@gym.com', password: 'admin123', role: 'admin' as const },
  { id: '2', email: 'staff@gym.com', password: 'staff123', role: 'staff' as const },
  { id: '3', email: 'customer@gym.com', password: 'customer123', role: 'customer' as const },
];

export const authRoutes = new Elysia({ prefix: '/auth' })
  .use(jwtPlugin)

  // ==========================================
  // POST /auth/check-email
  // Checks if an email is already registered (used for real-time validation on frontend)
  // ==========================================
.post(
    '/check-email',
    async ({ body }) => {
      const existingUser = await db
        .select()
        .from(tbPerson)
        .where(eq(tbPerson.email, body.email))
        .limit(1);

      console.log("ficime: ", existingUser);
      return { available: existingUser.length === 0 };
    },
    {
      body: t.Object({
        email: t.String({ format: 'email' }),
      }),
    }
  )

  // ==========================================
  // POST /auth/register
  // Handles the actual sign-up process
  // ==========================================
.post(
    '/register',
    async ({ body, set }) => {
      // 1. Double check pre istotu, či email už neexistuje
      const existingUser = await db
        .select()
        .from(tbPerson)
        .where(eq(tbPerson.email, body.email))
        .limit(1);

      if (existingUser.length > 0) {
        set.status = 409;
        return { error: 'Email is already registered' };
      }

      // 2. Hash hesla pomocou natívnej funkcie v Bun
      const hashedPassword = await Bun.password.hash(body.password);

      try {
        // 3. Uloženie do tabuľky tbPerson
        const [newPerson] = await db.insert(tbPerson).values({
          name: body.firstName,
          surname: body.lastName,
          email: body.email,
          password: hashedPassword,
          phoneNumber: body.phone,
        }).returning();

        // 4. Uloženie aj do tabuľky tbCustomer (ako sme sa bavili)
        await db.insert(tbCustomer).values({
          personId: newPerson.id,
        });

        // ==========================================================
        // 5. DEBUG: VÝPIS DO TERMINÁLU (Môžeš neskôr zmazať)
        // ==========================================================
        const allPersons = await db.select().from(tbPerson);
        console.log('\n✅ NOVÝ POUŽÍVATEĽ PRIDANÝ! Aktuálny zoznam v tbPerson:');
        console.table(allPersons);
        console.log('--------------------------------------------------\n');

        set.status = 201;
        return { success: true, message: 'Account created successfully in DB!' };
        
      } catch (error) {
        console.error("Database insert error:", error);
        set.status = 500;
        return { error: 'Failed to create account in the database' };
      }
    },
    {
      // Validácia prijatých dát
      body: t.Object({
        firstName: t.String({ minLength: 1 }),
        lastName: t.String({ minLength: 1 }),
        email: t.String({ format: 'email' }),
        phone: t.String(),
        password: t.String({ minLength: 8 }),
      }),
    }
  )

  // GET /auth/me — returns current user from JWT cookie (requires auth)
  .use(authGuard)
  .get('/me', ({ user }) => {
    return { user };
  });
