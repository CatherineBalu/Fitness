import { beforeEach, describe, expect, mock, test } from 'bun:test';

// ── Mocks — must be declared before imports ───────────────────────────

mock.module('@clerk/backend', () => ({
  createClerkClient: () => ({
    users: { getUser: async () => ({ emailAddresses: [], firstName: '', lastName: '' }) },
  }),
  verifyToken: async () => {
    throw new Error('no auth in public route tests');
  },
}));

const mockListPublicInstructors = mock(async () => [] as unknown[]);

mock.module('../src/services/staff.service', () => ({
  listPublicInstructors: mockListPublicInstructors,
  listEmployees: async () => [],
  createStaff: async () => {},
  updateStaff: async () => {},
  deleteStaff: async () => {},
  getEmployeeLectures: async () => [],
  getEmployeeLecturesForClerkUser: async () => [],
  listExerciseTypes: async () => [],
  listEmployeeTypes: async () => [],
  listLectureMembers: async () => [],
}));

mock.module('../src/db/db', () => ({
  db: { select: () => ({ from: () => ({ where: () => ({ limit: async () => [] }) }) }) },
}));

import { app } from '../src';

const URL = 'http://localhost/api/instructors';

describe('GET /api/instructors', () => {
  beforeEach(() => {
    mockListPublicInstructors.mockReset();
  });

  test('returns instructor list without auth (public endpoint)', async () => {
    const data = [
      {
        id: 'inst-1',
        firstName: 'Jane',
        lastName: 'Doe',
        phoneNumber: '+421900000000',
        specializations: ['Yoga', 'Pilates'],
      },
    ];
    mockListPublicInstructors.mockImplementationOnce(async () => data);

    const res = await app.handle(new Request(URL));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(data);
    expect(mockListPublicInstructors).toHaveBeenCalledTimes(1);
  });

  test('returns 500 when service throws', async () => {
    mockListPublicInstructors.mockImplementationOnce(async () => {
      throw new Error('db down');
    });

    const res = await app.handle(new Request(URL));

    expect(res.status).toBe(500);
  });
});
