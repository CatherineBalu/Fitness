import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { apiClient } from '@/lib/apiClient';

export interface LectureOption {
  id: string;
  lectureName: string;
  exerciseType: string;
}

export interface RoomOption {
  id: string;
  name: string;
  capacity: number;
}

export interface InstructorOption {
  id: string;
  name: string;
}

export interface ScheduleItem {
  id: string;
  startTime: string;
  endTime: string;
  lectureName: string;
  description: string;
  roomName: string;
  roomCapacity: number;
  exerciseType: string;
  forMembers: boolean;
  instructors: { name: string; isLead: boolean }[];
  registered: number;
  isRegistered: boolean;
}

export interface LectureMember {
  id: string;
  name: string;
  email: string;
  attended?: boolean;
}

export interface CreateSchedulePayload {
  lectureId: string;
  roomId: string;
  startTime: string;
  endTime: string;
  instructors: { employeeId: string; isLead: boolean }[];
}

export interface UpdateSchedulePayload {
  roomId?: string;
  startTime?: string;
  endTime?: string;
}

export interface AttendancePayload {
  attendanceRecords: { personId: string; attended: boolean }[];
}

export const calendarKeys = {
  all: ['calendar'] as const,
  schedule: (from: string, to: string) =>
    [...calendarKeys.all, 'schedule', from, to] as const,
  lookups: () => [...calendarKeys.all, 'lookups'] as const,
  lectures: () => [...calendarKeys.lookups(), 'lectures'] as const,
  rooms: () => [...calendarKeys.lookups(), 'rooms'] as const,
  instructors: () => [...calendarKeys.lookups(), 'instructors'] as const,
  members: (lectureId: string | null) =>
    [...calendarKeys.all, 'members', lectureId] as const,
};

export function useSchedule(
  from: string | null,
  to: string | null,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: calendarKeys.schedule(from ?? '', to ?? ''),
    queryFn: () =>
      apiClient<ScheduleItem[]>(`/schedule?from=${from!}&to=${to!}`),
    enabled: !!from && !!to && (options.enabled ?? true),
  });
}

export function useLectures() {
  return useQuery({
    queryKey: calendarKeys.lectures(),
    queryFn: () => apiClient<LectureOption[]>('/calendar/lectures'),
  });
}

export function useRooms() {
  return useQuery({
    queryKey: calendarKeys.rooms(),
    queryFn: () => apiClient<RoomOption[]>('/calendar/rooms'),
  });
}

export function useInstructors() {
  return useQuery({
    queryKey: calendarKeys.instructors(),
    queryFn: () => apiClient<InstructorOption[]>('/calendar/instructors'),
  });
}

export function useLectureMembers(lectureId: string | null) {
  return useQuery({
    queryKey: calendarKeys.members(lectureId),
    queryFn: () =>
      apiClient<LectureMember[]>(`/calendar/${lectureId!}/members`),
    enabled: !!lectureId,
  });
}

export function useCreateSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSchedulePayload) =>
      apiClient<{ id: string }>('/calendar', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: calendarKeys.all });
      toast.success('Lecture scheduled');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

export function useUpdateSchedule(lectureId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateSchedulePayload) =>
      apiClient<{ id: string }>(`/calendar/${lectureId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: calendarKeys.all });
      toast.success('Schedule updated');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

export function useUpdateAttendance(lectureId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AttendancePayload) =>
      apiClient<void>(`/calendar/${lectureId}/attendance`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: calendarKeys.all });
      toast.success('Attendance saved');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

export function useAddLectureMember(lectureId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (email: string) =>
      apiClient<LectureMember>(`/calendar/${lectureId}/members`, {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: calendarKeys.members(lectureId) });
      void qc.invalidateQueries({
        queryKey: [...calendarKeys.all, 'schedule'],
      });
      toast.success('Member added');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

export function useRemoveLectureMember(lectureId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) =>
      apiClient<void>(`/calendar/${lectureId}/members/${memberId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: calendarKeys.members(lectureId) });
      void qc.invalidateQueries({
        queryKey: [...calendarKeys.all, 'schedule'],
      });
      toast.success('Member removed');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}
