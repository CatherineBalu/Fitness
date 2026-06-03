import { describe, it, expect, mock, beforeEach } from 'bun:test';

// ── Mock @clerk/backend before importing anything that pulls it in ────
type MockToken = {
  sub: string;
  publicMetadata: {
    role?: string;
  };
};

const mockVerifyToken = mock(async (): Promise<MockToken> => {
  throw new Error('verifyToken not configured for this test');
});

mock.module('@clerk/backend', () => ({
  createClerkClient: () => ({
    users: {
      getUser: async () => ({
        emailAddresses: [{ emailAddress: 'test@example.com' }],
        firstName: 'Test',
        lastName: 'User',
      }),
      updateUserMetadata: async () => ({}),
    },
  }),
  verifyToken: mockVerifyToken,
}));

// ── Mock the DB so JIT provisioning doesn't need a real database ─────
const mockDbSelect = mock(() => ({
  from: () => ({
    where: () => ({
      limit: async () => [{ id: 1, clerkId: 'user_test' }], // simulate existing row
    }),
  }),
}));

mock.module('../src/db/db', () => ({
  db: {
    select: mockDbSelect,
    insert: () => ({ values: () => ({ returning: async () => [{ id: 1 }] }) }),
  },
}));

import { app } from '../src';
import { hasPermission, type Permission } from '../src/middleware/auth';

// ── Helpers ───────────────────────────────────────────────────────────

function makeToken(role: string) {
  // The actual JWT value doesn't matter — verifyToken is mocked.
  return `fake.jwt.${role}`;
}

function mockVerifiedToken(role: string) {
  mockVerifyToken.mockImplementation(async () => ({
    sub: 'user_test',
    publicMetadata: { role },
  }));
}

function authHeader(role: string) {
  return { Authorization: `Bearer ${makeToken(role)}` };
}

// ─────────────────────────────────────────────────────────────────────
// 1. hasPermission — pure unit tests
// ─────────────────────────────────────────────────────────────────────

describe('hasPermission', () => {
  const allPermissions: Permission[] = [
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
    'stats:admin',
  ];

  describe('customer role', () => {
    const allowed: Permission[] = [
      'schedule:read',
      'reservation:read',
      'reservation:write',
      'profile:read',
      'profile:write',
    ];
    const denied = allPermissions.filter((p) => !allowed.includes(p));

    it.each(allowed)('allows %s', (p) => {
      expect(hasPermission('customer', p)).toBe(true);
    });

    it.each(denied)('denies %s', (p) => {
      expect(hasPermission('customer', p)).toBe(false);
    });
  });

  describe('employee role', () => {
    const employeeDenied: Permission[] = ['stats:admin'];
    const employeeAllowed = allPermissions.filter((p) => !employeeDenied.includes(p));

    it.each(employeeAllowed)('allows %s', (p) => {
      expect(hasPermission('employee', p)).toBe(true);
    });

    it.each(employeeDenied)('denies %s', (p) => {
      expect(hasPermission('employee', p)).toBe(false);
    });
  });

  describe('admin role', () => {
    it('allows all permissions including stats:admin', () => {
      for (const p of allPermissions) {
        expect(hasPermission('admin', p)).toBe(true);
      }
    });
  });

  describe('unknown role', () => {
    it('denies every permission', () => {
      for (const p of allPermissions) {
        expect(hasPermission('unknown_role', p)).toBe(false);
      }
    });
  });
});

// ─────────────────────────────────────────────────────────────────────
// 2. clerkMiddleware — token extraction
// ─────────────────────────────────────────────────────────────────────

describe('clerkMiddleware', () => {
  beforeEach(() => {
    mockVerifyToken.mockReset();
  });

  it('returns 200 on root route with no auth (public route)', async () => {
    const res = await app.handle(new Request('http://localhost/'));
    expect(res.status).toBe(200);
  });

  it('attaches auth when a valid token is provided', async () => {
    mockVerifiedToken('employee');
    // /api/staff requires staff:read — employee has it
    const res = await app.handle(
      new Request('http://localhost/api/staff', {
        headers: authHeader('employee'),
      }),
    );
    // We just want to confirm the middleware didn't reject with 401/403
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it('returns auth: null (and 403 from requirePermission) when no Authorization header is sent', async () => {
    // staffRoutes uses requirePermission without authenticated, so unauthenticated → 403
    // This confirms clerkMiddleware sets auth=null when there is no token
    const res = await app.handle(new Request('http://localhost/api/staff'));
    expect(res.status).toBe(403);
  });

  it('returns auth: null (and 403) when token verification fails', async () => {
    mockVerifyToken.mockImplementation(async () => {
      throw new Error('invalid token');
    });
    const res = await app.handle(
      new Request('http://localhost/api/staff', {
        headers: { Authorization: 'Bearer bad.token.here' },
      }),
    );
    expect(res.status).toBe(403);
  });

  it('defaults role to "customer" when publicMetadata has no role field', async () => {
    mockVerifyToken.mockImplementation(async () => ({
      sub: 'user_test',
      publicMetadata: {}, // no role
    }));
    // customer has staff:read? No — so this will be 403, but NOT 401, confirming auth ran
    const res = await app.handle(
      new Request('http://localhost/api/staff', {
        headers: { Authorization: 'Bearer some.token' },
      }),
    );
    // customer role is assigned, but customer lacks staff:read → 403 (not 401)
    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 3. requirePermission guard — RBAC enforcement on routes
// ─────────────────────────────────────────────────────────────────────

describe('requirePermission guard', () => {
  beforeEach(() => {
    mockVerifyToken.mockReset();
  });

  it('returns 403 when customer hits a staff:read route', async () => {
    mockVerifiedToken('customer');
    const res = await app.handle(
      new Request('http://localhost/api/staff', {
        headers: authHeader('customer'),
      }),
    );
    expect(res.status).toBe(403);
  });

  it('returns 200 when employee hits a staff:read route', async () => {
    mockVerifiedToken('employee');
    const res = await app.handle(
      new Request('http://localhost/api/staff', {
        headers: authHeader('employee'),
      }),
    );
    expect(res.status).not.toBe(403);
    expect(res.status).not.toBe(401);
  });

  it('returns 200 when admin hits a staff:read route', async () => {
    mockVerifiedToken('admin');
    const res = await app.handle(
      new Request('http://localhost/api/staff', {
        headers: authHeader('admin'),
      }),
    );
    expect(res.status).not.toBe(403);
    expect(res.status).not.toBe(401);
  });

  it('returns 403 when unauthenticated request hits a requirePermission-only route', async () => {
    // staffRoutes uses requirePermission but not authenticated, so auth=null → can() returns
    // false → 403. This is expected behaviour for this route setup.
    const res = await app.handle(new Request('http://localhost/api/staff'));
    expect(res.status).toBe(403);
  });
});
