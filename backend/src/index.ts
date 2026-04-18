import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { clerkMiddleware } from './middleware/auth';
import { profileRoutes } from './routes/auth';
import { scheduleRoutes } from './routes/schedule';
import { staffRoutes, lectureRoutes, exerciseTypeRoutes, employeeTypeRoutes } from './routes/staff';

export const app = new Elysia()
  .use(
    cors({
      origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
      credentials: true,
    }),
  )
  .use(clerkMiddleware)
  .get('/', () => 'OK')
  .use(profileRoutes)
  .use(scheduleRoutes)
  .use(staffRoutes)
  .use(lectureRoutes)
  .use(exerciseTypeRoutes)
  .use(employeeTypeRoutes)
  .listen({
    port: 3001,
    hostname: '0.0.0.0',
  });

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
