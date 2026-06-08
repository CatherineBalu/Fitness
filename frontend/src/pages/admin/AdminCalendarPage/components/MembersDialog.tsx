import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

import type { useMembersDialog } from '../hooks/useMembersDialog';

type MembersDialogProps = ReturnType<typeof useMembersDialog>;

export default function MembersDialog({
  open,
  setOpen,
  lecture,
  searchEmail,
  setSearchEmail,
  members,
  loadingMembers,
  membersError,
  addMember,
  handleAddMember,
  handleRemoveMember,
}: MembersDialogProps) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="bg-card border-border text-foreground max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground flex flex-col gap-1 text-lg font-bold">
            <span>Manage Members</span>
            {lecture && (
              <span className="text-muted-foreground text-sm font-normal">
                {lecture.name} • {lecture.date} {lecture.time}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="border-border mt-2 flex flex-col gap-2 border-b pb-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter member's email..."
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              className="border-border bg-card"
            />
            <Button
              onClick={handleAddMember}
              disabled={addMember.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {addMember.isPending ? 'Adding…' : 'Add'}
            </Button>
          </div>
        </div>

        <div className="mt-2 flex max-h-[300px] flex-col gap-2 overflow-y-auto pr-2">
          {loadingMembers && (
            <p className="text-muted-foreground animate-pulse py-4 text-center text-sm">
              Loading members...
            </p>
          )}
          {membersError && (
            <p className="text-destructive py-4 text-center text-sm">
              Failed to load registered members.
            </p>
          )}

          {!loadingMembers &&
            !membersError &&
            members.map((member) => (
              <div
                key={member.id}
                className="group border-border bg-card/50 flex items-center rounded-lg border p-3"
              >
                <button
                  onClick={() => handleRemoveMember(member.id)}
                  className="text-muted-foreground hover:text-destructive mr-3 transition-colors"
                  title="Remove member"
                >
                  <X size={18} />
                </button>
                <div className="flex flex-col">
                  <span className="text-foreground font-medium">
                    {member.name}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {member.email}
                  </span>
                </div>
              </div>
            ))}

          {!loadingMembers && !membersError && members.length === 0 && (
            <p className="text-muted-foreground py-4 text-center text-sm">
              No members registered yet.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
