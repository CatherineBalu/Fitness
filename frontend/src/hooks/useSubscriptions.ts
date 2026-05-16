import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/apiClient';

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  durationDays: number;
}

export const subscriptionKeys = {
  all: ['subscriptions'] as const,
  lists: () => [...subscriptionKeys.all, 'list'] as const,
};

export function useSubscriptions() {
  return useQuery({
    queryKey: subscriptionKeys.lists(),
    queryFn: () => apiClient<SubscriptionPlan[]>('/subscriptions'),
  });
}
