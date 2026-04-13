import { Elysia, t } from 'elysia';
import { jwtPlugin, authGuard, type JwtPayload } from '../middleware/auth';
import { eq } from 'drizzle-orm';
import { db } from '../db/db';
import { tbPerson, tbCustomer } from '../db/schema';
import { sendVerificationEmail } from '../services/email';

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
      const existingUser = await db
        .select()
        .from(tbPerson)
        .where(eq(tbPerson.email, body.email))
        .limit(1);

      if (existingUser.length > 0) {
        set.status = 409;
        return { error: 'Email is already registered' };
      }
      // using Argon2
      const hashedPassword = await Bun.password.hash(body.password);

      try {
        const [newPerson] = await db.insert(tbPerson).values({
          name: body.firstName,
          surname: body.lastName,
          email: body.email,
          password: hashedPassword,
          phoneNumber: body.phone,
        }).returning();

        await db.insert(tbCustomer).values({
          personId: newPerson.id,
        });

        // Sending mail
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const emailSent = await sendVerificationEmail(body.email, verificationCode);
        
        if (!emailSent) {
          console.warn(`Warning: The verification email for ${body.email} could not be sent.`);
          // In practice, you can add logic here to resend it later
        }

        set.status = 201;
        return { success: true, message: 'Account created successfully in DB!' };

        
      } catch (error) {
        console.error("Database insert error:", error);
        set.status = 500;
        return { error: 'Failed to create account in the database' };
      }
    },
    {
      // Validation of current data
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
