import { Elysia } from 'elysia';
import { createClerkClient, verifyToken } from '@clerk/backend';
import { db } from '../db/db';
import { tbPerson, tbCustomer } from '../db/schema';
import { eq } from 'drizzle-orm';

export const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

// ── Permission system ────────────────────────────────────────────────
export type Permission =
  | 'schedule:read'
  | 'schedule:write'
  | 'staff:read'
  | 'staff:write'
  | 'staff:delete'
  | 'customer:read'
  | 'customer:write'
  | 'reservation:read'
  | 'reservation:write'
  | 'reservation:manage'
  | 'profile:read'
  | 'profile:write'
  | 'stats:staff'
  | 'stats:admin';

// Employee permissions — admin inherits all of these
const EMPLOYEE_PERMISSIONS: Permission[] = [
  'schedule:read',
  'schedule:write',
  'staff:read',
  'staff:write',
  'staff:delete',
  'customer:read',
  'customer:write',
  'reservation:read',
  'reservation:write',
  'reservation:manage',
  'profile:read',
  'profile:write',
  'stats:staff',
];

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  customer: [
    'schedule:read',
    'reservation:read',
    'reservation:write',
    'profile:read',
    'profile:write',
  ],
  employee: EMPLOYEE_PERMISSIONS,
  admin: [...EMPLOYEE_PERMISSIONS, 'stats:admin'],
};

export function hasPermission(role: string, permission: Permission): boolean {
  return (ROLE_PERMISSIONS[role] ?? []).includes(permission);
}

// ── Clerk token verification + JIT provisioning ──────────────────────
export const clerkMiddleware = new Elysia({ name: 'clerk-auth' }).derive(
  { as: 'global' },
  async ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return { auth: null };
    }

    try {
      const verified = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
        authorizedParties: [process.env.FRONTEND_URL ?? 'http://localhost:5173'],
      });
      const publicMetadata = (verified.publicMetadata ?? {}) as { role?: string };
      const hasRole = typeof publicMetadata.role === 'string' && publicMetadata.role.length > 0;
      const role = hasRole ? publicMetadata.role! : 'customer';
      const clerkId = verified.sub;

      // JIT role assignment: persist 'customer' to Clerk on first authenticated
      // request. `role` already holds 'customer' via the fallback above, so the
      // current request proceeds even if this call fails — next request retries.
      if (!hasRole) {
        try {
          await clerk.users.updateUserMetadata(clerkId, {
            publicMetadata: { role: 'customer' },
          });
        } catch (err) {
          console.error('[auth] Failed to set customer role on Clerk user', clerkId, err);
        }
      }

      // JIT provisioning: create tbPerson + tbCustomer on first authenticated request
      const [existing] = await db
        .select()
        .from(tbPerson)
        .where(eq(tbPerson.clerkId, clerkId))
        .limit(1);

      if (!existing) {
        const clerkUser = await clerk.users.getUser(clerkId);
        const email = clerkUser.emailAddresses[0]?.emailAddress ?? '';
        const firstName = clerkUser.firstName ?? '';
        const lastName = clerkUser.lastName ?? '';

        const [person] = await db
          .insert(tbPerson)
          .values({ clerkId, name: firstName, surname: lastName, email })
          .returning();

        await db.insert(tbCustomer).values({ personId: person.id });
      }

      return {
        auth: {
          userId: clerkId,
          role,
          can: (permission: Permission) => hasPermission(role, permission),
        },
      };
    } catch {
      return { auth: null };
    }
  },
);

// ── Route guards ─────────────────────────────────────────────────────
export const authenticated = new Elysia({ name: 'authenticated' }).onBeforeHandle(
  { as: 'scoped' },
  ({ auth, set }) => {
    if (!auth) {
      set.status = 401;
      return 'Unauthorized';
    }
  },
);

export const requirePermission = (permission: Permission) =>
  new Elysia({ name: `perm:${permission}` }).onBeforeHandle({ as: 'scoped' }, ({ auth, set }) => {
    if (!auth?.can(permission)) {
      set.status = 403;
      return 'Forbidden';
    }
  });
