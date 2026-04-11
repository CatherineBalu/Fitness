import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { staffRoutes, lectureRoutes } from './routes/staff';

export const app = new Elysia()
  .use(cors())
  .use(staffRoutes)
  .use(lectureRoutes)
  .get('/', () => 'Fitness App API')
  .listen(3000);

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
