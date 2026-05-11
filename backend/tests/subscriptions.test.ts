import { describe, it, expect, mock, beforeEach } from 'bun:test';

// ── Mock @clerk/backend ───────────────────────────────────────────────
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

// ── Chainable DB mock that yields a configurable response per call ────
/* eslint-disable @typescript-eslint/no-explicit-any */
function makeChain(resolveTo: unknown[]): any {
  const chain: any = {
    from: () => chain,
    innerJoin: () => chain,
    where: () => chain,
    orderBy: () => chain,
    groupBy: () => chain,
    values: () => chain,
    set: () => chain,
    limit: async () => resolveTo,
    returning: async () => resolveTo,
    then: (resolve: (v: unknown) => unknown) => Promise.resolve(resolveTo).then(resolve),
  };
  return chain;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// Queue of DB responses consumed in FIFO order by select(). Tests populate it
// in beforeEach; handlers run their SELECTs against these rows.
let selectResponses: unknown[][] = [];

mock.module('../src/db/db', () => ({
  db: {
    select: () => makeChain(selectResponses.shift() ?? []),
    insert: () => makeChain([]),
    update: () => makeChain([]),
    transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        select: () => makeChain(selectResponses.shift() ?? []),
        insert: () => makeChain([]),
        update: () => makeChain([]),
      };
      return fn(tx);
    },
  },
}));

import { app } from '../src';

// ── Helpers ───────────────────────────────────────────────────────────

function authHeader() {
  return { Authorization: 'Bearer fake.jwt.token' };
}

function mockVerifiedToken(role: string) {
  mockVerifyToken.mockImplementation(
    async () => ({ sub: 'user_test', publicMetadata: { role } }) as never,
  );
}

const PLAN_ID = '00000000-0000-0000-0000-000000000001';

function customerRow(overrides: Record<string, unknown> = {}) {
  return {
    customerId: 'customer-1',
    subscriptionValidUntil: null,
    ...overrides,
  };
}

function planRow(overrides: Record<string, unknown> = {}) {
  return {
    id: PLAN_ID,
    name: 'Monthly Basic',
    price: '29.99',
    durationDays: 30,
    ...overrides,
  };
}

// Every authenticated request goes through clerkMiddleware, which does one
// select() to look up the person (to skip JIT provisioning). Auth-required
// tests queue this stub first, then their handler-specific rows.
const MIDDLEWARE_PERSON_ROW = { id: 'person-1', clerkId: 'user_test' };

// ─────────────────────────────────────────────────────────────────────
// GET /subscriptions — public
// ─────────────────────────────────────────────────────────────────────

describe('GET /subscriptions', () => {
  beforeEach(() => {
    mockVerifyToken.mockReset();
    selectResponses = [[planRow(), planRow({ price: '299.99' })]];
  });

  it('is reachable without authentication', async () => {
    const res = await app.handle(new Request('http://localhost/subscriptions'));
    expect(res.status).toBe(200);
  });

  it('returns plans sorted by price ascending', async () => {
    // Sorting is delegated to the DB (orderBy); mock returns already-sorted rows
    selectResponses = [
      [
        planRow({ id: 'b', price: '29.99' }),
        planRow({ id: 'c', price: '99.99' }),
        planRow({ id: 'a', price: '299.99' }),
      ],
    ];
    const res = await app.handle(new Request('http://localhost/subscriptions'));
    const body = (await res.json()) as { id: string; price: string }[];
    expect(body.map((p) => p.id)).toEqual(['b', 'c', 'a']);
  });
});

// ─────────────────────────────────────────────────────────────────────
// POST /subscriptions/buy — authentication
// ─────────────────────────────────────────────────────────────────────

describe('POST /subscriptions/buy — auth', () => {
  beforeEach(() => {
    mockVerifyToken.mockReset();
    selectResponses = [];
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await app.handle(
      new Request('http://localhost/subscriptions/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId: PLAN_ID,
        }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it('returns 401 when token verification fails', async () => {
    mockVerifyToken.mockImplementation(async () => {
      throw new Error('invalid token');
    });
    const res = await app.handle(
      new Request('http://localhost/subscriptions/buy', {
        method: 'POST',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId: PLAN_ID,
        }),
      }),
    );
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────
// POST /subscriptions/buy — business logic
// ─────────────────────────────────────────────────────────────────────

describe('POST /subscriptions/buy — logic', () => {
  beforeEach(() => {
    mockVerifyToken.mockReset();
    mockVerifiedToken('customer');
    selectResponses = [];
  });

  it('returns 422 when body fields are missing', async () => {
    const res = await app.handle(
      new Request('http://localhost/subscriptions/buy', {
        method: 'POST',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }),
    );
    // Elysia's t.Object validation returns 422 on missing required fields
    expect([400, 422]).toContain(res.status);
  });

  it('returns 409 when the user already has an active subscription', async () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    selectResponses = [
      [MIDDLEWARE_PERSON_ROW],
      [
        customerRow({
          subscriptionValidUntil: future.toISOString().split('T')[0],
        }),
      ],
    ];
    const res = await app.handle(
      new Request('http://localhost/subscriptions/buy', {
        method: 'POST',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId: PLAN_ID,
        }),
      }),
    );
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/already/i);
  });

  it('returns 404 when the customer profile does not exist', async () => {
    selectResponses = [
      [MIDDLEWARE_PERSON_ROW],
      [], // customer lookup returns nothing
    ];
    const res = await app.handle(
      new Request('http://localhost/subscriptions/buy', {
        method: 'POST',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId: PLAN_ID,
        }),
      }),
    );
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/customer/i);
  });

  it('returns 404 when the plan does not exist', async () => {
    selectResponses = [
      [MIDDLEWARE_PERSON_ROW],
      [customerRow()], // customer lookup succeeds
      [], // plan lookup returns empty
    ];
    const res = await app.handle(
      new Request('http://localhost/subscriptions/buy', {
        method: 'POST',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId: PLAN_ID,
        }),
      }),
    );
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/plan/i);
  });

  it('succeeds (201) with a valid-until date when all preconditions pass', async () => {
    selectResponses = [[MIDDLEWARE_PERSON_ROW], [customerRow()], [planRow()]];
    const res = await app.handle(
      new Request('http://localhost/subscriptions/buy', {
        method: 'POST',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId: PLAN_ID,
        }),
      }),
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      success: boolean;
      subscriptionValidUntil: string;
    };
    expect(body.success).toBe(true);
    // 30-day plan starting today → ends today + 30 days
    const expected = new Date();
    expected.setUTCDate(expected.getUTCDate() + 30);
    expect(body.subscriptionValidUntil).toBe(expected.toISOString().split('T')[0]);
  });
});
