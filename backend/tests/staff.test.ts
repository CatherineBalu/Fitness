import { beforeEach, describe, expect, mock, test } from 'bun:test';

// ── Mocks — must be declared before imports ───────────────────────────

type MockToken = { sub: string; publicMetadata: { role?: string } };

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

// Mock the staff service so the route test doesn't execute real Clerk/email calls
const mockCreateStaff = mock(async () => {});

mock.module('../src/services/staff.service', () => ({
  createStaff: mockCreateStaff,
  listEmployees: async () => [],
  updateStaff: async () => {},
  deleteStaff: async () => {},
  getEmployeeLectures: async () => [],
  getEmployeeLecturesForClerkUser: async () => [],
  listExerciseTypes: async () => [],
  listEmployeeTypes: async () => [],
  listLectureMembers: async () => [],
}));

/* eslint-disable @typescript-eslint/no-explicit-any */
function makeSelectChain(rows: unknown[]): any {
  const chain: any = {
    from: () => chain,
    innerJoin: () => chain,
    leftJoin: () => chain,
    where: () => chain,
    orderBy: () => chain,
    groupBy: () => chain,
    limit: async () => rows,
    then: (resolve: (v: unknown) => unknown) => Promise.resolve(rows).then(resolve),
  };
  return chain;
}

function makeInsertChain(returning: unknown[]): any {
  return {
    values: () => ({ returning: async () => returning }),
  };
}

function makeUpdateChain(): any {
  const chain: any = {
    set: () => chain,
    where: async () => undefined,
  };
  return chain;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const PERSON_ROW = { id: 'person-uuid', clerkId: 'user_test' };

const mockDbSelect = mock(() => makeSelectChain([]));

mock.module('../src/db/db', () => ({
  db: {
    select: mockDbSelect,
    insert: () => makeInsertChain([PERSON_ROW]),
    update: () => makeUpdateChain(),
    transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({}),
  },
}));

import { app } from '../src';

// ── Helpers ───────────────────────────────────────────────────────────

function authHeader(role: string) {
  mockVerifyToken.mockImplementation(async () => ({
    sub: 'user_test',
    publicMetadata: { role },
  }));
  return { Authorization: `Bearer fake.jwt.${role}` };
}

const VALID_BODY = {
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  phoneNumber: '+421900123456',
  role: 'Admin',
};

const STAFF_URL = 'http://localhost/api/staff';

// ── Tests ─────────────────────────────────────────────────────────────

describe('POST /api/staff', () => {
  beforeEach(() => {
    mockVerifyToken.mockReset();
    mockCreateStaff.mockReset();
    mockDbSelect.mockReset();

    mockCreateStaff.mockImplementation(async () => {});
    // first select = JIT provisioning check (person found → skip insert)
    mockDbSelect.mockImplementationOnce(() => makeSelectChain([PERSON_ROW]));
  });

  test('returns 403 when unauthenticated', async () => {
    const res = await app.handle(
      new Request(STAFF_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_BODY),
      }),
    );
    expect(res.status).toBe(403);
  });

  test('returns 422 when required fields are missing', async () => {
    const headers = { ...authHeader('admin'), 'Content-Type': 'application/json' };

    const res = await app.handle(
      new Request(STAFF_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ firstName: 'Jane' }), // missing lastName, email, role
      }),
    );
    expect(res.status).toBe(422);
  });

  test('returns 422 when phoneNumber is missing', async () => {
    const headers = { ...authHeader('admin'), 'Content-Type': 'application/json' };
    const withoutPhone = {
      firstName: VALID_BODY.firstName,
      lastName: VALID_BODY.lastName,
      email: VALID_BODY.email,
      role: VALID_BODY.role,
    };

    const res = await app.handle(
      new Request(STAFF_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(withoutPhone),
      }),
    );
    expect(res.status).toBe(422);
  });

  test('calls createStaff and returns 201 { success: true }', async () => {
    const headers = { ...authHeader('admin'), 'Content-Type': 'application/json' };

    const res = await app.handle(
      new Request(STAFF_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(VALID_BODY),
      }),
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual({ success: true });
    expect(mockCreateStaff).toHaveBeenCalledTimes(1);
    expect(mockCreateStaff).toHaveBeenCalledWith(VALID_BODY);
  });
});

const PATCH_BODY = {
  firstName: 'Jane',
  lastName: 'Doe',
  phoneNumber: '+421900123456',
};

describe('PATCH /api/staff/:id', () => {
  beforeEach(() => {
    mockVerifyToken.mockReset();
    mockDbSelect.mockReset();
    mockDbSelect.mockImplementationOnce(() => makeSelectChain([PERSON_ROW]));
  });

  test('returns 200 { success: true } with a valid body', async () => {
    const headers = { ...authHeader('admin'), 'Content-Type': 'application/json' };

    const res = await app.handle(
      new Request(`${STAFF_URL}/emp-1`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(PATCH_BODY),
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });

  test('returns 422 when phoneNumber is missing', async () => {
    const headers = { ...authHeader('admin'), 'Content-Type': 'application/json' };
    const withoutPhone = {
      firstName: PATCH_BODY.firstName,
      lastName: PATCH_BODY.lastName,
    };

    const res = await app.handle(
      new Request(`${STAFF_URL}/emp-1`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(withoutPhone),
      }),
    );
    expect(res.status).toBe(422);
  });
});
