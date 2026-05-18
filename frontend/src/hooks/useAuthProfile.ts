import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/apiClient';

export interface AuthProfile {
  id: string;
  name: string;
  surname: string;
  email: string;
  phoneNumber: string | null;
  role: string;
  hasActiveMembership: boolean;
  subscriptionValidUntil: string | null;
}

export const authKeys = {
  all: ['auth'] as const,
  profile: () => [...authKeys.all, 'profile'] as const,
};

export function useAuthProfile(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: authKeys.profile(),
    queryFn: () => apiClient<AuthProfile>('/auth/profile'),
    enabled: options?.enabled,
  });
}
