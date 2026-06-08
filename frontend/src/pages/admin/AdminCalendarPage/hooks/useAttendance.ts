import { useMemo, useState } from 'react';

import { useLectureMembers, useUpdateAttendance } from '@/hooks/useCalendar';

import type { Lecture } from '../adminCalendar.types';

export function useAttendance() {
  const [open, setOpen] = useState(false);
  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [attendanceOverrides, setAttendanceOverrides] = useState<
    Record<string, boolean>
  >({});

  const lectureId = lecture?.id ?? null;
  const { data: members = [], isLoading: loadingMembers } =
    useLectureMembers(lectureId);
  const updateAttendance = useUpdateAttendance(lectureId ?? '');

  const attendanceStatus = useMemo(() => {
    const result: Record<string, boolean> = {};
    members.forEach((m) => {
      result[m.id] = attendanceOverrides[m.id] ?? m.attended ?? false;
    });
    return result;
  }, [members, attendanceOverrides]);

  function openDialog(l: Lecture) {
    setLecture(l);
    setOpen(true);
  }

  function handleClose(isOpen: boolean) {
    setOpen(isOpen);
    if (!isOpen) setAttendanceOverrides({});
  }

  function toggleAttendance(memberId: string, isPresent: boolean) {
    setAttendanceOverrides((prev) => ({ ...prev, [memberId]: isPresent }));
  }

  function handleSaveAttendance() {
    if (!lecture) return;
    const attendanceRecords = Object.entries(attendanceStatus).map(
      ([personId, attended]) => ({ personId, attended }),
    );
    updateAttendance.mutate(
      { attendanceRecords },
      { onSuccess: () => handleClose(false) },
    );
  }

  return {
    open,
    handleClose,
    lecture,
    members,
    loadingMembers,
    attendanceStatus,
    updateAttendance,
    openDialog,
    toggleAttendance,
    handleSaveAttendance,
  };
}
