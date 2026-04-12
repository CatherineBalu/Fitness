import {
  createRouter,
  createRoute,
  createRootRoute,
} from '@tanstack/react-router';
import RootLayout from '@/layouts/RootLayout';
import HomePage from '@/pages/HomePage';
import SchedulePage from '@/pages/SchedulePage';
import NotFoundPage from '@/pages/NotFoundPage';
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage';
import AdminStaffPage from '@/pages/admin/AdminStaffPage';
import AdminCalendarPage from '@/pages/admin/AdminCalendarPage';

const rootRoute = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFoundPage,
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

const adminDashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  component: AdminDashboardPage,
});

const adminStaffRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/staff',
  component: AdminStaffPage,
});

const adminCalendarRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/calendar',
  component: AdminCalendarPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  scheduleRoute,
  adminDashboardRoute,
  adminStaffRoute,
  adminCalendarRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
