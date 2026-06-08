import type { Filter, Lecture } from './adminCalendar.types';
import type { ScheduleItem } from '@/hooks/useCalendar';

export function toUTCDateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function scheduleItemToLecture(item: ScheduleItem, baseDate: Date): Lecture {
  const start = new Date(item.startTime);
  const end = new Date(item.endTime);
  const fmtTime = (d: Date) =>
    `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;

  const itemDay = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()),
  );
  const dayOffset = Math.round(
    (itemDay.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  const dd = String(start.getUTCDate()).padStart(2, '0');
  const mm = String(start.getUTCMonth() + 1).padStart(2, '0');
  const dayName = DAY_ABBR[start.getUTCDay()];
  const date = `${dayName} ${dd}.${mm}.`;
  const dateISO = `${start.getUTCFullYear()}-${mm}-${dd}`;

  return {
    id: item.id,
    name: item.lectureName,
    date,
    dateISO,
    time: `${fmtTime(start)} - ${fmtTime(end)}`,
    room: item.roomName,
    capacity: item.roomCapacity,
    registered: item.registered,
    dayOffset,
  };
}

export function filterLectures(lectures: Lecture[], filter: Filter): Lecture[] {
  if (filter === 'all' || filter === 'history') return lectures;
  if (filter === 'today') return lectures.filter((l) => l.dayOffset === 0);
  if (filter === 'this-week')
    return lectures.filter((l) => l.dayOffset >= 0 && l.dayOffset <= 6);
  if (filter === 'upcoming') return lectures.filter((l) => l.dayOffset > 0);
  return lectures;
}

export function getDaysAgoStr(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

export function rangeForFilter(
  filter: Filter,
  historyFrom: string,
  historyTo: string,
): { from: string; to: string } {
  const today = new Date();
  const fmtISO = (d: Date) => d.toISOString().split('T')[0];
  const todayStr = fmtISO(today);

  if (filter === 'all') return { from: '2000-01-01', to: '2100-01-01' };
  if (filter === 'today') return { from: todayStr, to: todayStr };
  if (filter === 'this-week') {
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    return { from: todayStr, to: fmtISO(nextWeek) };
  }
  if (filter === 'upcoming') {
    const nextMonth = new Date(today);
    nextMonth.setDate(nextMonth.getDate() + 30);
    return { from: todayStr, to: fmtISO(nextMonth) };
  }
  return { from: historyFrom, to: historyTo };
}
