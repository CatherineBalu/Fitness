import { Elysia, t } from 'elysia';

import { requirePermission } from '../middleware/auth';
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
  // All lecture-management endpoints are admin/staff only.
  .use(requirePermission('schedule:write'))

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
        lectureId: t.String({ format: 'uuid' }),
        roomId: t.String({ format: 'uuid' }),
        startTime: t.String({ format: 'date-time' }),
        endTime: t.String({ format: 'date-time' }),
        instructors: t.Optional(
          t.Array(
            t.Object({
              employeeId: t.String({ format: 'uuid' }),
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
        startTime: t.Optional(t.String({ format: 'date-time' })),
        endTime: t.Optional(t.String({ format: 'date-time' })),
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
