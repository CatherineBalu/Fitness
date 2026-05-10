import { Elysia, t } from 'elysia';
import { handleRoute } from '../lib/errors';
import {
  addMemberByEmail,
  bulkUpdateAttendance,
  createSchedule,
  listInstructors,
  listLectureTemplates,
  listRooms,
  listScheduleMembers,
  removeMember,
  updateSchedule,
} from '../services/calendar.service';

export const calendarRoutes = new Elysia({ prefix: '/calendar' })

  .get('/lectures', ({ set }) => handleRoute(set, () => listLectureTemplates()))

  .get('/rooms', ({ set }) => handleRoute(set, () => listRooms()))

  .get('/instructors', ({ set }) => handleRoute(set, () => listInstructors()))

  .post(
    '/',
    ({ body, set }) =>
      handleRoute(set, async () => {
        const result = await createSchedule(body);
        set.status = 201;
        return result;
      }),
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

  .get(
    '/:id/members',
    ({ params, set }) => handleRoute(set, () => listScheduleMembers(params.id)),
    {
      params: t.Object({
        id: t.String({ format: 'uuid', error: 'Invalid schedule ID format' }),
      }),
    },
  )

  .post(
    '/:id/members',
    ({ params, body, set }) =>
      handleRoute(set, async () => {
        const result = await addMemberByEmail(params.id, body.email);
        set.status = 201;
        return result;
      }),
    {
      params: t.Object({ id: t.String({ format: 'uuid' }) }),
      body: t.Object({ email: t.String({ format: 'email' }) }),
    },
  )

  .delete(
    '/:id/members/:personId',
    ({ params, set }) =>
      handleRoute(set, async () => {
        await removeMember(params.id, params.personId);
        return { success: true };
      }),
    {
      params: t.Object({
        id: t.String({ format: 'uuid' }),
        personId: t.String({ format: 'uuid' }),
      }),
    },
  )

  .patch(
    '/:id',
    ({ params, body, set }) =>
      handleRoute(set, async () => {
        await updateSchedule(params.id, body);
        return { success: true };
      }),
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
    ({ params, body, set }) =>
      handleRoute(set, async () => {
        await bulkUpdateAttendance(params.id, body.attendanceRecords);
        return { success: true };
      }),
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
