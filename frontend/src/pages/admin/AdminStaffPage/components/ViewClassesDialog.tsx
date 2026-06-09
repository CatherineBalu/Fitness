import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { apiClient } from '@/lib/apiClient';
import { cn } from '@/lib/utils';

import { STATUS_DOT_CLASSES } from '../lectureStatus';
import MembersDialog from './MembersDialog';
import StaffLectureCard from './StaffLectureCard';

import type { Lecture, StaffMember } from '../adminStaff.types';

interface ViewClassesDialogProps {
  staff: StaffMember | null;
  open: boolean;
  onClose: () => void;
}

export default function ViewClassesDialog({
  staff,
  open,
  onClose,
}: ViewClassesDialogProps) {
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [selectedLecture, setSelectedLecture] = useState<Lecture | null>(null);

  const { data: lectures = [] } = useQuery({
    queryKey: ['staff', staff?.id, 'lectures'] as const,
    queryFn: () => apiClient<Lecture[]>(`/api/staff/${staff!.id}/lectures`),
    enabled: open && !!staff,
  });

  function handleViewMembers(lecture: Lecture) {
    setSelectedLecture(lecture);
    setMembersDialogOpen(true);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="border-border bg-card text-foreground flex max-h-[85vh] w-[90vw] max-w-[760px] flex-col overflow-hidden sm:max-w-[760px]">
          <DialogHeader>
            <DialogTitle className="text-foreground text-[1.2rem] font-bold">
              {staff ? `${staff.firstName} ${staff.lastName}` : ''} — Classes
            </DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="text-muted-foreground text-xs-plus mb-5 flex gap-5">
              <span className="flex items-center gap-1.5">
                <span
                  className={cn(
                    'inline-block h-2.5 w-2.5 shrink-0 rounded-full',
                    STATUS_DOT_CLASSES['available'],
                  )}
                />
                Available
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className={cn(
                    'inline-block h-2.5 w-2.5 shrink-0 rounded-full',
                    STATUS_DOT_CLASSES['almost-full'],
                  )}
                />
                Almost full
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className={cn(
                    'inline-block h-2.5 w-2.5 shrink-0 rounded-full',
                    STATUS_DOT_CLASSES['full'],
                  )}
                />
                Full
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {lectures.map((lecture) => (
                <StaffLectureCard
                  key={lecture.id}
                  lecture={lecture}
                  onViewMembers={handleViewMembers}
                />
              ))}
              {lectures.length === 0 && (
                <p className="text-muted-foreground py-4 text-center text-sm">
                  No classes assigned.
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <MembersDialog
        lecture={selectedLecture}
        open={membersDialogOpen}
        onClose={() => setMembersDialogOpen(false)}
      />
    </>
  );
}
