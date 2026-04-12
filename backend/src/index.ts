import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { cookie } from '@elysiajs/cookie';
import { authRoutes } from './routes/auth';
import { scheduleRoutes } from './routes/schedule';

export const app = new Elysia()
  .use(
    cors({
      origin: 'http://localhost:5173', // Vite dev server
      credentials: true, // required for cookies
    }),
  )
  .use(cookie())
  .get('/', () => 'OK')
  .use(authRoutes)
  .use(scheduleRoutes)
  .listen({
    port: 3000,
    hostname: '0.0.0.0',
  });

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
