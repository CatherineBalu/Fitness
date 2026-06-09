import { createFileRoute } from '@tanstack/react-router';

import { requireAuth } from '@/lib/routeGuards';
import EntryCheckoutPage from '@/pages/EntryCheckoutPage';

export const Route = createFileRoute('/entry-checkout')({
  validateSearch: (search: Record<string, unknown>): { package?: string } => ({
    package: typeof search.package === 'string' ? search.package : undefined,
  }),
  beforeLoad: requireAuth,
  component: EntryCheckoutPage,
});
