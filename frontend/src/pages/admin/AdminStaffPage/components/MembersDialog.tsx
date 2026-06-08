import { useQuery } from '@tanstack/react-query';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { apiClient } from '@/lib/apiClient';

import type { Lecture, Member } from '../adminStaff.types';

interface MembersDialogProps {
  lecture: Lecture | null;
  open: boolean;
  onClose: () => void;
}

export default function MembersDialog({
  lecture,
  open,
  onClose,
}: MembersDialogProps) {
  const { data: members = [] } = useQuery({
    queryKey: ['lecture', lecture?.id, 'members'] as const,
    queryFn: () => apiClient<Member[]>(`/api/lectures/${lecture!.id}/members`),
    enabled: open && !!lecture,
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="border-border bg-card text-foreground max-w-[420px] sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-foreground text-[1.1rem] font-bold">
            {lecture?.name} — Members
          </DialogTitle>
        </DialogHeader>
        <div className="mt-1 flex flex-col gap-2.5">
          {members.map((m) => (
            <div
              key={m.id}
              className="border-border bg-background flex items-center gap-3 rounded-md border px-3.5 py-2.5"
            >
              <div className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-sm font-bold text-white">
                {m.name[0]}
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-foreground text-sm font-semibold">
                  {m.name}
                </span>
                <span className="text-muted-foreground text-xs">{m.email}</span>
              </div>
            </div>
          ))}
          {members.length === 0 && (
            <p className="text-muted-foreground py-4 text-center text-sm">
              No members registered.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
