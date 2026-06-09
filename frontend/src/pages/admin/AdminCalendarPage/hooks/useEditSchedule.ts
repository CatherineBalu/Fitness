import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import {
  useDeleteSchedule,
  useRooms,
  useUpdateSchedule,
} from '@/hooks/useCalendar';

import { editScheduleSchema } from '../adminCalendar.types';

import type { EditScheduleValues, Lecture } from '../adminCalendar.types';
import type { RoomOption } from '@/hooks/useCalendar';

export function useEditSchedule() {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [capacityWarningOpen, setCapacityWarningOpen] = useState(false);
  const [pendingEditRoom, setPendingEditRoom] = useState<RoomOption | null>(
    null,
  );

  const lectureId = lecture?.id ?? null;
  const { data: rooms = [] } = useRooms();
  const updateSchedule = useUpdateSchedule(lectureId ?? '');
  const deleteSchedule = useDeleteSchedule(lectureId ?? '');

  const form = useForm<EditScheduleValues>({
    resolver: zodResolver(editScheduleSchema),
    defaultValues: { roomId: '', date: '', startTime: '', endTime: '' },
  });

  function openDialog(l: Lecture) {
    setLecture(l);
    const currentRoom = rooms.find((r) => r.name === l.room);
    const times = l.time.split(' - ');
    form.reset({
      roomId: currentRoom?.id || '',
      date: l.dateISO,
      startTime: times[0] || '',
      endTime: times[1] || '',
    });
    setEditDialogOpen(true);
  }

  function onInitialSaveEdit(values: EditScheduleValues) {
    const selectedRoom = rooms.find((r) => r.id === values.roomId);
    if (selectedRoom && lecture) {
      if (selectedRoom.capacity < lecture.registered) {
        setPendingEditRoom(selectedRoom);
        setCapacityWarningOpen(true);
        return;
      }
    }
    executeSaveEdit(values);
  }

  function executeSaveEdit(values: EditScheduleValues = form.getValues()) {
    if (!lecture) return;
    updateSchedule.mutate(
      {
        roomId: values.roomId,
        startTime: new Date(
          `${values.date}T${values.startTime}:00Z`,
        ).toISOString(),
        endTime: new Date(`${values.date}T${values.endTime}:00Z`).toISOString(),
      },
      {
        onSuccess: () => {
          setCapacityWarningOpen(false);
          setEditDialogOpen(false);
        },
      },
    );
  }

  return {
    editDialogOpen,
    setEditDialogOpen,
    lecture,
    cancelConfirmOpen,
    setCancelConfirmOpen,
    capacityWarningOpen,
    setCapacityWarningOpen,
    pendingEditRoom,
    form,
    rooms,
    updateSchedule,
    deleteSchedule,
    openDialog,
    onInitialSaveEdit,
    executeSaveEdit,
  };
}
