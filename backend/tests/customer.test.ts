import { describe, it, expect, mock, beforeEach } from 'bun:test';

// ── Mock @clerk/backend before importing anything that pulls it in ────
const mockVerifyToken = mock(async () => {
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

// ── Configurable DB mock ──────────────────────────────────────────────
// selectResponses[i] is the array that the i-th db.select() call resolves to.
// Reset selectCallIdx in beforeEach so every test starts fresh.
let selectResponses: unknown[][] = [];
let selectCallIdx = 0;

function makeChain(result: unknown[]) {
  // Make a Promise that also exposes all drizzle chain methods.
  // Awaiting the chain at any point resolves to `result`.
  const p: Promise<unknown[]> & Record<string, unknown> = Promise.resolve(result) as Promise<
    unknown[]
  > &
    Record<string, unknown>;
  for (const m of ['from', 'innerJoin', 'leftJoin', 'where', 'orderBy', 'limit', 'groupBy']) {
    p[m] = () => p;
  }
  return p;
}

mock.module('../src/db/db', () => ({
  db: {
    select: () => makeChain(selectResponses[selectCallIdx++] ?? []),
    insert: () => ({ values: () => ({ returning: async () => [{ id: 'new-id' }] }) }),
    update: () => ({ set: () => ({ where: async () => {} }) }),
    delete: () => ({ where: async () => {} }),
  },
}));

import { app } from '../src';

// ── Helpers ───────────────────────────────────────────────────────────

function authHeader(role: string) {
  return { Authorization: `Bearer fake.jwt.${role}` };
}

function mockVerifiedToken(role: string) {
  mockVerifyToken.mockImplementation(
    async () => ({ sub: 'user_test', publicMetadata: { role } }) as never,
  );
}

// ── Fixtures ──────────────────────────────────────────────────────────

// Returned by the JIT provisioning check (person already exists → skip insert)
const PERSON_EXISTS = [{ id: 'person-1', clerkId: 'user_test' }];

// Returned by the customer lookup inside handlers
const CUSTOMER_ROW = [{ id: 'customer-1' }];

// Returned by the full profile join (GET /api/customer/me)
const PROFILE_WITH_SUB = [
  {
    name: 'Test',
    surname: 'User',
    email: 'test@test.com',
    phoneNumber: null,
    subscriptionValidUntil: '2099-12-31',
    subscriptionName: 'Monthly Basic',
    subscriptionPrice: '490',
    subscriptionDurationDays: 30,
  },
];

const PROFILE_NO_SUB = [
  {
    name: 'Test',
    surname: 'User',
    email: 'test@test.com',
    phoneNumber: null,
    subscriptionValidUntil: null,
    subscriptionName: null,
    subscriptionPrice: null,
    subscriptionDurationDays: null,
  },
];

const PROFILE_EXPIRED_SUB = [
  {
    ...PROFILE_WITH_SUB[0],
    subscriptionValidUntil: '2020-01-01', // in the past
  },
];

const REGISTRATION_ROWS = [
  {
    reservationId: 'res-1',
    reservationDate: new Date('2026-04-01'),
    lectureName: 'Morning Yoga',
    startTime: new Date('2026-04-25T09:00:00Z'),
    endTime: new Date('2026-04-25T10:00:00Z'),
    roomName: 'Room A',
  },
  {
    reservationId: 'res-2',
    reservationDate: new Date('2026-03-10'),
    lectureName: 'HIIT Cardio',
    startTime: new Date('2026-03-15T17:00:00Z'),
    endTime: new Date('2026-03-15T18:00:00Z'),
    roomName: 'Room C',
  },
];

const PAYMENT_ROWS = [
  {
    id: 'pay-1',
    subscriptionName: 'Monthly Basic',
    amount: '490',
    paymentDate: new Date('2026-04-01'),
    paymentMethod: 'card',
  },
  {
    id: 'pay-2',
    subscriptionName: 'Monthly Basic',
    amount: '490',
    paymentDate: new Date('2026-03-01'),
    paymentMethod: 'card',
  },
];

const TOTAL_ROW = [{ total: 980 }];

// ─────────────────────────────────────────────────────────────────────
// 1. Access control — every endpoint requires authentication
// ─────────────────────────────────────────────────────────────────────

const CUSTOMER_ENDPOINTS = [
  'GET /api/customer/me',
  'GET /api/customer/registrations',
  'GET /api/customer/spending',
  'DELETE /api/customer/membership',
];

describe('customer endpoints — access control', () => {
  beforeEach(() => {
    selectCallIdx = 0;
    selectResponses = [PERSON_EXISTS];
    mockVerifyToken.mockReset();
  });

  it.each(CUSTOMER_ENDPOINTS)('returns 401 for unauthenticated on %s', async (endpoint) => {
    const [method, path] = endpoint.split(' ');
    const res = await app.handle(new Request(`http://localhost${path}`, { method }));
    expect(res.status).toBe(401);
  });

  it.each(CUSTOMER_ENDPOINTS)(
    'does not return 401/403 for customer role on %s',
    async (endpoint) => {
      mockVerifiedToken('customer');
      const [method, path] = endpoint.split(' ');
      const res = await app.handle(
        new Request(`http://localhost${path}`, {
          method,
          headers: authHeader('customer'),
        }),
      );
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    },
  );

  it.each(CUSTOMER_ENDPOINTS)(
    'does not return 401/403 for employee role on %s',
    async (endpoint) => {
      mockVerifiedToken('employee');
      const [method, path] = endpoint.split(' ');
      const res = await app.handle(
        new Request(`http://localhost${path}`, {
          method,
          headers: authHeader('employee'),
        }),
      );
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    },
  );

  it.each(CUSTOMER_ENDPOINTS)('does not return 401/403 for admin role on %s', async (endpoint) => {
    mockVerifiedToken('admin');
    const [method, path] = endpoint.split(' ');
    const res = await app.handle(
      new Request(`http://localhost${path}`, {
        method,
        headers: authHeader('admin'),
      }),
    );
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 2. GET /api/customer/me
// ─────────────────────────────────────────────────────────────────────

describe('GET /api/customer/me', () => {
  beforeEach(() => {
    selectCallIdx = 0;
    selectResponses = [];
    mockVerifiedToken('customer');
  });

  it('returns 200 with profile and active membership', async () => {
    selectResponses = [PERSON_EXISTS, PROFILE_WITH_SUB];

    const res = await app.handle(
      new Request('http://localhost/api/customer/me', {
        headers: authHeader('customer'),
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe('Test');
    expect(body.surname).toBe('User');
    expect(body.email).toBe('test@test.com');
    expect(body.membership).not.toBeNull();
    expect(body.membership.name).toBe('Monthly Basic');
    expect(body.membership.price).toBe(490);
    expect(body.membership.isActive).toBe(true);
    expect(body.membership.validUntil).toBe('2099-12-31');
  });

  it('returns membership.isActive = false when subscription is expired', async () => {
    selectResponses = [PERSON_EXISTS, PROFILE_EXPIRED_SUB];

    const res = await app.handle(
      new Request('http://localhost/api/customer/me', {
        headers: authHeader('customer'),
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.membership.isActive).toBe(false);
  });

  it('returns membership: null when customer has no subscription', async () => {
    selectResponses = [PERSON_EXISTS, PROFILE_NO_SUB];

    const res = await app.handle(
      new Request('http://localhost/api/customer/me', {
        headers: authHeader('customer'),
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.membership).toBeNull();
  });

  it('returns 404 when customer record is not found', async () => {
    selectResponses = [PERSON_EXISTS, []]; // empty → no customer row

    const res = await app.handle(
      new Request('http://localhost/api/customer/me', {
        headers: authHeader('customer'),
      }),
    );

    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 3. DELETE /api/customer/membership
// ─────────────────────────────────────────────────────────────────────

describe('DELETE /api/customer/membership', () => {
  beforeEach(() => {
    selectCallIdx = 0;
    selectResponses = [];
    mockVerifiedToken('customer');
  });

  it('returns 200 with { success: true } when customer exists', async () => {
    selectResponses = [PERSON_EXISTS, CUSTOMER_ROW];

    const res = await app.handle(
      new Request('http://localhost/api/customer/membership', {
        method: 'DELETE',
        headers: authHeader('customer'),
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('returns 404 when customer record is not found', async () => {
    selectResponses = [PERSON_EXISTS, []];

    const res = await app.handle(
      new Request('http://localhost/api/customer/membership', {
        method: 'DELETE',
        headers: authHeader('customer'),
      }),
    );

    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 4. GET /api/customer/registrations
// ─────────────────────────────────────────────────────────────────────

describe('GET /api/customer/registrations', () => {
  beforeEach(() => {
    selectCallIdx = 0;
    selectResponses = [];
    mockVerifiedToken('customer');
  });

  it('returns 200 with an array of registrations', async () => {
    selectResponses = [PERSON_EXISTS, CUSTOMER_ROW, REGISTRATION_ROWS];

    const res = await app.handle(
      new Request('http://localhost/api/customer/registrations', {
        headers: authHeader('customer'),
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(2);
    expect(body[0].lectureName).toBe('Morning Yoga');
    expect(body[0].roomName).toBe('Room A');
  });

  it('returns 200 with an empty array when customer has no registrations', async () => {
    selectResponses = [PERSON_EXISTS, CUSTOMER_ROW, []];

    const res = await app.handle(
      new Request('http://localhost/api/customer/registrations', {
        headers: authHeader('customer'),
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it('returns 404 when customer record is not found', async () => {
    selectResponses = [PERSON_EXISTS, []];

    const res = await app.handle(
      new Request('http://localhost/api/customer/registrations', {
        headers: authHeader('customer'),
      }),
    );

    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────
// 5. GET /api/customer/spending
// ─────────────────────────────────────────────────────────────────────

describe('GET /api/customer/spending', () => {
  beforeEach(() => {
    selectCallIdx = 0;
    selectResponses = [];
    mockVerifiedToken('customer');
  });

  it('returns 200 with payments array and total', async () => {
    selectResponses = [PERSON_EXISTS, CUSTOMER_ROW, PAYMENT_ROWS, TOTAL_ROW];

    const res = await app.handle(
      new Request('http://localhost/api/customer/spending', {
        headers: authHeader('customer'),
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(980);
    expect(Array.isArray(body.payments)).toBe(true);
    expect(body.payments).toHaveLength(2);
    expect(body.payments[0].subscriptionName).toBe('Monthly Basic');
    expect(body.payments[0].amount).toBe(490);
    expect(body.payments[0].paymentMethod).toBe('card');
  });

  it('returns 200 with empty payments and zero total when no history', async () => {
    selectResponses = [PERSON_EXISTS, CUSTOMER_ROW, [], [{ total: 0 }]];

    const res = await app.handle(
      new Request('http://localhost/api/customer/spending', {
        headers: authHeader('customer'),
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(0);
    expect(body.payments).toEqual([]);
  });

  it('returns 404 when customer record is not found', async () => {
    selectResponses = [PERSON_EXISTS, []];

    const res = await app.handle(
      new Request('http://localhost/api/customer/spending', {
        headers: authHeader('customer'),
      }),
    );

    expect(res.status).toBe(404);
  });
});
