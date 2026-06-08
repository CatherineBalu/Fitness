import { describe, test, expect, mock, beforeEach } from 'bun:test';

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

const SCHEDULE_ID = '00000000-0000-0000-0000-000000000001';
const DELETE_URL = `http://localhost/calendar/${SCHEDULE_ID}`;

function deleteRequest(url = DELETE_URL) {
  return app.handle(new Request(url, { method: 'DELETE' }));
}

// ─────────────────────────────────────────────────────────────────────
// DELETE /calendar/:id — cancel lecture
// ─────────────────────────────────────────────────────────────────────

describe('DELETE /calendar/:id', () => {
  beforeEach(() => {
    selectResponses = [];
    sendCancellationEmail.mockReset();
  });

  test('soft-deletes the lecture and returns success (happy path)', async () => {
    selectResponses = [
      // schedule lookup — future lecture so registered members get emailed
      [
        {
          lectureName: 'Morning Yoga',
          startTime: new Date(Date.now() + 1000 * 60 * 60 * 24),
        },
      ],
      // registered customers to notify
      [{ name: 'Alice', email: 'alice@example.com' }],
    ];

    const res = await deleteRequest();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(true);
  });

  test('returns 404 when the schedule does not exist', async () => {
    selectResponses = [[]]; // schedule lookup returns nothing
    const res = await deleteRequest();
    expect(res.status).toBe(404);
  });

  test('returns 422 when the id is not a valid uuid', async () => {
    const res = await deleteRequest('http://localhost/calendar/not-a-uuid');
    expect(res.status).toBe(422);
  });
});
