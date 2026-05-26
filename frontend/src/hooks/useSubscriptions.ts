import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { apiClient } from '@/lib/apiClient';

import { authKeys } from './useAuthProfile';

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  durationDays: number;
}

export interface BuySubscriptionPayload {
  subscriptionId: string;
  paymentMethod?: string;
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

export function useBuySubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: BuySubscriptionPayload) =>
      apiClient<{ success: boolean }>('/subscriptions/buy', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: authKeys.profile() });
      void qc.invalidateQueries({ queryKey: subscriptionKeys.all });
      void qc.invalidateQueries({ queryKey: ['customer'] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}
