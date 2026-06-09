import { Clock, MapPin, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import {
  STATUS_DOT_CLASSES,
  formatLectureTime,
  getLectureStatus,
} from '../lectureStatus';

import type { Lecture } from '../adminStaff.types';

interface StaffLectureCardProps {
  lecture: Lecture;
  onViewMembers: (lecture: Lecture) => void;
}

export default function StaffLectureCard({
  lecture,
  onViewMembers,
}: StaffLectureCardProps) {
  const status = getLectureStatus(lecture.registered, lecture.capacity);
  return (
    <Card className="border-border bg-background hover:border-primary transition-colors">
      <CardContent className="flex flex-col gap-2 p-3.5">
        <div className="flex justify-end">
          <span
            className={cn(
              'inline-block h-2.5 w-2.5 shrink-0 rounded-full',
              STATUS_DOT_CLASSES[status],
            )}
          />
        </div>
        <h4 className="text-foreground m-0 text-[0.9rem] leading-snug font-semibold">
          {lecture.name}
        </h4>
        <div className="flex flex-col gap-1.5">
          <div className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
            <Clock size={12} />
            <span>{formatLectureTime(lecture.startTime, lecture.endTime)}</span>
          </div>
          <div className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
            <MapPin size={12} />
            <span>{lecture.room}</span>
          </div>
          <div className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
            <Users size={12} />
            <span>
              {lecture.registered}/{lecture.capacity}
            </span>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="border-border text-foreground hover:border-primary hover:bg-primary hover:text-primary-foreground mt-0.5 w-full bg-transparent text-[11px]"
          onClick={() => onViewMembers(lecture)}
        >
          View members
        </Button>
      </CardContent>
    </Card>
  );
}
