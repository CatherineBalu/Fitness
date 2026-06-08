import { useUser } from '@clerk/clerk-react';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSchedule } from '@/hooks/useCalendar';

import AddScheduleDialog from '../AddScheduleDialog';
import { filterLectures, getDaysAgoStr, rangeForFilter, scheduleItemToLecture, toUTCDateOnly } from './adminCalendarHelpers';
import AttendanceDialog from './components/AttendanceDialog';
import EditScheduleDialog from './components/EditScheduleDialog';
import HistoryRangePicker from './components/HistoryRangePicker';
import LectureCard from './components/LectureCard';
import MembersDialog from './components/MembersDialog';
import { useAttendance } from './hooks/useAttendance';
import { useEditSchedule } from './hooks/useEditSchedule';
import { useMembersDialog } from './hooks/useMembersDialog';

import type { Filter } from './adminCalendar.types';

const FILTERS: { label: string; value: Filter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: 'This week', value: 'this-week' },
  { label: 'Upcoming', value: 'upcoming' },
  { label: 'History', value: 'history' },
];

export default function AdminCalendarPage() {
  const [filter, setFilter] = useState<Filter>('upcoming');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [historyFrom, setHistoryFrom] = useState(getDaysAgoStr(3));
  const [historyTo, setHistoryTo] = useState(getDaysAgoStr(1));
  const [range, setRange] = useState(() =>
    rangeForFilter('upcoming', getDaysAgoStr(3), getDaysAgoStr(1)),
  );

  const { user, isLoaded } = useUser();
  const role = (user?.publicMetadata as { role?: string })?.role ?? null;
  const isStaff = role === 'employee';

  const { data: scheduleItems = [], isLoading: loadingSchedule } = useSchedule(
    range.from,
    range.to,
    { myLectures: isStaff, enabled: isLoaded },
  );

  const lectures = useMemo(() => {
    const baseDate = toUTCDateOnly(new Date());
    return [...scheduleItems]
      .sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      )
      .map((item) => scheduleItemToLecture(item, baseDate));
  }, [scheduleItems]);

  const membersDialog = useMembersDialog();
  const editSchedule = useEditSchedule();
  const attendance = useAttendance();

  const handleFilterChange = (newFilter: Filter) => {
    setFilter(newFilter);
    if (newFilter === 'history') {
      const defaultFrom = getDaysAgoStr(3);
      const defaultTo = getDaysAgoStr(1);
      setHistoryFrom(defaultFrom);
      setHistoryTo(defaultTo);
      setRange({ from: defaultFrom, to: defaultTo });
    } else {
      setRange(rangeForFilter(newFilter, historyFrom, historyTo));
    }
  };

  const filtered = filterLectures(lectures, filter);
  const maxHistoryDateStr = getDaysAgoStr(1);

  return (
    <div className="bg-background text-foreground min-h-[calc(100svh-var(--nav-height))] pt-[var(--nav-height)]">
      <div className="mx-auto max-w-[1200px] px-8 py-10 md:px-4 md:py-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-foreground text-3xl font-extrabold">
            My lectures
          </h1>
          <Button
            variant="outline"
            className="bg-muted hover:border-primary hover:bg-primary hover:text-primary-foreground gap-1.5"
            onClick={() => setDialogOpen(true)}
          >
            <Plus size={15} />
            Add
          </Button>
        </div>

        <div className="mb-4 flex gap-1">
          {FILTERS.map((f) => (
            <Button
              key={f.value}
              size="sm"
              variant={filter === f.value ? 'secondary' : 'ghost'}
              className={filter === f.value ? '' : 'text-muted-foreground'}
              onClick={() => handleFilterChange(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>

        {filter === 'history' && (
          <HistoryRangePicker
            historyFrom={historyFrom}
            historyTo={historyTo}
            maxDate={maxHistoryDateStr}
            onFromChange={setHistoryFrom}
            onToChange={setHistoryTo}
            onLoadRange={() => setRange({ from: historyFrom, to: historyTo })}
            onLoadAll={() =>
              setRange({ from: '2000-01-01', to: maxHistoryDateStr })
            }
          />
        )}

        <div className="text-muted-foreground mb-8 flex gap-5 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="bg-success inline-block h-2.5 w-2.5 shrink-0 rounded-full" />
            Available
          </span>
          <span className="flex items-center gap-1.5">
            <span className="bg-warning inline-block h-2.5 w-2.5 shrink-0 rounded-full" />
            Almost full
          </span>
          <span className="flex items-center gap-1.5">
            <span className="bg-destructive inline-block h-2.5 w-2.5 shrink-0 rounded-full" />
            Unavailable
          </span>
        </div>

        {loadingSchedule && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-56 rounded-xl" />
            ))}
          </div>
        )}

        {!loadingSchedule && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((lecture) => (
              <LectureCard
                key={lecture.id}
                lecture={lecture}
                onViewMembers={membersDialog.openDialog}
                onEditLecture={editSchedule.openDialog}
                onMarkAttendance={attendance.openDialog}
              />
            ))}
            {filtered.length === 0 && (
              <p className="text-muted-foreground col-span-full py-8 text-center">
                No lectures found for this filter.
              </p>
            )}
          </div>
        )}
      </div>

      <AddScheduleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={() => handleFilterChange(filter)}
      />

      <MembersDialog {...membersDialog} />
      <EditScheduleDialog {...editSchedule} />
      <AttendanceDialog {...attendance} />
    </div>
  );
}
