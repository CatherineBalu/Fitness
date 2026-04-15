import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { clerkMiddleware } from './middleware/auth';
import { profileRoutes } from './routes/auth';
import { scheduleRoutes } from './routes/schedule';
import { staffRoutes, lectureRoutes } from './routes/staff';

export const app = new Elysia()
  .onRequest(({ request }) => {
    console.log(`[request] ${request.method} ${request.url}`);
  })
  .use(cors({ origin: true, credentials: true }))
  .use(clerkMiddleware)
  .get('/', () => {
    console.log('[test] root route hit');
    return 'OK';
  })
  .use(profileRoutes)
  .use(scheduleRoutes)
  .use(staffRoutes)
  .use(lectureRoutes)
  .listen({
    port: 3001,
    hostname: '0.0.0.0',
  });

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
