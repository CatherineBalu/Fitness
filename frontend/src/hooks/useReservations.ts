import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { apiClient } from '@/lib/apiClient';

import { calendarKeys } from './useCalendar';

export const customerRegistrationsKey = ['customer', 'registrations'] as const;

interface ReservationResponse {
  success: boolean;
}

export function useRegisterReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (scheduleId: string) =>
      apiClient<ReservationResponse>(`/schedule/${scheduleId}/reservations`, {
        method: 'POST',
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: calendarKeys.all });
      void qc.invalidateQueries({ queryKey: customerRegistrationsKey });
      toast.success('Registered for lecture');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

export function useUnregisterReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (scheduleId: string) =>
      apiClient<ReservationResponse>(`/schedule/${scheduleId}/reservations`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: calendarKeys.all });
      void qc.invalidateQueries({ queryKey: customerRegistrationsKey });
      toast.success('Reservation cancelled');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}
