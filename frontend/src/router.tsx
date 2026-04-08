import {
  createRouter,
  createRoute,
  createRootRoute,
} from '@tanstack/react-router';
import App from './App';
import SchedulePage from './pages/SchedulePage';

const rootRoute = createRootRoute();

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: App,
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
