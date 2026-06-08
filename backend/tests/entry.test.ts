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

// For UPDATE ... RETURNING: .returning() pulls from selectResponses so tests can
// control what rows come back. Plain .set().where() resolves to [] (result ignored).
function makeUpdateChain(): any {
  const chain: any = {
    set: () => chain,
    where: () => chain,
    returning: async () => selectResponses.shift() ?? [],
    then: (resolve: (v: unknown) => unknown) => Promise.resolve([]).then(resolve),
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
        update: () => makeUpdateChain(),
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

const MIDDLEWARE_PERSON_ROW = { id: 'person-1', clerkId: 'user_test' };

// ─────────────────────────────────────────────────────────────────────
// POST /entry/token
// ─────────────────────────────────────────────────────────────────────

describe('POST /entry/token — auth', () => {
  beforeEach(() => {
    mockVerifyToken.mockReset();
    selectResponses = [];
  });

  test('returns 401 when unauthenticated', async () => {
    const res = await app.handle(new Request('http://localhost/entry/token', { method: 'POST' }));
    expect(res.status).toBe(401);
  });
});

describe('POST /entry/token — logic', () => {
  beforeEach(() => {
    mockVerifyToken.mockReset();
    mockVerifiedToken('customer');
    selectResponses = [];
  });

  test('returns 404 when customer profile does not exist', async () => {
    selectResponses = [
      [MIDDLEWARE_PERSON_ROW],
      [], // customer lookup returns nothing
    ];
    const res = await app.handle(
      new Request('http://localhost/entry/token', { method: 'POST', headers: authHeader() }),
    );
    expect(res.status).toBe(404);
  });

  test('returns 422 when customer has no entries remaining', async () => {
    selectResponses = [
      [MIDDLEWARE_PERSON_ROW],
      [{ customerId: 'customer-1' }], // customer lookup
      [{ total: 0 }], // live balance from ledger — no active credits
    ];
    const res = await app.handle(
      new Request('http://localhost/entry/token', { method: 'POST', headers: authHeader() }),
    );
    expect(res.status).toBe(422);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/no entries/i);
  });

  test('returns 200 with token and expiresAt when customer has balance', async () => {
    selectResponses = [
      [MIDDLEWARE_PERSON_ROW],
      [{ customerId: 'customer-1' }], // customer lookup
      [{ total: 3 }], // live balance from ledger
    ];
    const res = await app.handle(
      new Request('http://localhost/entry/token', { method: 'POST', headers: authHeader() }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { token: string; expiresAt: string };
    expect(typeof body.token).toBe('string');
    expect(body.token.length).toBeGreaterThan(0);
    expect(typeof body.expiresAt).toBe('string');
  });
});

// ─────────────────────────────────────────────────────────────────────
// POST /entry/scan
// ─────────────────────────────────────────────────────────────────────

describe('POST /entry/scan — auth', () => {
  beforeEach(() => {
    mockVerifyToken.mockReset();
    selectResponses = [];
  });

  test('returns 403 when unauthenticated', async () => {
    const res = await app.handle(
      new Request('http://localhost/entry/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'some-token' }),
      }),
    );
    expect(res.status).toBe(403);
  });

  test('returns 403 when authenticated as customer (missing entry:scan permission)', async () => {
    mockVerifiedToken('customer');
    selectResponses = [[MIDDLEWARE_PERSON_ROW]];
    const res = await app.handle(
      new Request('http://localhost/entry/scan', {
        method: 'POST',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'some-token' }),
      }),
    );
    expect(res.status).toBe(403);
  });
});

describe('POST /entry/scan — logic', () => {
  beforeEach(() => {
    mockVerifyToken.mockReset();
    mockVerifiedToken('employee');
    selectResponses = [];
  });

  test('returns 422 when body is missing token', async () => {
    selectResponses = [[MIDDLEWARE_PERSON_ROW]];
    const res = await app.handle(
      new Request('http://localhost/entry/scan', {
        method: 'POST',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }),
    );
    expect([400, 422]).toContain(res.status);
  });

  test('returns 422 when QR token is invalid or expired', async () => {
    selectResponses = [
      [MIDDLEWARE_PERSON_ROW],     // middleware
      [{ id: 'emp-1' }],           // staff lookup (outside tx)
      [],                          // tx.update().returning() — no matching token row
    ];
    const res = await app.handle(
      new Request('http://localhost/entry/scan', {
        method: 'POST',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'expired-or-invalid' }),
      }),
    );
    expect(res.status).toBe(422);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/invalid or expired/i);
  });

  test('returns 422 when customer has no entries remaining', async () => {
    selectResponses = [
      [MIDDLEWARE_PERSON_ROW],                                                    // middleware
      [{ id: 'emp-1' }],                                                          // staff lookup (outside tx)
      [{ id: 'token-1', customerId: 'customer-1', kind: 'entry' }],               // tx.update().returning() — token claimed
      [{ name: 'Alice', surname: 'Smith', subscriptionValidUntil: null }],         // tx.select() — customer info
      [],                                                                          // tx.select() — FIFO credit lookup → no active batch
    ];
    const res = await app.handle(
      new Request('http://localhost/entry/scan', {
        method: 'POST',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'valid-token' }),
      }),
    );
    expect(res.status).toBe(422);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/no entries remaining/i);
  });

  test('returns 200 with customerName and remainingBalance on success', async () => {
    selectResponses = [
      [MIDDLEWARE_PERSON_ROW],                                                    // middleware
      [{ id: 'emp-1' }],                                                          // staff lookup (outside tx)
      [{ id: 'token-1', customerId: 'customer-1', kind: 'entry' }],               // tx.update().returning() — token claimed
      [{ name: 'Alice', surname: 'Smith', subscriptionValidUntil: null }],         // tx.select() — customer info
      [{ id: 'credit-1' }],                                                        // tx.select() — FIFO credit lookup
      [{ total: 2 }],                                                              // tx.select() — sumActiveCredits inside recalcEntryBalanceCache
    ];
    const res = await app.handle(
      new Request('http://localhost/entry/scan', {
        method: 'POST',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'valid-token' }),
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { customerName: string; remainingBalance: number };
    expect(body.customerName).toBe('Alice Smith');
    expect(body.remainingBalance).toBe(2);
  });

  test('membership token scan returns null balance and kind=membership', async () => {
    selectResponses = [
      [MIDDLEWARE_PERSON_ROW],                                                              // middleware
      [{ id: 'emp-1' }],                                                                    // staff lookup (outside tx)
      [{ id: 'token-1', customerId: 'customer-1', kind: 'membership' }],                   // tx.update().returning() — token claimed
      [{ name: 'Bob', surname: 'Jones', subscriptionValidUntil: '2999-12-31' }],           // tx.select() — customer info
      [{ count: 0 }],                                                                       // tx.select() — hasMembershipEntryToday
    ];
    const res = await app.handle(
      new Request('http://localhost/entry/scan', {
        method: 'POST',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'valid-membership-token' }),
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      customerName: string;
      remainingBalance: number | null;
      kind: string;
    };
    expect(body.customerName).toBe('Bob Jones');
    expect(body.kind).toBe('membership');
    expect(body.remainingBalance).toBeNull();
  });

  test('membership scan returns 422 when already entered today', async () => {
    selectResponses = [
      [MIDDLEWARE_PERSON_ROW],                                                              // middleware
      [{ id: 'emp-1' }],                                                                    // staff lookup (outside tx)
      [{ id: 'token-1', customerId: 'customer-1', kind: 'membership' }],                   // tx.update().returning() — token claimed
      [{ name: 'Bob', surname: 'Jones', subscriptionValidUntil: '2999-12-31' }],           // tx.select() — customer info
      [{ count: 1 }],                                                                       // tx.select() — hasMembershipEntryToday → already entered
    ];
    const res = await app.handle(
      new Request('http://localhost/entry/scan', {
        method: 'POST',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'valid-membership-token' }),
      }),
    );
    expect(res.status).toBe(422);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/already used today/i);
  });

  test('membership scan returns 422 when membership inactive', async () => {
    selectResponses = [
      [MIDDLEWARE_PERSON_ROW],                                                              // middleware
      [{ id: 'emp-1' }],                                                                    // staff lookup (outside tx)
      [{ id: 'token-1', customerId: 'customer-1', kind: 'membership' }],                   // tx.update().returning() — token claimed
      [{ name: 'Bob', surname: 'Jones', subscriptionValidUntil: null }],                   // tx.select() — customer info → membership inactive
    ];
    const res = await app.handle(
      new Request('http://localhost/entry/scan', {
        method: 'POST',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'valid-membership-token' }),
      }),
    );
    expect(res.status).toBe(422);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/no active membership/i);
  });
});

// ─────────────────────────────────────────────────────────────────────
// POST /entry/membership-token
// ─────────────────────────────────────────────────────────────────────

describe('POST /entry/membership-token — auth', () => {
  beforeEach(() => {
    mockVerifyToken.mockReset();
    selectResponses = [];
  });

  test('returns 401 when unauthenticated', async () => {
    const res = await app.handle(
      new Request('http://localhost/entry/membership-token', { method: 'POST' }),
    );
    expect(res.status).toBe(401);
  });
});

describe('POST /entry/membership-token — logic', () => {
  beforeEach(() => {
    mockVerifyToken.mockReset();
    mockVerifiedToken('customer');
    selectResponses = [];
  });

  test('returns 422 when customer has no active membership', async () => {
    selectResponses = [
      [MIDDLEWARE_PERSON_ROW],
      [{ customerId: 'customer-1', subscriptionValidUntil: null }],
    ];
    const res = await app.handle(
      new Request('http://localhost/entry/membership-token', {
        method: 'POST',
        headers: authHeader(),
      }),
    );
    expect(res.status).toBe(422);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/no active membership/i);
  });

  test('returns 422 when membership entry already used today', async () => {
    selectResponses = [
      [MIDDLEWARE_PERSON_ROW],
      [{ customerId: 'customer-1', subscriptionValidUntil: '2999-12-31' }],
      [{ count: 1 }],
    ];
    const res = await app.handle(
      new Request('http://localhost/entry/membership-token', {
        method: 'POST',
        headers: authHeader(),
      }),
    );
    expect(res.status).toBe(422);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/already used your membership entry today/i);
  });

  test('returns 200 with token when membership active and unused today', async () => {
    selectResponses = [
      [MIDDLEWARE_PERSON_ROW],
      [{ customerId: 'customer-1', subscriptionValidUntil: '2999-12-31' }],
      [{ count: 0 }],
    ];
    const res = await app.handle(
      new Request('http://localhost/entry/membership-token', {
        method: 'POST',
        headers: authHeader(),
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { token: string; expiresAt: string };
    expect(typeof body.token).toBe('string');
    expect(body.token.length).toBeGreaterThan(0);
    expect(typeof body.expiresAt).toBe('string');
  });
});
