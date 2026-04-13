import { Elysia } from 'elysia';
import { jwt } from '@elysiajs/jwt';

export type UserRole = 'admin' | 'staff' | 'customer';

export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: UserRole;
}

// Reusable JWT plugin — import this wherever you need token signing/verification
export const jwtPlugin = new Elysia({ name: 'jwt' }).use(
  jwt({
    name: 'jwt',
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
    exp: '7d',
  }),
);

// Guard plugin — protects a route group, injects `user` into context
// Usage: new Elysia().use(authGuard).get('/protected', ({ user }) => user)
export const authGuard = new Elysia({ name: 'auth-guard' })
  .use(jwtPlugin)
  .derive({ as: 'scoped' }, async ({ jwt, cookie: { session } }) => {
    const payload = await jwt.verify(session.value);
    return { user: (payload || null) as JwtPayload | null };
  })
  .onBeforeHandle({ as: 'scoped' }, ({ user, set }) => {
    if (!user) {
      set.status = 401;
      return 'Unauthorized';
    }
  });

// Role guard — use after authGuard to restrict to specific roles
// Usage: .use(requireRole('admin'))
export const requireRole = (...roles: UserRole[]) =>
  new Elysia({ name: `role-${roles.join('-')}` })
    .use(authGuard)
    .onBeforeHandle({ as: 'scoped' }, ({ user, set }) => {
      if (!user || !roles.includes(user.role)) {
        set.status = 403;
        return 'Forbidden';
      }
    });
