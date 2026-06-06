import { describe, test, expect, mock, beforeEach } from 'bun:test';

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
        update: () => makeChain([{ entryBalance: 5 }]),
      };
      return fn(tx);
    },
  },
}));

import { app } from '../src';

function authHeader() {
  return { Authorization: 'Bearer fake.jwt.token' };
}

function mockVerifiedToken(role: string) {
  mockVerifyToken.mockImplementation(
    async () => ({ sub: 'user_test', publicMetadata: { role } }) as never,
  );
}

const PACKAGE_ID = '00000000-0000-0000-0000-000000000002';
const MIDDLEWARE_PERSON_ROW = { id: 'person-1', clerkId: 'user_test' };

function customerRow(overrides: Record<string, unknown> = {}) {
  return { customerId: 'customer-1', subscriptionValidUntil: null, ...overrides };
}

function packageRow(overrides: Record<string, unknown> = {}) {
  return { id: PACKAGE_ID, name: 'Single Entry', entryCount: 1, price: '5.00', ...overrides };
}

// ─────────────────────────────────────────────────────────────────────
// GET /entry-packages
// ─────────────────────────────────────────────────────────────────────

describe('GET /entry-packages', () => {
  beforeEach(() => {
    mockVerifyToken.mockReset();
    selectResponses = [
      [packageRow(), packageRow({ id: 'p2', name: '10-Entry Bundle', price: '40.00' })],
    ];
  });

  test('is reachable without authentication', async () => {
    const res = await app.handle(new Request('http://localhost/entry-packages'));
    expect(res.status).toBe(200);
  });

  test('returns packages as an array', async () => {
    const res = await app.handle(new Request('http://localhost/entry-packages'));
    const body = (await res.json()) as unknown[];
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────────
// POST /entry-packages/buy — auth
// ─────────────────────────────────────────────────────────────────────

describe('POST /entry-packages/buy — auth', () => {
  beforeEach(() => {
    mockVerifyToken.mockReset();
    selectResponses = [];
  });

  test('returns 401 when unauthenticated', async () => {
    const res = await app.handle(
      new Request('http://localhost/entry-packages/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryPackageId: PACKAGE_ID }),
      }),
    );
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────────
// POST /entry-packages/buy — logic
// ─────────────────────────────────────────────────────────────────────

describe('POST /entry-packages/buy — logic', () => {
  beforeEach(() => {
    mockVerifyToken.mockReset();
    mockVerifiedToken('customer');
    selectResponses = [];
  });

  test('returns 422 when body is missing entryPackageId', async () => {
    selectResponses = [[MIDDLEWARE_PERSON_ROW]];
    const res = await app.handle(
      new Request('http://localhost/entry-packages/buy', {
        method: 'POST',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }),
    );
    expect([400, 422]).toContain(res.status);
  });

  test('returns 404 when the customer profile does not exist', async () => {
    selectResponses = [
      [MIDDLEWARE_PERSON_ROW],
      [], // customer lookup returns nothing
    ];
    const res = await app.handle(
      new Request('http://localhost/entry-packages/buy', {
        method: 'POST',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryPackageId: PACKAGE_ID }),
      }),
    );
    expect(res.status).toBe(404);
  });

  test('returns 404 when the package does not exist', async () => {
    selectResponses = [
      [MIDDLEWARE_PERSON_ROW],
      [customerRow()],
      [], // package lookup returns nothing
    ];
    const res = await app.handle(
      new Request('http://localhost/entry-packages/buy', {
        method: 'POST',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryPackageId: PACKAGE_ID }),
      }),
    );
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/package/i);
  });

  test('returns 201 and echoes the recomputed entry balance on success', async () => {
    // DB is mocked, so the balance isn't computed from the package — it's whatever
    // the SUM(remaining_count) query returns. We stub that and assert the endpoint
    // surfaces it unchanged. Value is arbitrary; only the round-trip is under test.
    const RECOMPUTED_BALANCE = 11;
    selectResponses = [
      [MIDDLEWARE_PERSON_ROW],
      [customerRow()],
      [packageRow()],
      [{ total: RECOMPUTED_BALANCE }], // stubbed result of the post-purchase SUM query
    ];
    const res = await app.handle(
      new Request('http://localhost/entry-packages/buy', {
        method: 'POST',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryPackageId: PACKAGE_ID }),
      }),
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { success: boolean; entryBalance: number };
    expect(body.success).toBe(true);
    expect(body.entryBalance).toBe(RECOMPUTED_BALANCE);
  });
});
