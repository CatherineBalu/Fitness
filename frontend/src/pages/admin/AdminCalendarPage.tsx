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
import { useState, useEffect, useCallback } from 'react';

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
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

import AddScheduleDialog from './AddScheduleDialog';

const API_URL = import.meta.env.VITE_API_URL as string;

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

interface ScheduleItem {
  id: string;
  startTime: string;
  endTime: string;
  lectureName: string;
  roomName: string;
  roomCapacity: number;
  registered: number;
}

interface Member {
  id: string;
  name: string;
  email: string;
  attended?: boolean;
}

interface RoomOption {
  id: string;
  name: string;
  capacity: number;
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

export default function AdminCalendarPage() {
  const [filter, setFilter] = useState<Filter>('upcoming');
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);

  // --- HISTORY DATE PICKER STATE ---
  const [historyFrom, setHistoryFrom] = useState(getDaysAgoStr(3));
  const [historyTo, setHistoryTo] = useState(getDaysAgoStr(1));

  // --- MEMBERS DIALOG STATE ---
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [selectedLecture, setSelectedLecture] = useState<Lecture | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [membersError, setMembersError] = useState('');

  const [searchEmail, setSearchEmail] = useState('');
  const [searchStatus, setSearchStatus] = useState<'success' | 'error' | null>(
    null,
  );
  const [searchErrorMsg, setSearchErrorMsg] = useState('');

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
  const [attendanceStatus, setAttendanceStatus] = useState<
    Record<string, boolean>
  >({});
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);

  // ==========================================
  // DATA FETCHING ROUTER
  // ==========================================

  const loadSchedule = useCallback(
    async (fromDateStr: string, toDateStr: string) => {
      setLoading(true);
      const baseDate = toUTCDateOnly(new Date());

      try {
        const [scheduleRes, roomsRes] = await Promise.all([
          fetch(`${API_URL}/schedule?from=${fromDateStr}&to=${toDateStr}`),
          fetch(`${API_URL}/calendar/rooms`),
        ]);
        const scheduleData = await scheduleRes.json();
        const roomsData = await roomsRes.json();

        setLectures(
          scheduleData
            .sort(
              (a: ScheduleItem, b: ScheduleItem) =>
                new Date(a.startTime).getTime() -
                new Date(b.startTime).getTime(),
            )
            .map((item: ScheduleItem) => scheduleItemToLecture(item, baseDate)),
        );
        setRooms(roomsData);
      } catch (err) {
        console.error('Failed to fetch schedule:', err);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const handleFilterChange = (newFilter: Filter) => {
    setFilter(newFilter);
    const today = new Date();
    const fmtISO = (d: Date) => d.toISOString().split('T')[0];
    const todayStr = fmtISO(today);

    if (newFilter === 'all') {
      loadSchedule('2000-01-01', '2100-01-01');
    } else if (newFilter === 'today') {
      loadSchedule(todayStr, todayStr);
    } else if (newFilter === 'this-week') {
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      loadSchedule(todayStr, fmtISO(nextWeek));
    } else if (newFilter === 'upcoming') {
      const nextMonth = new Date(today);
      nextMonth.setDate(nextMonth.getDate() + 30);
      loadSchedule(todayStr, fmtISO(nextMonth));
    } else if (newFilter === 'history') {
      // Automatically load the last 3 days
      const defaultFrom = getDaysAgoStr(3);
      const defaultTo = getDaysAgoStr(1);
      setHistoryFrom(defaultFrom);
      setHistoryTo(defaultTo);
      loadSchedule(defaultFrom, defaultTo);
    }
  };

  useEffect(() => {
    handleFilterChange('upcoming');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchMembersForLecture(lectureId: string) {
    const res = await fetch(`${API_URL}/calendar/${lectureId}/members`);
    if (!res.ok) throw new Error('Failed to fetch members');
    return await res.json();
  }

  // ==========================================
  // HANDLERS: MEMBERS
  // ==========================================

  async function handleViewMembers(lecture: Lecture) {
    setSelectedLecture(lecture);
    setSearchStatus(null);
    setSearchEmail('');
    setMembersDialogOpen(true);
    setLoadingMembers(true);
    setMembersError('');
    setMembers([]);

    try {
      const data = await fetchMembersForLecture(lecture.id);
      setMembers(data);
    } catch (error) {
      console.error(error);
      setMembersError('Failed to load registered members. Please try again.');
    } finally {
      setLoadingMembers(false);
    }
  }

  async function handleAddMember() {
    if (!searchEmail.includes('@') || !selectedLecture) {
      setSearchStatus('error');
      setSearchErrorMsg('Invalid email address');
      return;
    }

    try {
      const res = await fetch(
        `${API_URL}/calendar/${selectedLecture.id}/members`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: searchEmail }),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to add member');
      }

      setMembers((prev) => [data, ...prev]);
      setSearchStatus('success');
      setSearchErrorMsg('Member successfully added');
      setSearchEmail('');

      if (filter !== 'history') {
        handleFilterChange(filter);
      }
    } catch (error) {
      setSearchStatus('error');
      if (error instanceof Error) {
        setSearchErrorMsg(error.message);
      } else {
        setSearchErrorMsg('An unknown error occurred');
      }
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!selectedLecture) return;

    const previousMembers = [...members];
    setMembers((prev) => prev.filter((m) => m.id !== memberId));

    try {
      const res = await fetch(
        `${API_URL}/calendar/${selectedLecture.id}/members/${memberId}`,
        {
          method: 'DELETE',
        },
      );

      if (!res.ok) throw new Error('Failed to remove member');

      if (filter !== 'history') {
        handleFilterChange(filter);
      }
    } catch (error) {
      console.error(error);
      setMembers(previousMembers);
      alert('Failed to remove member. Please try again.');
    }
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

  async function executeSaveEdit() {
    if (!selectedLecture) return;

    try {
      const res = await fetch(`${API_URL}/calendar/${selectedLecture.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: editLectureData.roomId,
          startTime: editLectureData.startTime,
          endTime: editLectureData.endTime,
        }),
      });

      if (!res.ok) throw new Error('Failed to update schedule');

      setCapacityWarningOpen(false);
      setEditDialogOpen(false);

      if (filter === 'history') {
        loadSchedule(historyFrom, historyTo);
      } else {
        handleFilterChange(filter);
      }
    } catch (error) {
      console.error(error);
      alert('Failed to update lecture. Please try again.');
    }
  }

  // ==========================================
  // HANDLERS: ATTENDANCE
  // ==========================================

  async function handleMarkAttendance(lecture: Lecture) {
    setSelectedLecture(lecture);
    setMembers([]);
    setAttendanceStatus({});
    setAttendanceDialogOpen(true);
    setLoadingMembers(true);

    try {
      const data = await fetchMembersForLecture(lecture.id);
      setMembers(data);

      const initialStatus: Record<string, boolean> = {};
      data.forEach((m: Member) => {
        initialStatus[m.id] = m.attended || false;
      });
      setAttendanceStatus(initialStatus);
    } catch (error) {
      console.error(error);
      alert('Failed to load members for attendance.');
    } finally {
      setLoadingMembers(false);
    }
  }

  function toggleAttendance(memberId: string, isPresent: boolean) {
    setAttendanceStatus((prev) => ({ ...prev, [memberId]: isPresent }));
  }

  async function handleSaveAttendance() {
    if (!selectedLecture) return;
    setIsSavingAttendance(true);

    const attendanceRecords = Object.entries(attendanceStatus).map(
      ([personId, attended]) => ({
        personId,
        attended,
      }),
    );

    try {
      const res = await fetch(
        `${API_URL}/calendar/${selectedLecture.id}/attendance`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attendanceRecords }),
        },
      );

      if (!res.ok) throw new Error('Failed to save attendance');

      setAttendanceDialogOpen(false);
      setMembers([]);
      setAttendanceStatus({});
      if (filter === 'history') {
        loadSchedule(historyFrom, historyTo);
      } else {
        handleFilterChange(filter);
      }
    } catch (error) {
      console.error(error);
      alert('Failed to save attendance records. Please try again.');
    } finally {
      setIsSavingAttendance(false);
    }
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
              onClick={() => loadSchedule(historyFrom, historyTo)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto"
            >
              Load Range
            </Button>
            <Button
              onClick={() => loadSchedule('2000-01-01', maxHistoryDateStr)}
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

        {loading && (
          <p className="text-muted-foreground">Loading schedule...</p>
        )}

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
          {!loading && filtered.length === 0 && (
            <p className="text-muted-foreground col-span-full py-8 text-center">
              No lectures found for this filter.
            </p>
          )}
        </div>
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
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Add
              </Button>
            </div>
            {searchStatus === 'success' && (
              <p className="text-success text-sm">{searchErrorMsg}</p>
            )}
            {searchStatus === 'error' && (
              <p className="text-destructive text-sm">{searchErrorMsg}</p>
            )}
          </div>

          <div className="mt-2 flex max-h-[300px] flex-col gap-2 overflow-y-auto pr-2">
            {loadingMembers && (
              <p className="text-muted-foreground animate-pulse py-4 text-center text-sm">
                Loading members...
              </p>
            )}
            {membersError && (
              <p className="text-destructive py-4 text-center text-sm">
                {membersError}
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

          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-foreground text-sm">Lecture Name</label>
              <Input
                value={editLectureData.name}
                disabled
                className="bg-card text-muted-foreground cursor-not-allowed opacity-50"
              />
              <p className="text-muted-foreground text-xs">
                Name is bound to the template and cannot be changed here.
              </p>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-foreground text-sm">Room</label>
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
                <label className="text-foreground text-sm">Start Time</label>
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
                <label className="text-foreground text-sm">End Time</label>
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
              <p className="text-destructive text-xs">{editTimeError}</p>
            )}
          </div>

          <DialogFooter className="mt-6">
            <Button
              variant="ghost"
              onClick={() => setEditDialogOpen(false)}
              className="text-muted-foreground"
            >
              Cancel
            </Button>
            <Button
              onClick={onInitialSaveEdit}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
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
              onClick={executeSaveEdit}
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
        onOpenChange={setAttendanceDialogOpen}
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
              onClick={() => setAttendanceDialogOpen(false)}
            >
              Cancel
            </Button>
            {members.length > 0 && (
              <Button
                onClick={handleSaveAttendance}
                disabled={isSavingAttendance}
                className="bg-primary text-primary-foreground hover:bg-primary/90 border-0"
              >
                {isSavingAttendance ? 'Saving...' : 'Save Attendance'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
