import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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

const API_URL = import.meta.env.VITE_API_URL as string;

const formSchema = z
  .object({
    lectureId: z.string().min(1, 'Select a lecture'),
    roomId: z.string().min(1, 'Select a room'),
    date: z.string().min(1, 'Select a date'),
    startTime: z.string().min(1, 'Set a start time'),
    endTime: z.string().min(1, 'Set an end time'),
    leadId: z.string().optional(),
  })
  .refine((d) => d.endTime > d.startTime, {
    message: 'End time must be after start time',
    path: ['endTime'],
  })
  .refine(
    (d) => {
      if (!d.date || !d.startTime) return true;
      return new Date(`${d.date}T${d.startTime}:00Z`) > new Date();
    },
    {
      message: 'Cannot schedule a lecture in the past',
      path: ['startTime'],
    },
  );

type FormValues = z.infer<typeof formSchema>;

interface LectureOption {
  id: string;
  lectureName: string;
  exerciseType: string;
}

interface RoomOption {
  id: string;
  name: string;
  capacity: number;
}

interface InstructorOption {
  id: string;
  name: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export default function AddScheduleDialog({
  open,
  onOpenChange,
  onCreated,
}: Props) {
  const [lectures, setLectures] = useState<LectureOption[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [instructors, setInstructors] = useState<InstructorOption[]>([]);
  const [submitError, setSubmitError] = useState('');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      lectureId: '',
      roomId: '',
      date: '',
      startTime: '',
      endTime: '',
      leadId: '',
    },
  });

  useEffect(() => {
    if (!open) return;
    Promise.all([
      fetch(`${API_URL}/calendar/lectures`).then((r) => r.json()),
      fetch(`${API_URL}/calendar/rooms`).then((r) => r.json()),
      fetch(`${API_URL}/calendar/instructors`).then((r) => r.json()),
    ]).then(([l, r, i]) => {
      setLectures(l);
      setRooms(r);
      setInstructors(i);
    });
  }, [open]);

  async function onSubmit(values: FormValues) {
    setSubmitError('');

    const startISO = new Date(
      `${values.date}T${values.startTime}:00Z`,
    ).toISOString();
    const endISO = new Date(
      `${values.date}T${values.endTime}:00Z`,
    ).toISOString();

    const res = await fetch(`${API_URL}/calendar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lectureId: values.lectureId,
        roomId: values.roomId,
        startTime: startISO,
        endTime: endISO,
        instructors: values.leadId
          ? [{ employeeId: values.leadId, isLead: true }]
          : [],
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setSubmitError(data.error ?? 'Failed to create schedule.');
      return;
    }

    form.reset();
    onOpenChange(false);
    onCreated();
  }

  function handleClose(v: boolean) {
    if (!v) {
      form.reset();
      setSubmitError('');
    }
    onOpenChange(v);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="border-border bg-card text-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground text-lg font-bold">
            Add lecture
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="lectureId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lecture</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select lecture" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {lectures.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.lectureName} ({l.exerciseType})
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
              name="roomId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Room</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select room" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {rooms.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name} (capacity {r.capacity})
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
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Start time</FormLabel>
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
                    <FormLabel>End time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="leadId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lead instructor (optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select instructor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {instructors.map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {submitError && (
              <p className="text-destructive text-xs">{submitError}</p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                className="border-border text-muted-foreground hover:bg-muted hover:text-foreground border"
                onClick={() => handleClose(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold disabled:cursor-not-allowed disabled:opacity-50"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
