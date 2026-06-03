import { beforeEach, describe, expect, mock, test } from 'bun:test';

// ── Mocks — must be declared before imports ───────────────────────────

const mockSendReminderEmail = mock(async () => {});

mock.module('../src/lib/email', () => ({
  sendReminderEmail: mockSendReminderEmail,
}));

/* eslint-disable @typescript-eslint/no-explicit-any */
function makeSelectChain(rows: unknown[]): any {
  const chain: any = {
    from: () => chain,
    innerJoin: () => chain,
    where: () => chain,
    then: (resolve: (v: unknown) => unknown) => Promise.resolve(rows).then(resolve),
  };
  return chain;
}

function makeUpdateChain(): any {
  const chain: any = {
    set: () => chain,
    where: async () => undefined,
  };
  return chain;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const mockSelect = mock(() => makeSelectChain([]));
const mockUpdate = mock(() => makeUpdateChain());

mock.module('../src/db/db', () => ({
  db: {
    select: mockSelect,
    update: mockUpdate,
  },
}));

import { sendPendingReminders } from '../src/lib/reminderJob';

// ── Fixtures ──────────────────────────────────────────────────────────

const MOCK_ROW = {
  reservationId: 'res-uuid-1',
  email: 'alice@example.com',
  firstName: 'Alice',
  lectureName: 'Yoga',
  startTime: new Date('2026-06-03T10:00:00Z'),
  endTime: new Date('2026-06-03T11:00:00Z'),
  roomName: 'Room A',
};

// ── Tests ─────────────────────────────────────────────────────────────

describe('sendPendingReminders', () => {
  beforeEach(() => {
    mockSendReminderEmail.mockReset();
    mockSelect.mockReset();
    mockUpdate.mockReset();
    mockSelect.mockImplementation(() => makeSelectChain([]));
    mockUpdate.mockImplementation(() => makeUpdateChain());
  });

  test('sends an email and stamps reminderSentAt for each pending row', async () => {
    mockSelect.mockImplementation(() => makeSelectChain([MOCK_ROW]));

    await sendPendingReminders();

    expect(mockSendReminderEmail).toHaveBeenCalledTimes(1);
    expect(mockSendReminderEmail).toHaveBeenCalledWith(
      MOCK_ROW.email,
      MOCK_ROW.firstName,
      MOCK_ROW.lectureName,
      MOCK_ROW.startTime.toISOString(),
      MOCK_ROW.endTime.toISOString(),
      MOCK_ROW.roomName,
    );
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  test('does not stamp the row when the email send fails', async () => {
    mockSelect.mockImplementation(() => makeSelectChain([MOCK_ROW]));
    mockSendReminderEmail.mockImplementation(async () => {
      throw new Error('SMTP error');
    });

    await sendPendingReminders();

    expect(mockSendReminderEmail).toHaveBeenCalledTimes(1);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  test('sends nothing on the second run when rows are already stamped', async () => {
    // First run: pending rows exist
    mockSelect.mockImplementationOnce(() => makeSelectChain([MOCK_ROW]));
    // Second run: DB filter (isNull reminderSentAt) returns nothing
    mockSelect.mockImplementationOnce(() => makeSelectChain([]));

    await sendPendingReminders();
    await sendPendingReminders();

    expect(mockSendReminderEmail).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  test('sends emails for multiple rows and stamps each one', async () => {
    const secondRow = {
      ...MOCK_ROW,
      reservationId: 'res-uuid-2',
      email: 'bob@example.com',
      firstName: 'Bob',
    };
    mockSelect.mockImplementation(() => makeSelectChain([MOCK_ROW, secondRow]));

    await sendPendingReminders();

    expect(mockSendReminderEmail).toHaveBeenCalledTimes(2);
    expect(mockUpdate).toHaveBeenCalledTimes(2);
  });

  test('stamps successful rows even when a sibling row fails', async () => {
    const failRow = { ...MOCK_ROW, reservationId: 'res-uuid-fail', email: 'fail@example.com' };
    mockSelect.mockImplementation(() => makeSelectChain([MOCK_ROW, failRow]));
    mockSendReminderEmail
      .mockImplementationOnce(async () => {}) // first row succeeds
      .mockImplementationOnce(async () => {
        throw new Error('SMTP error');
      }); // second fails

    await sendPendingReminders();

    expect(mockSendReminderEmail).toHaveBeenCalledTimes(2);
    expect(mockUpdate).toHaveBeenCalledTimes(1); // only the successful one stamped
  });
});
