import { createFileRoute } from '@tanstack/react-router';

import { requireAuth } from '@/lib/routeGuards';
import CheckoutPage from '@/pages/CheckoutPage';

export const Route = createFileRoute('/checkout')({
  validateSearch: (search: Record<string, unknown>): { plan?: string } => ({
    plan: typeof search.plan === 'string' ? search.plan : undefined,
  }),
  beforeLoad: requireAuth,
  component: CheckoutPage,
});
