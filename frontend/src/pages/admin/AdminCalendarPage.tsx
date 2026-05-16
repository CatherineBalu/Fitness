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
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

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
  useRemoveLectureMember,
  useRooms,
  useSchedule,
  useUpdateAttendance,
  useUpdateSchedule,
} from '@/hooks/useCalendar';

import AddScheduleDialog from './AddScheduleDialog';
import './AdminCalendarPage.css';

import type { RoomOption, ScheduleItem } from '@/hooks/useCalendar';

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
      className={`lecture-card relative ${isPast ? 'opacity-70 grayscale-[0.3]' : ''}`}
    >
      <CardContent className="lecture-card-content">
        <div className="lecture-card-top mb-1 flex min-h-[16px] items-start justify-between">
          {!isPast && <span className={`status-dot status-dot--${status}`} />}
          {isPast && (
            <span className="ml-auto text-[10px] font-bold tracking-wider text-slate-500 uppercase">
              Past
            </span>
          )}
        </div>

        <div className="mb-2 flex items-center gap-2">
          <h3 className="lecture-name m-0 pr-0">{lecture.name}</h3>
          {!isPast && (
            <button
              onClick={() => onEditLecture(lecture)}
              className="text-slate-400 transition-colors hover:text-white"
              title="Edit Lecture"
            >
              <Pencil size={14} />
            </button>
          )}
        </div>

        <div className="lecture-meta">
          <div className="lecture-meta-row">
            <CalendarDays size={13} />
            <span>{lecture.date}</span>
          </div>
          <div className="lecture-meta-row">
            <Clock size={13} />
            <span>{lecture.time}</span>
          </div>
          <div className="lecture-meta-row">
            <MapPin size={13} />
            <span>{lecture.room}</span>
          </div>
          <div className="lecture-meta-row">
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
              className="lecture-view-btn flex-1 text-xs"
              onClick={() => onViewMembers(lecture)}
            >
              Members
            </Button>
          )}
          <Button
            size="sm"
            className={`lecture-attendance-btn text-xs ${isPast ? 'w-full' : 'flex-1'}`}
            onClick={() => onMarkAttendance(lecture)}
          >
            <UserCheck size={14} className="mr-1" /> Attendance
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

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

  const { data: scheduleItems = [], isLoading: loadingSchedule } = useSchedule(
    range.from,
    range.to,
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

  const [searchEmail, setSearchEmail] = useState('');

  // --- EDIT LECTURE STATE ---
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editLectureData, setEditLectureData] = useState<{
    name: string;
    roomId: string;
    startTime: string;
    endTime: string;
  }>({
    name: '',
    roomId: '',
    startTime: '',
    endTime: '',
  });
  const [editTimeError, setEditTimeError] = useState('');

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
    setEditTimeError('');

    const currentRoom = rooms.find((r) => r.name === lecture.room);
    const times = lecture.time.split(' - ');

    setEditLectureData({
      name: lecture.name,
      roomId: currentRoom?.id || '',
      startTime: times[0] || '',
      endTime: times[1] || '',
    });
    setEditDialogOpen(true);
  }

  function onInitialSaveEdit() {
    setEditTimeError('');

    if (editLectureData.endTime <= editLectureData.startTime) {
      setEditTimeError('End time must be after start time.');
      return;
    }

    const selectedRoom = rooms.find((r) => r.id === editLectureData.roomId);
    if (selectedRoom && selectedLecture) {
      if (selectedRoom.capacity < selectedLecture.registered) {
        setPendingEditRoom(selectedRoom);
        setCapacityWarningOpen(true);
        return;
      }
    }

    executeSaveEdit();
  }

  function executeSaveEdit() {
    if (!selectedLecture) return;
    updateSchedule.mutate(
      {
        roomId: editLectureData.roomId,
        startTime: editLectureData.startTime,
        endTime: editLectureData.endTime,
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
    <div className="admin-cal-page">
      <div className="admin-cal-inner">
        <div className="admin-cal-header">
          <h1 className="admin-cal-title">My lectures</h1>
          <Button
            className="admin-cal-add-btn"
            onClick={() => setDialogOpen(true)}
          >
            <Plus size={15} />
            Add
          </Button>
        </div>

        {/* Filters */}
        <div className="admin-cal-filters">
          {FILTERS.map((f) => (
            <Button
              key={f.value}
              size="sm"
              variant={filter === f.value ? 'default' : 'ghost'}
              className={
                filter === f.value
                  ? 'filter-btn filter-btn--active'
                  : 'filter-btn'
              }
              onClick={() => handleFilterChange(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>

        {/* History Date Range Picker */}
        {filter === 'history' && (
          <div className="mt-4 mb-2 flex flex-col items-end gap-4 rounded-lg border border-slate-800 bg-slate-900/50 p-4 sm:flex-row">
            <div className="flex w-full flex-col gap-1 sm:w-auto">
              <label className="text-xs text-slate-400">From Date</label>
              <Input
                type="date"
                value={historyFrom}
                max={maxHistoryDateStr}
                onChange={(e) => setHistoryFrom(e.target.value)}
                className="border-slate-700 bg-slate-950 text-sm"
              />
            </div>
            <div className="flex w-full flex-col gap-1 sm:w-auto">
              <label className="text-xs text-slate-400">To Date</label>
              <Input
                type="date"
                value={historyTo}
                max={maxHistoryDateStr}
                onChange={(e) => setHistoryTo(e.target.value)}
                className="border-slate-700 bg-slate-950 text-sm"
              />
            </div>
            <Button
              onClick={() => setRange({ from: historyFrom, to: historyTo })}
              className="w-full bg-[#aacc00] text-black hover:bg-[#bbdd11] sm:w-auto"
            >
              Load Range
            </Button>
            <Button
              onClick={() =>
                setRange({ from: '2000-01-01', to: maxHistoryDateStr })
              }
              variant="outline"
              className="w-full border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-slate-200 sm:w-auto"
            >
              Load All History
            </Button>
          </div>
        )}

        <div className="admin-cal-legend">
          <span className="legend-item">
            <span className="status-dot status-dot--available" />
            Available
          </span>
          <span className="legend-item">
            <span className="status-dot status-dot--almost-full" />
            Almost full
          </span>
          <span className="legend-item">
            <span className="status-dot status-dot--unavailable" />
            Unavailable
          </span>
        </div>

        {loadingSchedule && (
          <div className="admin-cal-grid">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-56 rounded-xl" />
            ))}
          </div>
        )}

        {!loadingSchedule && (
          <div className="admin-cal-grid">
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
              <p className="col-span-full py-8 text-center text-slate-500">
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
        <DialogContent className="add-schedule-dialog max-w-md">
          <DialogHeader>
            <DialogTitle className="add-schedule-title flex flex-col gap-1">
              <span>Manage Members</span>
              {selectedLecture && (
                <span className="text-sm font-normal text-slate-400">
                  {selectedLecture.name} • {selectedLecture.date}{' '}
                  {selectedLecture.time}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-2 flex flex-col gap-2 border-b border-slate-800 pb-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter member's email..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                className="border-slate-700 bg-slate-900"
              />
              <Button
                onClick={handleAddMember}
                disabled={addMember.isPending}
                className="bg-[#aacc00] text-black hover:bg-[#bbdd11]"
              >
                {addMember.isPending ? 'Adding…' : 'Add'}
              </Button>
            </div>
          </div>

          <div className="mt-2 flex max-h-[300px] flex-col gap-2 overflow-y-auto pr-2">
            {loadingMembers && (
              <p className="animate-pulse py-4 text-center text-sm text-slate-400">
                Loading members...
              </p>
            )}
            {membersError && (
              <p className="py-4 text-center text-sm text-red-400">
                Failed to load registered members.
              </p>
            )}

            {!loadingMembers &&
              !membersError &&
              members.map((member) => (
                <div
                  key={member.id}
                  className="group flex items-center rounded-lg border border-slate-800 bg-slate-900/50 p-3"
                >
                  <button
                    onClick={() => handleRemoveMember(member.id)}
                    className="mr-3 text-slate-500 transition-colors hover:text-red-500"
                    title="Remove member"
                  >
                    <X size={18} />
                  </button>
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-200">
                      {member.name}
                    </span>
                    <span className="text-xs text-slate-400">
                      {member.email}
                    </span>
                  </div>
                </div>
              ))}

            {!loadingMembers && !membersError && members.length === 0 && (
              <p className="py-4 text-center text-sm text-slate-500">
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
        <DialogContent className="add-schedule-dialog max-w-sm overflow-visible">
          <DialogHeader>
            <DialogTitle className="add-schedule-title">
              Edit Schedule Record
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm text-slate-300">Lecture Name</label>
              <Input
                value={editLectureData.name}
                disabled
                className="cursor-not-allowed bg-slate-900 text-slate-400 opacity-50"
              />
              <p className="text-xs text-slate-500">
                Name is bound to the template and cannot be changed here.
              </p>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-slate-300">Room</label>
              <Select
                value={editLectureData.roomId}
                onValueChange={(value) =>
                  setEditLectureData({ ...editLectureData, roomId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a room" />
                </SelectTrigger>
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
            </div>

            <div className="flex gap-4">
              <div className="flex flex-1 flex-col gap-1">
                <label className="text-sm text-slate-300">Start Time</label>
                <Input
                  type="time"
                  value={editLectureData.startTime}
                  onChange={(e) =>
                    setEditLectureData({
                      ...editLectureData,
                      startTime: e.target.value,
                    })
                  }
                />
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <label className="text-sm text-slate-300">End Time</label>
                <Input
                  type="time"
                  value={editLectureData.endTime}
                  onChange={(e) =>
                    setEditLectureData({
                      ...editLectureData,
                      endTime: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            {editTimeError && (
              <p className="text-xs text-red-400">{editTimeError}</p>
            )}
          </div>

          <DialogFooter className="mt-6">
            <Button
              variant="ghost"
              onClick={() => setEditDialogOpen(false)}
              className="text-slate-400"
            >
              Cancel
            </Button>
            <Button
              onClick={onInitialSaveEdit}
              className="bg-[#aacc00] text-black hover:bg-[#bbdd11]"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==========================================
          DIALOG: ROOM CAPACITY WARNING
      ========================================== */}
      <AlertDialog
        open={capacityWarningOpen}
        onOpenChange={setCapacityWarningOpen}
      >
        <AlertDialogContent className="z-[70] border border-slate-800 bg-slate-950 shadow-2xl sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-xl font-semibold text-red-500">
              <AlertTriangle size={22} />
              Capacity Warning
            </AlertDialogTitle>
            <AlertDialogDescription className="mt-3 text-sm leading-relaxed text-slate-400">
              You are trying to change the room to{' '}
              <strong className="text-slate-200">
                {pendingEditRoom?.name}
              </strong>
              , which has a capacity of only{' '}
              <strong className="text-red-500">
                {pendingEditRoom?.capacity}
              </strong>{' '}
              people.
              <br />
              <br />
              There are currently{' '}
              <strong className="text-slate-200">
                {selectedLecture?.registered}
              </strong>{' '}
              members registered. If you proceed, the registered members will
              remain, resulting in an overbooked room. Are you sure you want to
              proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 border-t border-slate-800/50 pt-4">
            <AlertDialogCancel className="hover:text-gray border border-slate-700 bg-black text-white hover:bg-slate-300 sm:mt-0">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={executeSaveEdit}
              className="border-0 bg-red-600 text-white shadow-md hover:bg-red-700"
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
        <DialogContent className="add-schedule-dialog max-w-md">
          <DialogHeader>
            <DialogTitle className="add-schedule-title">
              Mark Attendance
            </DialogTitle>
            <p className="text-sm text-slate-400">
              {selectedLecture?.name} • {selectedLecture?.date}{' '}
              {selectedLecture?.time}
            </p>
          </DialogHeader>

          <div className="mt-4 flex max-h-[350px] flex-col gap-3 overflow-y-auto pr-2">
            {loadingMembers ? (
              <p className="animate-pulse py-4 text-center text-sm text-slate-400">
                Loading members...
              </p>
            ) : members.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-500">
                No members registered for this class.
              </p>
            ) : (
              members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/50 p-3"
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-200">
                      {member.name}
                    </span>
                    <span className="text-xs text-slate-400">
                      {member.email}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs ${attendanceStatus[member.id] ? 'text-[#aacc00]' : 'text-slate-500'}`}
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
                className="border-0 bg-[#aacc00] text-black hover:bg-[#bbdd11]"
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
