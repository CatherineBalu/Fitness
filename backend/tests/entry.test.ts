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
// Controls what the customers UPDATE inside the scan transaction returns.
// [] = 0 rows updated (no entries), [{ entryBalance: N }] = success.
let txCustomerUpdateResult: unknown[] = [{ entryBalance: 0 }];

mock.module('../src/db/db', () => ({
  db: {
    select: () => makeChain(selectResponses.shift() ?? []),
    insert: () => makeChain([]),
    update: () => makeChain([]),
    transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      let updateCallCount = 0;
      const tx = {
        select: () => makeChain(selectResponses.shift() ?? []),
        insert: () => makeChain([]),
        update: () => {
          // First update inside validateAndScan is the customers decrement
          if (updateCallCount++ === 0) return makeChain(txCustomerUpdateResult);
          return makeChain([]);
        },
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
    selectResponses = [[MIDDLEWARE_PERSON_ROW], [{ customerId: 'customer-1', entryBalance: 0 }]];
    const res = await app.handle(
      new Request('http://localhost/entry/token', { method: 'POST', headers: authHeader() }),
    );
    expect(res.status).toBe(422);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/no entries/i);
  });

  test('returns 200 with token and expiresAt when customer has balance', async () => {
    selectResponses = [[MIDDLEWARE_PERSON_ROW], [{ customerId: 'customer-1', entryBalance: 3 }]];
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
    txCustomerUpdateResult = [{ entryBalance: 0 }];
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
      [MIDDLEWARE_PERSON_ROW],
      [], // qrToken lookup returns nothing → invalid/expired
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
    txCustomerUpdateResult = []; // 0 rows updated → balance was 0
    selectResponses = [
      [MIDDLEWARE_PERSON_ROW],
      [{ id: 'token-1', customerId: 'customer-1' }], // valid qrToken
      [{ id: 'emp-1' }], // employee lookup
      [{ name: 'Alice', surname: 'Smith' }], // customer info
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
    txCustomerUpdateResult = [{ entryBalance: 2 }];
    selectResponses = [
      [MIDDLEWARE_PERSON_ROW],
      [{ id: 'token-1', customerId: 'customer-1' }],
      [{ id: 'emp-1' }],
      [{ name: 'Alice', surname: 'Smith' }],
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
});
