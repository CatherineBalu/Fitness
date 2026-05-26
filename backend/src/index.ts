import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { Elysia } from 'elysia';

import { DomainValidationError, HttpError } from './lib/errors';
import { clerkMiddleware } from './middleware/auth';
import { profileRoutes } from './routes/auth';
import { calendarRoutes } from './routes/calendar';
import { customerRoutes } from './routes/customer';
import { scheduleRoutes } from './routes/schedule';
import { employeeTypeRoutes } from './routes/staff/employee-type';
import { exerciseTypeRoutes } from './routes/staff/exercise-type';
import { lectureRoutes } from './routes/staff/lecture';
import { staffRoutes, staffWriteRoutes, staffDeleteRoutes } from './routes/staff/staff';
import { adminStatsRoutes } from './routes/stats/admin';
import { staffStatsRoutes } from './routes/stats/staff';
import { subscriptionRoutes } from './routes/subscriptions';

export const app = new Elysia()
  .use(
    cors({
      origin: [
        process.env.FRONTEND_URL ?? 'http://localhost:5173',
        'http://localhost:5173',
        'http://127.0.0.1:5173',
      ],
      credentials: true,
    }),
  )
  .use(
    swagger({
      path: '/swagger',
      documentation: {
        info: {
          title: 'Gym Management API',
          version: '1.0.0',
          description: 'Backend API for the pb138 gym management web app.',
        },
      },
    }),
  )
  .use(clerkMiddleware)
  .onError(({ code, error, set }) => {
    if (error instanceof DomainValidationError) {
      set.status = error.status;
      return { error: error.message, fieldErrors: error.fieldErrors ?? {} };
    }
    if (error instanceof HttpError) {
      set.status = error.status;
      return { error: error.message };
    }
    if (code === 'VALIDATION') {
      set.status = 422;
      return { error: 'Validation failed', details: error.message };
    }
    console.error('[unexpected]', error);
    set.status = 500;
    return { error: 'Internal server error' };
  })
  .get('/', () => 'OK')
  .use(profileRoutes)
  .use(scheduleRoutes)
  .use(calendarRoutes)
  .use(staffRoutes)
  .use(staffWriteRoutes)
  .use(staffDeleteRoutes)
  .use(lectureRoutes)
  .use(exerciseTypeRoutes)
  .use(employeeTypeRoutes)
  .use(adminStatsRoutes)
  .use(staffStatsRoutes)
  .use(customerRoutes)
  .use(subscriptionRoutes)
  .listen({
    port: parseInt(process.env.PORT ?? '3001'),
    hostname: '0.0.0.0',
  });

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
