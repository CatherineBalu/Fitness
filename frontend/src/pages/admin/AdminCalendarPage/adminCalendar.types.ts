import { z } from 'zod';

export const editScheduleSchema = z
  .object({
    roomId: z.string().min(1, 'Room is required'),
    date: z.string().min(1, 'Select a date'),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time'),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time'),
  })
  .refine((d) => d.endTime > d.startTime, {
    path: ['endTime'],
    message: 'End time must be after start time',
  });

export type EditScheduleValues = z.infer<typeof editScheduleSchema>;

export type Filter = 'all' | 'today' | 'this-week' | 'upcoming' | 'history';

export interface Lecture {
  id: string;
  name: string;
  date: string;
  dateISO: string;
  time: string;
  room: string;
  capacity: number;
  registered: number;
  dayOffset: number;
}
