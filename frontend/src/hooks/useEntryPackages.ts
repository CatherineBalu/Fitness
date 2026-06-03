import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { apiClient } from '@/lib/apiClient';

export interface EntryPackage {
  id: string;
  name: string;
  entryCount: number;
  price: string;
}

export interface BuyEntryPackagePayload {
  entryPackageId: string;
  paymentMethod?: string;
}

export const entryPackageKeys = {
  all: ['entryPackages'] as const,
  lists: () => [...entryPackageKeys.all, 'list'] as const,
};

export function useEntryPackages() {
  return useQuery({
    queryKey: entryPackageKeys.lists(),
    queryFn: () => apiClient<EntryPackage[]>('/entry-packages'),
  });
}

export function useBuyEntryPackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: BuyEntryPackagePayload) =>
      apiClient<{ success: boolean; entryBalance: number }>(
        '/entry-packages/buy',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['customerEntries'] });
      toast.success('Entry package purchased!');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}
