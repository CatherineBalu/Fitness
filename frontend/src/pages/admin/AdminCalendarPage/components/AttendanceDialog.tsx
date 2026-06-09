import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';

import type { useAttendance } from '../hooks/useAttendance';

type AttendanceDialogProps = ReturnType<typeof useAttendance>;

export default function AttendanceDialog({
  open,
  handleClose,
  lecture,
  members,
  loadingMembers,
  attendanceStatus,
  updateAttendance,
  toggleAttendance,
  handleSaveAttendance,
}: AttendanceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border text-foreground max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground text-lg font-bold">
            Mark Attendance
          </DialogTitle>
          <p className="text-muted-foreground text-sm">
            {lecture?.name} • {lecture?.date} {lecture?.time}
          </p>
        </DialogHeader>

        <div className="mt-4 flex max-h-[350px] flex-col gap-3 overflow-y-auto pr-2">
          {loadingMembers ? (
            <p className="text-muted-foreground animate-pulse py-4 text-center text-sm">
              Loading members...
            </p>
          ) : members.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-sm">
              No members registered for this class.
            </p>
          ) : (
            members.map((member) => (
              <div
                key={member.id}
                className="border-border bg-card/50 flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex flex-col">
                  <span className="text-foreground font-medium">
                    {member.name}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {member.email}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs ${attendanceStatus[member.id] ? 'text-primary' : 'text-muted-foreground'}`}
                  >
                    {attendanceStatus[member.id] ? 'Present' : 'Absent'}
                  </span>
                  <Switch
                    checked={attendanceStatus[member.id] || false}
                    onCheckedChange={(checked) =>
                      toggleAttendance(member.id, checked)
                    }
                  />
                </div>
              </div>
            ))
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          {members.length > 0 && (
            <Button
              onClick={handleSaveAttendance}
              disabled={updateAttendance.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90 border-0"
            >
              {updateAttendance.isPending ? 'Saving...' : 'Save Attendance'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
