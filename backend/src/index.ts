import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { cookie } from '@elysiajs/cookie';
import { authRoutes } from './routes/auth';

export const app = new Elysia()
  .use(
    cors({
      origin: 'http://localhost:5173', // Vite dev server
      credentials: true, // required for cookies
    }),
  )
  .use(cookie())
  .use(authRoutes)
  .listen({
    port: 3000,
    hostname: '0.0.0.0',
  });

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
