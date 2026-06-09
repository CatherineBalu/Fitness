import {
  CalendarDays,
  Clock,
  MapPin,
  Pencil,
  UserCheck,
  Users,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import type { Lecture } from '../adminCalendar.types';

const STATUS_DOT_CLASSES: Record<string, string> = {
  available: 'bg-success',
  'almost-full': 'bg-warning',
  unavailable: 'bg-destructive',
};

function getStatus(
  registered: number,
  capacity: number,
): 'available' | 'almost-full' | 'unavailable' {
  const ratio = registered / capacity;
  if (ratio >= 1) return 'unavailable';
  if (ratio >= 0.7) return 'almost-full';
  return 'available';
}

interface LectureCardProps {
  lecture: Lecture;
  onViewMembers: (lecture: Lecture) => void;
  onEditLecture: (lecture: Lecture) => void;
  onMarkAttendance: (lecture: Lecture) => void;
}

export default function LectureCard({
  lecture,
  onViewMembers,
  onEditLecture,
  onMarkAttendance,
}: LectureCardProps) {
  const status = getStatus(lecture.registered, lecture.capacity);
  const isPast = lecture.dayOffset < 0;

  return (
    <Card
      className={cn(
        'border-border bg-card hover:border-primary relative border transition-colors',
        isPast && 'opacity-70 grayscale-[0.3]',
      )}
    >
      <CardContent className="flex flex-col gap-2.5 p-4">
        <div className="mb-1 flex min-h-[16px] items-start justify-between">
          {!isPast && (
            <span
              className={cn(
                'inline-block h-2.5 w-2.5 shrink-0 rounded-full',
                STATUS_DOT_CLASSES[status],
              )}
            />
          )}
          {isPast && (
            <span className="text-muted-foreground ml-auto text-[10px] font-bold tracking-wider uppercase">
              Past
            </span>
          )}
        </div>

        <div className="mb-2 flex items-center gap-2">
          <h3 className="text-foreground m-0 pr-0 text-[0.95rem] leading-snug font-semibold">
            {lecture.name}
          </h3>
          {!isPast && (
            <button
              onClick={() => onEditLecture(lecture)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Edit Lecture"
            >
              <Pencil size={14} />
            </button>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <CalendarDays size={13} />
            <span>{lecture.date}</span>
          </div>
          <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <Clock size={13} />
            <span>{lecture.time}</span>
          </div>
          <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <MapPin size={13} />
            <span>{lecture.room}</span>
          </div>
          <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <Users size={13} />
            <span>
              Capacity {lecture.registered}/{lecture.capacity}
            </span>
          </div>
        </div>

        <div className="mt-2 flex w-full gap-2">
          {!isPast && (
            <Button
              size="sm"
              variant="outline"
              className="border-border text-foreground hover:border-primary hover:bg-primary hover:text-primary-foreground flex-1 bg-transparent text-xs"
              onClick={() => onViewMembers(lecture)}
            >
              Members
            </Button>
          )}
          <Button
            size="sm"
            className={cn(
              'bg-primary text-primary-foreground hover:bg-primary/90 text-xs',
              isPast ? 'w-full' : 'flex-1',
            )}
            onClick={() => onMarkAttendance(lecture)}
          >
            <UserCheck size={14} className="mr-1" /> Attendance
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
