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
    },
  }),
  verifyToken: mockVerifyToken,
}));

// ── Mock the DB so handlers don't need a real database ────────────────
// Minimal stub — just enough for requirePermission gating to run. Handlers
// that actually execute queries will return 500, which is fine for these
// tests (we only assert 401/403/not-that).
mock.module('../src/db/db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [{ id: 1, clerkId: 'user_test' }],
        }),
      }),
    }),
    insert: () => ({ values: () => ({ returning: async () => [{ id: 1 }] }) }),
  },
}));

import { hasPermission } from '../src/middleware/auth';
import { app } from '../src';

function authHeader(role: string) {
  return { Authorization: `Bearer fake.jwt.${role}` };
}

function mockVerifiedToken(role: string) {
  mockVerifyToken.mockImplementation(async () => ({
    sub: 'user_test',
    publicMetadata: { role },
  }));
}

// ─────────────────────────────────────────────────────────────────────
// 1. hasPermission — stats permission mapping
// ─────────────────────────────────────────────────────────────────────

describe('hasPermission (stats)', () => {
  describe('stats:admin', () => {
    it('allows admin only', () => {
      expect(hasPermission('admin', 'stats:admin')).toBe(true);
      expect(hasPermission('employee', 'stats:admin')).toBe(false);
      expect(hasPermission('customer', 'stats:admin')).toBe(false);
    });
  });

  describe('stats:staff', () => {
    it('allows employee and admin, denies customer', () => {
      expect(hasPermission('admin', 'stats:staff')).toBe(true);
      expect(hasPermission('employee', 'stats:staff')).toBe(true);
      expect(hasPermission('customer', 'stats:staff')).toBe(false);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────
// 2. Route-level permission enforcement
// ─────────────────────────────────────────────────────────────────────

const ADMIN_ENDPOINTS = [
  '/api/stats/admin/overview',
  '/api/stats/admin/revenue-monthly',
  '/api/stats/admin/revenue-by-subscription',
  '/api/stats/admin/top-lectures',
  '/api/stats/admin/occupancy',
];

describe('admin stats endpoints — requirePermission(stats:admin)', () => {
  beforeEach(() => {
    mockVerifyToken.mockReset();
  });

  it.each(ADMIN_ENDPOINTS)('returns 403 for unauthenticated on %s', async (path) => {
    const res = await app.handle(new Request(`http://localhost${path}`));
    expect(res.status).toBe(403);
  });

  it.each(ADMIN_ENDPOINTS)('returns 403 for customer on %s', async (path) => {
    mockVerifiedToken('customer');
    const res = await app.handle(
      new Request(`http://localhost${path}`, { headers: authHeader('customer') }),
    );
    expect(res.status).toBe(403);
  });

  it.each(ADMIN_ENDPOINTS)('returns 403 for employee on %s', async (path) => {
    mockVerifiedToken('employee');
    const res = await app.handle(
      new Request(`http://localhost${path}`, { headers: authHeader('employee') }),
    );
    expect(res.status).toBe(403);
  });

  it.each(ADMIN_ENDPOINTS)('does not reject admin with 401/403 on %s', async (path) => {
    mockVerifiedToken('admin');
    const res = await app.handle(
      new Request(`http://localhost${path}`, { headers: authHeader('admin') }),
    );
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

describe('GET /api/stats/staff/me — requirePermission(stats:staff)', () => {
  beforeEach(() => {
    mockVerifyToken.mockReset();
  });

  it('returns 403 for unauthenticated', async () => {
    const res = await app.handle(new Request('http://localhost/api/stats/staff/me'));
    expect(res.status).toBe(403);
  });

  it('returns 403 for customer', async () => {
    mockVerifiedToken('customer');
    const res = await app.handle(
      new Request('http://localhost/api/stats/staff/me', { headers: authHeader('customer') }),
    );
    expect(res.status).toBe(403);
  });

  it('does not reject employee with 401/403', async () => {
    mockVerifiedToken('employee');
    const res = await app.handle(
      new Request('http://localhost/api/stats/staff/me', { headers: authHeader('employee') }),
    );
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it('does not reject admin with 401/403', async () => {
    mockVerifiedToken('admin');
    const res = await app.handle(
      new Request('http://localhost/api/stats/staff/me', { headers: authHeader('admin') }),
    );
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});
