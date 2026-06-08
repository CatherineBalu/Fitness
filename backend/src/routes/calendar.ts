import { Elysia, t } from 'elysia';

import {
  addMemberByEmail,
  bulkUpdateAttendance,
  createSchedule,
  deleteSchedule,
  listInstructors,
  listLectureTemplates,
  listRooms,
  listScheduleMembers,
  removeMember,
  updateSchedule,
} from '../services/calendar.service';

export const calendarRoutes = new Elysia({ prefix: '/calendar' })

  .get('/lectures', () => listLectureTemplates())

  .get('/rooms', () => listRooms())

  .get('/instructors', () => listInstructors())

  .post(
    '/',
    async ({ body, set }) => {
      const result = await createSchedule(body);
      set.status = 201;
      return result;
    },
    {
      body: t.Object({
        lectureId: t.String(),
        roomId: t.String(),
        startTime: t.String(),
        endTime: t.String(),
        instructors: t.Optional(
          t.Array(
            t.Object({
              employeeId: t.String(),
              isLead: t.Boolean(),
            }),
          ),
        ),
      }),
    },
  )

  .get('/:id/members', ({ params }) => listScheduleMembers(params.id), {
    params: t.Object({
      id: t.String({ format: 'uuid', error: 'Invalid schedule ID format' }),
    }),
  })

  .post(
    '/:id/members',
    async ({ params, body, set }) => {
      const result = await addMemberByEmail(params.id, body.email);
      set.status = 201;
      return result;
    },
    {
      params: t.Object({ id: t.String({ format: 'uuid' }) }),
      body: t.Object({ email: t.String({ format: 'email' }) }),
    },
  )

  .delete(
    '/:id/members/:personId',
    async ({ params }) => {
      await removeMember(params.id, params.personId);
      return { success: true };
    },
    {
      params: t.Object({
        id: t.String({ format: 'uuid' }),
        personId: t.String({ format: 'uuid' }),
      }),
    },
  )

  .delete(
    '/:id',
    async ({ params }) => {
      await deleteSchedule(params.id);
      return { success: true };
    },
    {
      params: t.Object({
        id: t.String({ format: 'uuid', error: 'Invalid schedule ID format' }),
      }),
    },
  )

  .patch(
    '/:id',
    async ({ params, body }) => {
      await updateSchedule(params.id, body);
      return { success: true };
    },
    {
      params: t.Object({ id: t.String({ format: 'uuid' }) }),
      body: t.Object({
        roomId: t.Optional(t.String({ format: 'uuid' })),
        startTime: t.Optional(t.String()),
        endTime: t.Optional(t.String()),
      }),
    },
  )

  .patch(
    '/:id/attendance',
    async ({ params, body }) => {
      await bulkUpdateAttendance(params.id, body.attendanceRecords);
      return { success: true };
    },
    {
      params: t.Object({ id: t.String({ format: 'uuid' }) }),
      body: t.Object({
        attendanceRecords: t.Array(
          t.Object({
            personId: t.String({ format: 'uuid' }),
            attended: t.Boolean(),
          }),
        ),
      }),
    },
  );
