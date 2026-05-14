import { createRootRoute } from '@tanstack/react-router';

import RootLayout from '@/layouts/RootLayout';
import NotFoundPage from '@/pages/NotFoundPage';

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFoundPage,
});
