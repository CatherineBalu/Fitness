import {
  createRouter,
  createRoute,
  createRootRoute,
  redirect,
} from '@tanstack/react-router';
import RootLayout from '@/layouts/RootLayout';
import HomePage from '@/pages/HomePage';
import SchedulePage from '@/pages/SchedulePage';
import NotFoundPage from '@/pages/NotFoundPage';
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage';
import AdminStaffPage from '@/pages/admin/AdminStaffPage';
import AdminCalendarPage from '@/pages/admin/AdminCalendarPage';
import AdminStatisticsPage from '@/pages/admin/AdminStatisticsPage';
import StaffStatisticsPage from '@/pages/staff/StaffStatisticsPage';
import MyProfilePage from '@/pages/MyProfilePage';
import { can, type Permission } from '@/lib/permissions';

function getRole(): string | null {
  return (
    (window.Clerk?.user?.publicMetadata as { role?: string })?.role ?? null
  );
}

function requireAuthGuard() {
  if (!window.Clerk?.user) throw redirect({ to: '/' });
}

function requirePermissionGuard(permission: Permission) {
  return function () {
    if (!window.Clerk?.user) throw redirect({ to: '/' });
    if (!can(getRole(), permission)) throw redirect({ to: '/' });
  };
}

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
  beforeLoad: requirePermissionGuard('staff:read'),
  component: AdminDashboardPage,
});

const adminStaffRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/staff',
  beforeLoad: requirePermissionGuard('staff:read'),
  component: AdminStaffPage,
});

const adminCalendarRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/calendar',
  beforeLoad: requirePermissionGuard('schedule:write'),
  component: AdminCalendarPage,
});

const adminStatsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/statistics',
  beforeLoad: requirePermissionGuard('stats:admin'),
  component: AdminStatisticsPage,
});

const staffStatsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/staff/statistics',
  beforeLoad: requirePermissionGuard('stats:staff'),
  component: StaffStatisticsPage,
});

const myProfileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/my-profile',
  beforeLoad: requireAuthGuard,
  component: MyProfilePage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  scheduleRoute,
  adminDashboardRoute,
  adminStaffRoute,
  adminCalendarRoute,
  adminStatsRoute,
  staffStatsRoute,
  myProfileRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

declare global {
  interface Window {
    Clerk?: {
      user?: {
        publicMetadata?: Record<string, unknown>;
      };
    };
  }
}
