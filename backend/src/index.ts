import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { clerkMiddleware } from './middleware/auth';
import { profileRoutes } from './routes/auth';
import { scheduleRoutes } from './routes/schedule';
import { calendarRoutes } from './routes/calendar';
import {
  staffRoutes,
  staffWriteRoutes,
  staffDeleteRoutes,
  lectureRoutes,
  exerciseTypeRoutes,
  employeeTypeRoutes,
} from './routes/staff';
import { adminStatsRoutes, staffStatsRoutes } from './routes/stats';
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
