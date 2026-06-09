import { AlertTriangle, Trash2 } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type { useEditSchedule } from '../hooks/useEditSchedule';

type EditScheduleDialogProps = ReturnType<typeof useEditSchedule>;

export default function EditScheduleDialog({
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
  deleteSchedule,
  onInitialSaveEdit,
  executeSaveEdit,
}: EditScheduleDialogProps) {
  return (
    <>
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-card border-border text-foreground max-w-sm overflow-visible">
          <DialogHeader>
            <DialogTitle className="text-foreground text-lg font-bold">
              Edit Schedule Record
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onInitialSaveEdit)}
              className="mt-4 flex flex-col gap-4"
            >
              <div className="flex flex-col gap-1">
                <label className="text-foreground text-sm">Lecture Name</label>
                <Input
                  value={lecture?.name ?? ''}
                  disabled
                  className="bg-card text-muted-foreground cursor-not-allowed opacity-50"
                />
                <p className="text-muted-foreground text-xs">
                  Name is bound to the template and cannot be changed here.
                </p>
              </div>

              <FormField
                control={form.control}
                name="roomId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground text-sm">
                      Room
                    </FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a room" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent
                        position="popper"
                        className="z-[100] max-h-[200px] overflow-y-auto"
                      >
                        {rooms.map((room) => (
                          <SelectItem key={room.id} value={room.id}>
                            {room.name} (Capacity: {room.capacity})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground text-sm">
                      Date
                    </FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-4">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel className="text-foreground text-sm">
                        Start Time
                      </FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel className="text-foreground text-sm">
                        End Time
                      </FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="mt-6">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setCancelConfirmOpen(true)}
                  className="mr-auto gap-2"
                >
                  <Trash2 size={16} />
                  Cancel Lecture
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditDialogOpen(false)}
                  className="text-muted-foreground"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
        <AlertDialogContent className="border-border bg-background z-[70] border shadow-2xl sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2 text-xl font-semibold">
              <Trash2 size={22} />
              Cancel this lecture?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground mt-3 text-sm leading-relaxed">
              This will remove{' '}
              <strong className="text-foreground">{lecture?.name}</strong> from
              the calendar. All{' '}
              <strong className="text-foreground">{lecture?.registered}</strong>{' '}
              registered members will have their reservation cancelled and will
              be notified by email. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="border-border/50 mt-4 border-t pt-4">
            <AlertDialogCancel className="border-border bg-secondary text-foreground hover:bg-muted border sm:mt-0">
              Keep Lecture
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteSchedule.isPending}
              onClick={(e) => {
                e.preventDefault();
                deleteSchedule.mutate(undefined, {
                  onSuccess: () => {
                    setCancelConfirmOpen(false);
                    setEditDialogOpen(false);
                  },
                });
              }}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground border-0 shadow-md"
            >
              {deleteSchedule.isPending
                ? 'Cancelling...'
                : 'Yes, Cancel Lecture'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={capacityWarningOpen}
        onOpenChange={setCapacityWarningOpen}
      >
        <AlertDialogContent className="border-border bg-background z-[70] border shadow-2xl sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2 text-xl font-semibold">
              <AlertTriangle size={22} />
              Capacity Warning
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground mt-3 text-sm leading-relaxed">
              You are trying to change the room to{' '}
              <strong className="text-foreground">
                {pendingEditRoom?.name}
              </strong>
              , which has a capacity of only{' '}
              <strong className="text-destructive">
                {pendingEditRoom?.capacity}
              </strong>{' '}
              people.
              <br />
              <br />
              There are currently{' '}
              <strong className="text-foreground">
                {lecture?.registered}
              </strong>{' '}
              members registered. If you proceed, the registered members will
              remain, resulting in an overbooked room. Are you sure you want to
              proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="border-border/50 mt-4 border-t pt-4">
            <AlertDialogCancel className="border-border bg-secondary text-foreground hover:bg-muted border sm:mt-0">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => executeSaveEdit()}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground border-0 shadow-md"
            >
              Yes, Overbook Room
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
