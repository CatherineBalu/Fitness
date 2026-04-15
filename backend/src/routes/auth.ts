import { Elysia, t } from 'elysia';
import { jwtPlugin, authGuard, type JwtPayload } from '../middleware/auth';

// TODO: replace mock user lookup with Drizzle DB queries
const MOCK_USERS = [
  { id: '1', email: 'admin@gym.com', password: 'admin123', role: 'admin' as const },
  { id: '2', email: 'staff@gym.com', password: 'staff123', role: 'staff' as const },
  { id: '3', email: 'customer@gym.com', password: 'customer123', role: 'customer' as const },
];

export const authRoutes = new Elysia({ prefix: '/auth' })
  .use(jwtPlugin)

  // POST /auth/login
  .post(
    '/login',
    async ({ body, jwt, cookie: { session }, set }) => {
      // TODO: replace with db.query.users.findFirst({ where: eq(users.email, body.email) })
      const user = MOCK_USERS.find((u) => u.email === body.email);

      if (!user || user.password !== body.password) {
        // TODO: use proper password hashing (e.g. Bun.password.verify)
        set.status = 401;
        return 'Invalid email or password';
      }

      const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
      const token = await jwt.sign(payload);

      session.set({
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      });

      return { user: payload };
    },
    {
      body: t.Object({
        email: t.String({ format: 'email' }),
        password: t.String({ minLength: 1 }),
      }),
    },
  )

  // POST /auth/logout
  .post('/logout', ({ cookie: { session } }) => {
    session.remove();
    return { success: true };
  })

  // GET /auth/me — returns current user from JWT cookie (requires auth)
  .use(authGuard)
  .get('/me', ({ user }) => {
    return { user };
  });
