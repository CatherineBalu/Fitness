import {
  createRouter,
  createRoute,
  createRootRoute,
} from '@tanstack/react-router';
import RootLayout from '@/layouts/RootLayout';
import HomePage from '@/pages/HomePage';
import SchedulePage from '@/pages/SchedulePage';

const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
});

const scheduleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/schedule',
  component: SchedulePage,
});

const routeTree = rootRoute.addChildren([indexRoute, scheduleRoute]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
