import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/apiClient';

export interface Instructor {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string | null;
  specializations: string[];
}

export const instructorKeys = {
  all: ['instructors'] as const,
  lists: () => [...instructorKeys.all, 'list'] as const,
};

export function useInstructors() {
  return useQuery({
    queryKey: instructorKeys.lists(),
    queryFn: () => apiClient<Instructor[]>('/api/instructors'),
  });
}
