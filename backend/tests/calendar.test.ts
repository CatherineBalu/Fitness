import { describe, test, expect, mock, beforeEach } from 'bun:test';

// ── Mock @clerk/backend (configurable token verification) ─────────────
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

// ── Mock outbound email so cancelling a lecture never sends for real ──
const sendCancellationEmail = mock(async () => {});
mock.module('../src/lib/email', () => ({
  sendBookingConfirmationEmail: async () => {},
  sendCancellationEmail,
}));

// ── Chainable DB mock ─────────────────────────────────────────────────
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
        update: () => makeChain([]),
      };
      return fn(tx);
    },
  },
}));

import { app } from '../src';

// ── Helpers ───────────────────────────────────────────────────────────
function mockVerifiedToken(role: string) {
  mockVerifyToken.mockImplementation(
    async () => ({ sub: 'user_test', publicMetadata: { role } }) as never,
  );
}

function authHeader() {
  return { Authorization: 'Bearer fake.jwt.token' };
}

// First select feeds the clerk middleware's person lookup so JIT provisioning
// is skipped; subsequent entries feed the service queries.
const MIDDLEWARE_PERSON_ROW = { id: 'person-1', clerkId: 'user_test' };

const SCHEDULE_ID = '00000000-0000-0000-0000-000000000001';
const DELETE_URL = `http://localhost/calendar/${SCHEDULE_ID}`;

function deleteRequest(headers?: Record<string, string>, url = DELETE_URL) {
  return app.handle(new Request(url, { method: 'DELETE', headers }));
}

// ─────────────────────────────────────────────────────────────────────
// DELETE /calendar/:id — auth (requires schedule:write)
// ─────────────────────────────────────────────────────────────────────

describe('DELETE /calendar/:id — auth', () => {
  beforeEach(() => {
    mockVerifyToken.mockReset();
    selectResponses = [];
  });

  test('returns 403 when unauthenticated', async () => {
    const res = await deleteRequest();
    expect(res.status).toBe(403);
  });

  test('returns 403 for a customer (lacks schedule:write)', async () => {
    mockVerifiedToken('customer');
    selectResponses = [[MIDDLEWARE_PERSON_ROW]];
    const res = await deleteRequest(authHeader());
    expect(res.status).toBe(403);
  });

  test('does not return 401/403 for an employee', async () => {
    mockVerifiedToken('employee');
    selectResponses = [[MIDDLEWARE_PERSON_ROW], [], []];
    const res = await deleteRequest(authHeader());
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────
// DELETE /calendar/:id — cancel lecture (authenticated as admin)
// ─────────────────────────────────────────────────────────────────────

describe('DELETE /calendar/:id — cancel lecture', () => {
  beforeEach(() => {
    mockVerifyToken.mockReset();
    mockVerifiedToken('admin');
    selectResponses = [];
    sendCancellationEmail.mockReset();
  });

  test('soft-deletes the lecture and returns success (happy path)', async () => {
    selectResponses = [
      [MIDDLEWARE_PERSON_ROW], // clerk middleware person lookup
      // schedule lookup — future lecture so registered members get emailed
      [
        {
          lectureName: 'Morning Yoga',
          startTime: new Date(Date.now() + 1000 * 60 * 60 * 24),
        },
      ],
      [{ name: 'Alice', email: 'alice@example.com' }], // registered customers
    ];

    const res = await deleteRequest(authHeader());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(true);
  });

  test('returns 404 when the schedule does not exist', async () => {
    selectResponses = [[MIDDLEWARE_PERSON_ROW], []]; // schedule lookup empty
    const res = await deleteRequest(authHeader());
    expect(res.status).toBe(404);
  });

  test('returns 422 when the id is not a valid uuid', async () => {
    selectResponses = [[MIDDLEWARE_PERSON_ROW]];
    const res = await deleteRequest(authHeader(), 'http://localhost/calendar/not-a-uuid');
    expect(res.status).toBe(422);
  });
});

// ─────────────────────────────────────────────────────────────────────
// POST /calendar — create lecture (overlap + time validation)
// ─────────────────────────────────────────────────────────────────────

describe('POST /calendar — create', () => {
  beforeEach(() => {
    mockVerifyToken.mockReset();
    mockVerifiedToken('admin');
    selectResponses = [];
  });

  const validBody = {
    lectureId: '00000000-0000-0000-0000-0000000000aa',
    roomId: '00000000-0000-0000-0000-0000000000bb',
    startTime: '2026-09-01T10:00:00.000Z',
    endTime: '2026-09-01T11:00:00.000Z',
  };

  function createRequest(body: Record<string, unknown>) {
    return app.handle(
      new Request('http://localhost/calendar', {
        method: 'POST',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    );
  }

  test('returns 409 when the room is already booked for an overlapping time', async () => {
    selectResponses = [
      [MIDDLEWARE_PERSON_ROW], // clerk middleware person lookup
      [{ id: 'clashing-schedule' }], // room overlap query → conflict
    ];
    const res = await createRequest(validBody);
    expect(res.status).toBe(409);
  });

  test('returns 422 when endTime is not after startTime', async () => {
    selectResponses = [[MIDDLEWARE_PERSON_ROW]];
    const res = await createRequest({
      ...validBody,
      startTime: '2026-09-01T11:00:00.000Z',
      endTime: '2026-09-01T10:00:00.000Z',
    });
    expect(res.status).toBe(422);
  });
});

// ─────────────────────────────────────────────────────────────────────
// PATCH /calendar/:id — reschedule validation
// ─────────────────────────────────────────────────────────────────────

describe('PATCH /calendar/:id — validation', () => {
  beforeEach(() => {
    mockVerifyToken.mockReset();
    mockVerifiedToken('admin');
    selectResponses = [];
  });

  test('returns 422 when endTime is before startTime', async () => {
    selectResponses = [
      [MIDDLEWARE_PERSON_ROW], // clerk middleware person lookup
      [
        {
          id: SCHEDULE_ID,
          roomId: 'room-1',
          startTime: new Date('2026-09-01T10:00:00.000Z'),
          endTime: new Date('2026-09-01T11:00:00.000Z'),
        },
      ], // current schedule lookup
    ];
    const res = await app.handle(
      new Request(DELETE_URL, {
        method: 'PATCH',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTime: '2026-09-01T12:00:00.000Z',
          endTime: '2026-09-01T11:00:00.000Z',
        }),
      }),
    );
    expect(res.status).toBe(422);
  });
});
