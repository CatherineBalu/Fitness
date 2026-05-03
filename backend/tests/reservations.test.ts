import { describe, it, expect, mock, beforeEach } from 'bun:test';

// ── Mock @clerk/backend ───────────────────────────────────────────────
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

// ── Chainable DB mock that supports all drizzle method chains ─────────
/* eslint-disable @typescript-eslint/no-explicit-any */
function makeChain(resolveTo: unknown[]): any {
  const chain: any = {
    from: () => chain,
    innerJoin: () => chain,
    leftJoin: () => chain,
    where: () => chain,
    values: () => chain,
    set: () => chain,
    limit: async () => resolveTo,
    returning: async () => resolveTo,
    then: (resolve: (v: unknown) => unknown) => Promise.resolve(resolveTo).then(resolve),
  };
  return chain;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// Row shape satisfies every consumer:
// - clerkMiddleware: needs { id, clerkId } so JIT provisioning is skipped
// - getCustomerByClerkId: needs { customerId, subscriptionValidUntil }
// - profile route: needs { id, name, surname, email, phoneNumber }
// - reservation duplicate check / schedule lookup: permissive
const MOCK_ROW = {
  id: 'person-1',
  clerkId: 'user_test',
  name: 'Test',
  surname: 'User',
  email: 'test@example.com',
  phoneNumber: null,
  customerId: 'customer-1',
  subscriptionValidUntil: null,
  startTime: new Date(Date.now() + 1000 * 60 * 60 * 24),
  endTime: new Date(Date.now() + 1000 * 60 * 60 * 25),
  forMembers: false,
  roomCapacity: 10,
  lectureName: 'Test Lecture',
  description: 'Test',
  roomName: 'Room A',
  exerciseType: 'Yoga',
  isLead: false,
};

mock.module('../src/db/db', () => ({
  db: {
    select: () => makeChain([MOCK_ROW]),
    insert: () => makeChain([MOCK_ROW]),
    delete: () => makeChain([MOCK_ROW]),
  },
}));

import { app } from '../src';

// ── Helpers ───────────────────────────────────────────────────────────

function mockVerifiedToken(role: string) {
  mockVerifyToken.mockImplementation(async () => ({
    sub: 'user_test',
    publicMetadata: { role },
  }));
}

function authHeader() {
  return { Authorization: 'Bearer fake.jwt.token' };
}

const SCHEDULE_ID = '00000000-0000-0000-0000-000000000001';
const RESERVATION_URL = `http://localhost/schedule/${SCHEDULE_ID}/reservations`;

// ─────────────────────────────────────────────────────────────────────
// POST /schedule/:id/reservations — auth enforcement
// ─────────────────────────────────────────────────────────────────────

describe('POST /schedule/:id/reservations', () => {
  beforeEach(() => mockVerifyToken.mockReset());

  it('returns 403 when unauthenticated', async () => {
    const res = await app.handle(new Request(RESERVATION_URL, { method: 'POST' }));
    expect(res.status).toBe(403);
  });

  it('returns 403 when token verification fails', async () => {
    mockVerifyToken.mockImplementation(async () => {
      throw new Error('invalid token');
    });
    const res = await app.handle(
      new Request(RESERVATION_URL, {
        method: 'POST',
        headers: { Authorization: 'Bearer bad.token' },
      }),
    );
    expect(res.status).toBe(403);
  });

  it('does not return 401/403 for customer (has reservation:write)', async () => {
    mockVerifiedToken('customer');
    const res = await app.handle(
      new Request(RESERVATION_URL, { method: 'POST', headers: authHeader() }),
    );
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it('does not return 401/403 for employee', async () => {
    mockVerifiedToken('employee');
    const res = await app.handle(
      new Request(RESERVATION_URL, { method: 'POST', headers: authHeader() }),
    );
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });

  it('does not return 401/403 for admin', async () => {
    mockVerifiedToken('admin');
    const res = await app.handle(
      new Request(RESERVATION_URL, { method: 'POST', headers: authHeader() }),
    );
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────
// DELETE /schedule/:id/reservations — auth enforcement
// ─────────────────────────────────────────────────────────────────────

describe('DELETE /schedule/:id/reservations', () => {
  beforeEach(() => mockVerifyToken.mockReset());

  it('returns 403 when unauthenticated', async () => {
    const res = await app.handle(new Request(RESERVATION_URL, { method: 'DELETE' }));
    expect(res.status).toBe(403);
  });

  it('does not return 401/403 for customer', async () => {
    mockVerifiedToken('customer');
    const res = await app.handle(
      new Request(RESERVATION_URL, { method: 'DELETE', headers: authHeader() }),
    );
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────
// GET /schedule — public, returns isRegistered: false when unauthenticated
// ─────────────────────────────────────────────────────────────────────

describe('GET /schedule', () => {
  beforeEach(() => mockVerifyToken.mockReset());

  it('is reachable without authentication', async () => {
    const res = await app.handle(
      new Request('http://localhost/schedule?from=2026-01-01&to=2026-01-07'),
    );
    expect(res.status).toBe(200);
  });

  it('returns an array (empty in the mocked DB)', async () => {
    const res = await app.handle(
      new Request('http://localhost/schedule?from=2026-01-01&to=2026-01-07'),
    );
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────
// GET /auth/profile — requires authentication
// ─────────────────────────────────────────────────────────────────────

describe('GET /auth/profile', () => {
  beforeEach(() => mockVerifyToken.mockReset());

  it('returns 401 when unauthenticated', async () => {
    const res = await app.handle(new Request('http://localhost/auth/profile'));
    expect(res.status).toBe(401);
  });

  it('does not return 401 for authenticated customer', async () => {
    mockVerifiedToken('customer');
    const res = await app.handle(
      new Request('http://localhost/auth/profile', { headers: authHeader() }),
    );
    expect(res.status).not.toBe(401);
  });
});
