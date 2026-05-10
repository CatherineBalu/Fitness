import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { DomainValidationError, HttpError } from './lib/errors';
import { clerkMiddleware } from './middleware/auth';
import { profileRoutes } from './routes/auth';
import { scheduleRoutes } from './routes/schedule';
import { calendarRoutes } from './routes/calendar';
import { staffRoutes, staffWriteRoutes, staffDeleteRoutes } from './routes/staff/staff';
import { lectureRoutes } from './routes/staff/lecture';
import { exerciseTypeRoutes } from './routes/staff/exercise-type';
import { employeeTypeRoutes } from './routes/staff/employee-type';
import { adminStatsRoutes } from './routes/stats/admin';
import { staffStatsRoutes } from './routes/stats/staff';
import { customerRoutes } from './routes/customer';
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
    port: 3001,
    hostname: '0.0.0.0',
  });

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
