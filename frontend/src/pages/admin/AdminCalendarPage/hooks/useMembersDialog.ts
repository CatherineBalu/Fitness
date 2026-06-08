import { useState } from 'react';
import { toast } from 'sonner';

import {
  useAddLectureMember,
  useLectureMembers,
  useRemoveLectureMember,
} from '@/hooks/useCalendar';

import type { Lecture } from '../adminCalendar.types';

export function useMembersDialog() {
  const [open, setOpen] = useState(false);
  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [searchEmail, setSearchEmail] = useState('');

  const lectureId = lecture?.id ?? null;
  const membersQuery = useLectureMembers(lectureId);
  const addMember = useAddLectureMember(lectureId ?? '');
  const removeMember = useRemoveLectureMember(lectureId ?? '');

  function openDialog(l: Lecture) {
    setLecture(l);
    setSearchEmail('');
    setOpen(true);
  }

  function handleAddMember() {
    if (!searchEmail.includes('@') || !lecture) {
      toast.error('Invalid email address');
      return;
    }
    addMember.mutate(searchEmail, {
      onSuccess: () => setSearchEmail(''),
    });
  }

  function handleRemoveMember(memberId: string) {
    removeMember.mutate(memberId);
  }

  return {
    open,
    setOpen,
    lecture,
    searchEmail,
    setSearchEmail,
    members: membersQuery.data ?? [],
    loadingMembers: membersQuery.isLoading,
    membersError: membersQuery.isError,
    addMember,
    openDialog,
    handleAddMember,
    handleRemoveMember,
  };
}
