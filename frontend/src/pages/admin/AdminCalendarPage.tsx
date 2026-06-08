import { useUser } from '@clerk/clerk-react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Clock,
  MapPin,
  Users,
  Plus,
  CalendarDays,
  X,
  UserCheck,
  Pencil,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

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
import { Card, CardContent } from '@/components/ui/card';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  useAddLectureMember,
  useLectureMembers,
  useDeleteSchedule,
  useRemoveLectureMember,
  useRooms,
  useSchedule,
  useUpdateAttendance,
  useUpdateSchedule,
} from '@/hooks/useCalendar';
import { cn } from '@/lib/utils';

import AddScheduleDialog from './AddScheduleDialog';

import type { RoomOption, ScheduleItem } from '@/hooks/useCalendar';

const editScheduleSchema = z
  .object({
    roomId: z.string().min(1, 'Room is required'),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time'),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time'),
  })
  .refine((d) => d.endTime > d.startTime, {
    path: ['endTime'],
    message: 'End time must be after start time',
  });

type EditScheduleValues = z.infer<typeof editScheduleSchema>;

type Filter = 'all' | 'today' | 'this-week' | 'upcoming' | 'history';

interface Lecture {
  id: string;
  name: string;
  date: string;
  time: string;
  room: string;
  capacity: number;
  registered: number;
  dayOffset: number; // 0 = today, positive = future, negative = past
}

// --- HELPER FUNCTIONS ---

function toUTCDateOnly(date: Date): Date {
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
}

const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function scheduleItemToLecture(item: ScheduleItem, baseDate: Date): Lecture {
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

  return {
    id: item.id,
    name: item.lectureName,
    date,
    time: `${fmtTime(start)} - ${fmtTime(end)}`,
    room: item.roomName,
    capacity: item.roomCapacity,
    registered: item.registered,
    dayOffset,
  };
}

function getStatus(
  registered: number,
  capacity: number,
): 'available' | 'almost-full' | 'unavailable' {
  const ratio = registered / capacity;
  if (ratio >= 1) return 'unavailable';
  if (ratio >= 0.7) return 'almost-full';
  return 'available';
}

function filterLectures(lectures: Lecture[], filter: Filter): Lecture[] {
  if (filter === 'all' || filter === 'history') return lectures;
  if (filter === 'today') return lectures.filter((l) => l.dayOffset === 0);
  if (filter === 'this-week')
    return lectures.filter((l) => l.dayOffset >= 0 && l.dayOffset <= 6);
  if (filter === 'upcoming') return lectures.filter((l) => l.dayOffset > 0);
  return lectures;
}

function getDaysAgoStr(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

// --- LECTURE CARD COMPONENT ---

function LectureCard({
  lecture,
  onViewMembers,
  onEditLecture,
  onMarkAttendance,
}: {
  lecture: Lecture;
  onViewMembers: (lecture: Lecture) => void;
  onEditLecture: (lecture: Lecture) => void;
  onMarkAttendance: (lecture: Lecture) => void;
}) {
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

const STATUS_DOT_CLASSES: Record<string, string> = {
  available: 'bg-success',
  'almost-full': 'bg-warning',
  unavailable: 'bg-destructive',
};

// --- CONSTANTS ---

const FILTERS: { label: string; value: Filter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: 'This week', value: 'this-week' },
  { label: 'Upcoming', value: 'upcoming' },
  { label: 'History', value: 'history' },
];

function rangeForFilter(
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

export default function AdminCalendarPage() {
  const [filter, setFilter] = useState<Filter>('upcoming');
  const [dialogOpen, setDialogOpen] = useState(false);

  // --- HISTORY DATE PICKER STATE ---
  const [historyFrom, setHistoryFrom] = useState(getDaysAgoStr(3));
  const [historyTo, setHistoryTo] = useState(getDaysAgoStr(1));

  const [range, setRange] = useState(() =>
    rangeForFilter('upcoming', getDaysAgoStr(3), getDaysAgoStr(1)),
  );

  // Staff see only the lectures they teach; admins see every lecture.
  const { user, isLoaded } = useUser();
  const role = (user?.publicMetadata as { role?: string })?.role ?? null;
  const isStaff = role === 'employee';

  const { data: scheduleItems = [], isLoading: loadingSchedule } = useSchedule(
    range.from,
    range.to,
    { myLectures: isStaff, enabled: isLoaded },
  );
  const { data: rooms = [] } = useRooms();

  const lectures = useMemo(() => {
    const baseDate = toUTCDateOnly(new Date());
    return [...scheduleItems]
      .sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      )
      .map((item) => scheduleItemToLecture(item, baseDate));
  }, [scheduleItems]);

  // --- MEMBERS DIALOG STATE ---
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [selectedLecture, setSelectedLecture] = useState<Lecture | null>(null);

  const selectedLectureId = selectedLecture?.id ?? null;
  const {
    data: members = [],
    isLoading: loadingMembers,
    isError: membersError,
  } = useLectureMembers(selectedLectureId);

  const addMember = useAddLectureMember(selectedLectureId ?? '');
  const removeMember = useRemoveLectureMember(selectedLectureId ?? '');
  const updateSchedule = useUpdateSchedule(selectedLectureId ?? '');
  const updateAttendance = useUpdateAttendance(selectedLectureId ?? '');
  const deleteSchedule = useDeleteSchedule(selectedLectureId ?? '');

  const [searchEmail, setSearchEmail] = useState('');

  // --- EDIT LECTURE STATE ---
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const editScheduleForm = useForm<EditScheduleValues>({
    resolver: zodResolver(editScheduleSchema),
    defaultValues: { roomId: '', startTime: '', endTime: '' },
  });

  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [capacityWarningOpen, setCapacityWarningOpen] = useState(false);
  const [pendingEditRoom, setPendingEditRoom] = useState<RoomOption | null>(
    null,
  );

  // --- ATTENDANCE STATE ---
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);
  const [attendanceOverrides, setAttendanceOverrides] = useState<
    Record<string, boolean>
  >({});

  // Derive attendance from members + user overrides (no effect+setState cascade).
  const attendanceStatus = useMemo(() => {
    const result: Record<string, boolean> = {};
    members.forEach((m) => {
      result[m.id] = attendanceOverrides[m.id] ?? m.attended ?? false;
    });
    return result;
  }, [members, attendanceOverrides]);

  function handleAttendanceDialogChange(open: boolean) {
    setAttendanceDialogOpen(open);
    if (!open) setAttendanceOverrides({});
  }

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

  // ==========================================
  // HANDLERS: MEMBERS
  // ==========================================

  function handleViewMembers(lecture: Lecture) {
    setSelectedLecture(lecture);
    setSearchEmail('');
    setMembersDialogOpen(true);
  }

  function handleAddMember() {
    if (!searchEmail.includes('@') || !selectedLecture) {
      toast.error('Invalid email address');
      return;
    }
    addMember.mutate(searchEmail, {
      onSuccess: () => {
        setSearchEmail('');
      },
    });
  }

  function handleRemoveMember(memberId: string) {
    if (!selectedLecture) return;
    removeMember.mutate(memberId);
  }

  // ==========================================
  // HANDLERS: EDIT LECTURE
  // ==========================================

  function handleEditLecture(lecture: Lecture) {
    setSelectedLecture(lecture);
    const currentRoom = rooms.find((r) => r.name === lecture.room);
    const times = lecture.time.split(' - ');
    editScheduleForm.reset({
      roomId: currentRoom?.id || '',
      startTime: times[0] || '',
      endTime: times[1] || '',
    });
    setEditDialogOpen(true);
  }

  function onInitialSaveEdit(values: EditScheduleValues) {
    const selectedRoom = rooms.find((r) => r.id === values.roomId);
    if (selectedRoom && selectedLecture) {
      if (selectedRoom.capacity < selectedLecture.registered) {
        setPendingEditRoom(selectedRoom);
        setCapacityWarningOpen(true);
        return;
      }
    }
    executeSaveEdit(values);
  }

  function executeSaveEdit(
    values: EditScheduleValues = editScheduleForm.getValues(),
  ) {
    if (!selectedLecture) return;
    updateSchedule.mutate(
      {
        roomId: values.roomId,
        startTime: values.startTime,
        endTime: values.endTime,
      },
      {
        onSuccess: () => {
          setCapacityWarningOpen(false);
          setEditDialogOpen(false);
        },
      },
    );
  }

  // ==========================================
  // HANDLERS: ATTENDANCE
  // ==========================================

  function handleMarkAttendance(lecture: Lecture) {
    setSelectedLecture(lecture);
    setAttendanceDialogOpen(true);
  }

  function toggleAttendance(memberId: string, isPresent: boolean) {
    setAttendanceOverrides((prev) => ({ ...prev, [memberId]: isPresent }));
  }

  function handleSaveAttendance() {
    if (!selectedLecture) return;
    const attendanceRecords = Object.entries(attendanceStatus).map(
      ([personId, attended]) => ({ personId, attended }),
    );
    updateAttendance.mutate(
      { attendanceRecords },
      {
        onSuccess: () => {
          handleAttendanceDialogChange(false);
        },
      },
    );
  }

  const filtered = filterLectures(lectures, filter);
  const maxHistoryDateStr = getDaysAgoStr(1); // Cannot select future dates in history

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

        {/* Filters */}
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

        {/* History Date Range Picker */}
        {filter === 'history' && (
          <div className="border-border bg-card/50 mt-4 mb-2 flex flex-col items-end gap-4 rounded-lg border p-4 sm:flex-row">
            <div className="flex w-full flex-col gap-1 sm:w-auto">
              <label className="text-muted-foreground text-xs">From Date</label>
              <Input
                type="date"
                value={historyFrom}
                max={maxHistoryDateStr}
                onChange={(e) => setHistoryFrom(e.target.value)}
                className="border-border bg-background text-sm"
              />
            </div>
            <div className="flex w-full flex-col gap-1 sm:w-auto">
              <label className="text-muted-foreground text-xs">To Date</label>
              <Input
                type="date"
                value={historyTo}
                max={maxHistoryDateStr}
                onChange={(e) => setHistoryTo(e.target.value)}
                className="border-border bg-background text-sm"
              />
            </div>
            <Button
              onClick={() => setRange({ from: historyFrom, to: historyTo })}
              className="bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto"
            >
              Load Range
            </Button>
            <Button
              onClick={() =>
                setRange({ from: '2000-01-01', to: maxHistoryDateStr })
              }
              variant="outline"
              className="border-border bg-card text-foreground hover:bg-secondary w-full sm:w-auto"
            >
              Load All History
            </Button>
          </div>
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
                onViewMembers={handleViewMembers}
                onEditLecture={handleEditLecture}
                onMarkAttendance={handleMarkAttendance}
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

      {/* ==========================================
          DIALOG: MEMBERS (Add / Remove)
      ========================================== */}
      <Dialog open={membersDialogOpen} onOpenChange={setMembersDialogOpen}>
        <DialogContent className="bg-card border-border text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground flex flex-col gap-1 text-lg font-bold">
              <span>Manage Members</span>
              {selectedLecture && (
                <span className="text-muted-foreground text-sm font-normal">
                  {selectedLecture.name} • {selectedLecture.date}{' '}
                  {selectedLecture.time}
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

      {/* ==========================================
          DIALOG: EDIT LECTURE
      ========================================== */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-card border-border text-foreground max-w-sm overflow-visible">
          <DialogHeader>
            <DialogTitle className="text-foreground text-lg font-bold">
              Edit Schedule Record
            </DialogTitle>
          </DialogHeader>

          <Form {...editScheduleForm}>
            <form
              onSubmit={editScheduleForm.handleSubmit(onInitialSaveEdit)}
              className="mt-4 flex flex-col gap-4"
            >
              <div className="flex flex-col gap-1">
                <label className="text-foreground text-sm">Lecture Name</label>
                <Input
                  value={selectedLecture?.name ?? ''}
                  disabled
                  className="bg-card text-muted-foreground cursor-not-allowed opacity-50"
                />
                <p className="text-muted-foreground text-xs">
                  Name is bound to the template and cannot be changed here.
                </p>
              </div>

              <FormField
                control={editScheduleForm.control}
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

              <div className="flex gap-4">
                <FormField
                  control={editScheduleForm.control}
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
                  control={editScheduleForm.control}
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

      {/* ==========================================
          DIALOG: CANCEL LECTURE CONFIRMATION
      ========================================== */}
      <AlertDialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
        <AlertDialogContent className="border-border bg-background z-[70] border shadow-2xl sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2 text-xl font-semibold">
              <Trash2 size={22} />
              Cancel this lecture?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground mt-3 text-sm leading-relaxed">
              This will remove{' '}
              <strong className="text-foreground">
                {selectedLecture?.name}
              </strong>{' '}
              from the calendar. All{' '}
              <strong className="text-foreground">
                {selectedLecture?.registered}
              </strong>{' '}
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

      {/* ==========================================
          DIALOG: ROOM CAPACITY WARNING
      ========================================== */}
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
                {selectedLecture?.registered}
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
      {/* ==========================================
          DIALOG: MARK ATTENDANCE
      ========================================== */}
      <Dialog
        open={attendanceDialogOpen}
        onOpenChange={handleAttendanceDialogChange}
      >
        <DialogContent className="bg-card border-border text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground text-lg font-bold">
              Mark Attendance
            </DialogTitle>
            <p className="text-muted-foreground text-sm">
              {selectedLecture?.name} • {selectedLecture?.date}{' '}
              {selectedLecture?.time}
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
            <Button
              variant="ghost"
              onClick={() => handleAttendanceDialogChange(false)}
            >
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
    </div>
  );
}
