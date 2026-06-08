import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { apiClient } from '@/lib/apiClient';

export interface EntryLog {
  id: string;
  scannedAt: string;
  staffName: string;
}

export interface EntryCredit {
  remainingCount: number;
  expiresAt: string;
}

export interface CustomerEntries {
  entryBalance: number;
  credits: EntryCredit[];
  membershipEnteredToday: boolean;
  logs: EntryLog[];
}

export interface GenerateTokenResponse {
  token: string;
  expiresAt: string;
}

export interface ScanResult {
  customerName: string;
  remainingBalance: number | null;
  kind: 'entry' | 'membership';
}

export const entryKeys = {
  all: ['customerEntries'] as const,
};

export function useCustomerEntries(options?: { refetchInterval?: number | false }) {
  return useQuery({
    queryKey: entryKeys.all,
    queryFn: () => apiClient<CustomerEntries>('/api/customer/entries'),
    refetchInterval: options?.refetchInterval,
  });
}

export function useGenerateQrToken() {
  return useMutation({
    mutationFn: () =>
      apiClient<GenerateTokenResponse>('/entry/token', { method: 'POST' }),
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

export function useGenerateMembershipQrToken() {
  return useMutation({
    mutationFn: () =>
      apiClient<GenerateTokenResponse>('/entry/membership-token', {
        method: 'POST',
      }),
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

export function useScanEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (token: string) =>
      apiClient<ScanResult>('/entry/scan', {
        method: 'POST',
        body: JSON.stringify({ token }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: entryKeys.all });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}
