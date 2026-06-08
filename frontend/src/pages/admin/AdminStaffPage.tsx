import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Clock, MapPin, Users, X, Pencil } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import EmptyState from '@/components/common/EmptyState';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient } from '@/lib/apiClient';
import { cn } from '@/lib/utils';

import AddMemberDialog from './AddMemberDialog';
import EditStaffDialog from './EditStaffDialog';

const staffListKey = ['staff', 'list'] as const;
const exerciseTypesKey = ['exercise-types'] as const;

interface Lecture {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  room: string;
  capacity: number;
  registered: number;
}

function formatLectureTime(startIso: string, endIso: string): string {
  const fmt = (d: Date) =>
    `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
  return `${fmt(new Date(startIso))} - ${fmt(new Date(endIso))}`;
}

interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string | null;
  clerkId: string;
  role: string;
  since: string;
  specializations: string[];
}

interface ExerciseType {
  id: string;
  name: string;
}

const RECEPTION_FILTER = 'Reception';

const STATUS_DOT_CLASSES: Record<string, string> = {
  available: 'bg-success',
  'almost-full': 'bg-warning',
  full: 'bg-destructive',
};

interface Member {
  id: string;
  name: string;
  email: string;
}

function getInitials(first: string, last: string) {
  if (last) return `${first[0]}${last[0]}`.toUpperCase();
  return first.slice(0, 2).toUpperCase();
}

function getLectureStatus(
  registered: number,
  capacity: number,
): 'available' | 'almost-full' | 'full' {
  const ratio = registered / capacity;
  if (ratio >= 1) return 'full';
  if (ratio >= 0.7) return 'almost-full';
  return 'available';
}

function DeleteConfirmDialog({
  name,
  open,
  onConfirm,
  onClose,
}: {
  name: string;
  open: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="border-border bg-card text-foreground max-w-[400px] sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-foreground text-lg font-bold">
            Delete staff member
          </DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground mt-2 mb-5 text-sm leading-relaxed">
          Are you sure you want to delete{' '}
          <strong className="text-foreground">{name}</strong>? This action
          cannot be undone.
        </p>
        <div className="flex justify-end gap-2.5">
          <Button
            variant="outline"
            className="border-border text-foreground"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LectureCard({
  lecture,
  onViewMembers,
}: {
  lecture: Lecture;
  onViewMembers: (lecture: Lecture) => void;
}) {
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

function MembersDialog({
  lecture,
  open,
  onClose,
}: {
  lecture: Lecture | null;
  open: boolean;
  onClose: () => void;
}) {
  const { data: members = [] } = useQuery({
    queryKey: ['lecture', lecture?.id, 'members'] as const,
    queryFn: () => apiClient<Member[]>(`/api/lectures/${lecture!.id}/members`),
    enabled: open && !!lecture,
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="border-border bg-card text-foreground max-w-[420px] sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-foreground text-[1.1rem] font-bold">
            {lecture?.name} — Members
          </DialogTitle>
        </DialogHeader>
        <div className="mt-1 flex flex-col gap-2.5">
          {members.map((m) => (
            <div
              key={m.id}
              className="border-border bg-background flex items-center gap-3 rounded-md border px-3.5 py-2.5"
            >
              <div className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-sm font-bold text-white">
                {m.name[0]}
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-foreground text-sm font-semibold">
                  {m.name}
                </span>
                <span className="text-muted-foreground text-xs">{m.email}</span>
              </div>
            </div>
          ))}
          {members.length === 0 && (
            <p className="text-muted-foreground py-4 text-center text-sm">
              No members registered.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ViewClassesDialog({
  staff,
  open,
  onClose,
}: {
  staff: StaffMember | null;
  open: boolean;
  onClose: () => void;
}) {
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [selectedLecture, setSelectedLecture] = useState<Lecture | null>(null);

  const { data: lectures = [] } = useQuery({
    queryKey: ['staff', staff?.id, 'lectures'] as const,
    queryFn: () => apiClient<Lecture[]>(`/api/staff/${staff!.id}/lectures`),
    enabled: open && !!staff,
  });

  function handleViewMembers(lecture: Lecture) {
    setSelectedLecture(lecture);
    setMembersDialogOpen(true);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="border-border bg-card text-foreground flex max-h-[85vh] w-[90vw] max-w-[760px] flex-col overflow-hidden sm:max-w-[760px]">
          <DialogHeader>
            <DialogTitle className="text-foreground text-[1.2rem] font-bold">
              {staff ? `${staff.firstName} ${staff.lastName}` : ''} — Classes
            </DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="text-muted-foreground text-xs-plus mb-5 flex gap-5">
              <span className="flex items-center gap-1.5">
                <span
                  className={cn(
                    'inline-block h-2.5 w-2.5 shrink-0 rounded-full',
                    STATUS_DOT_CLASSES['available'],
                  )}
                />
                Available
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className={cn(
                    'inline-block h-2.5 w-2.5 shrink-0 rounded-full',
                    STATUS_DOT_CLASSES['almost-full'],
                  )}
                />
                Almost full
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className={cn(
                    'inline-block h-2.5 w-2.5 shrink-0 rounded-full',
                    STATUS_DOT_CLASSES['full'],
                  )}
                />
                Full
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {lectures.map((lecture) => (
                <LectureCard
                  key={lecture.id}
                  lecture={lecture}
                  onViewMembers={handleViewMembers}
                />
              ))}
              {lectures.length === 0 && (
                <p className="text-muted-foreground py-4 text-center text-sm">
                  No classes assigned.
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <MembersDialog
        lecture={selectedLecture}
        open={membersDialogOpen}
        onClose={() => setMembersDialogOpen(false)}
      />
    </>
  );
}

export default function AdminStaffPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [viewStaff, setViewStaff] = useState<StaffMember | null>(null);
  const [classesOpen, setClassesOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editStaff, setEditStaff] = useState<StaffMember | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);

  const {
    data: staffList = [],
    isLoading: loadingStaff,
    isError: staffError,
  } = useQuery({
    queryKey: staffListKey,
    queryFn: () => apiClient<StaffMember[]>('/api/staff'),
  });
  const { data: exerciseTypes = [] } = useQuery({
    queryKey: exerciseTypesKey,
    queryFn: () => apiClient<ExerciseType[]>('/api/exercise-types'),
  });

  const deleteStaff = useMutation({
    mutationFn: (id: string) =>
      apiClient<void>(`/api/staff/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: staffListKey });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  function handleDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    deleteStaff.mutate(target.id, {
      onSuccess: () => {
        toast.success(
          `${target.firstName} ${target.lastName} has been removed.`,
        );
      },
    });
  }

  const filterChips = [...exerciseTypes.map((t) => t.name), RECEPTION_FILTER];

  const filtered = staffList.filter((s) => {
    const matchesSearch =
      search === '' ||
      `${s.firstName} ${s.lastName}`
        .toLowerCase()
        .includes(search.toLowerCase());

    let matchesFilter = true;
    if (activeFilter !== null) {
      matchesFilter =
        activeFilter === RECEPTION_FILTER
          ? s.role === RECEPTION_FILTER
          : s.specializations.includes(activeFilter);
    }
    return matchesSearch && matchesFilter;
  });

  function handleView(staff: StaffMember) {
    setViewStaff(staff);
    setClassesOpen(true);
  }

  return (
    <div className="bg-background text-foreground min-h-[calc(100svh-var(--nav-height))] pt-[var(--nav-height)]">
      <div className="mx-auto max-w-[1200px] px-8 py-10 md:px-4 md:py-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 md:flex-col md:items-start">
          <h1 className="text-foreground text-[2rem] font-extrabold">
            Manage Staff
          </h1>
          <div className="flex items-center gap-3">
            <div className="relative flex items-center">
              <Search
                size={15}
                className="text-muted-foreground pointer-events-none absolute left-2.5"
              />
              <Input
                placeholder="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-[220px] pl-8"
              />
              {search && (
                <button
                  className="text-muted-foreground hover:text-foreground absolute right-2 flex cursor-pointer items-center border-none bg-transparent p-0"
                  onClick={() => setSearch('')}
                >
                  <X size={13} />
                </button>
              )}
            </div>
            <Button
              className="border-border bg-secondary text-foreground hover:border-primary hover:bg-primary hover:text-primary-foreground gap-1.5 border"
              onClick={() => setAddOpen(true)}
            >
              <Plus size={14} />
              Add
            </Button>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {filterChips.map((chip) => (
            <Button
              key={chip}
              size="sm"
              variant={activeFilter === chip ? 'default' : 'outline'}
              className={
                activeFilter === chip
                  ? ''
                  : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
              }
              onClick={() =>
                setActiveFilter((prev) => (prev === chip ? null : chip))
              }
            >
              {chip}
            </Button>
          ))}
        </div>

        <div className="border-border bg-card text-muted-foreground text-xs-plus mb-6 inline-block rounded-full border px-3.5 py-1">
          Employee counter: {filtered.length}
        </div>

        <div className="flex flex-col gap-2.5">
          {staffError && (
            <Alert variant="destructive">
              <AlertTitle>Couldn&apos;t load staff</AlertTitle>
              <AlertDescription>
                Something went wrong. Please try again later.
              </AlertDescription>
            </Alert>
          )}
          {!staffError && loadingStaff && (
            <>
              <Skeleton className="h-[68px] rounded-lg" />
              <Skeleton className="h-[68px] rounded-lg" />
              <Skeleton className="h-[68px] rounded-lg" />
            </>
          )}
          {!staffError &&
            !loadingStaff &&
            filtered.map((staff) => (
              <div
                key={staff.id}
                className="border-border bg-card hover:border-primary flex flex-wrap items-center gap-2.5 rounded-lg border px-5 py-3.5 transition-colors md:flex-nowrap md:gap-4"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-sm font-bold text-white">
                  {getInitials(staff.firstName, staff.lastName)}
                </div>
                <span className="text-foreground min-w-0 text-[15px] font-semibold md:flex-1">
                  {staff.firstName} {staff.lastName}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {staff.role === RECEPTION_FILTER ? (
                    <span className="border-border bg-secondary text-muted-foreground rounded-full border px-3 py-0.5 text-xs whitespace-nowrap">
                      {staff.role}
                    </span>
                  ) : staff.specializations.length > 0 ? (
                    staff.specializations.map((spec) => (
                      <span
                        key={spec}
                        className="border-border bg-secondary text-muted-foreground rounded-full border px-3 py-0.5 text-xs whitespace-nowrap"
                      >
                        {spec}
                      </span>
                    ))
                  ) : (
                    <span className="border-border bg-secondary text-muted-foreground rounded-full border px-3 py-0.5 text-xs whitespace-nowrap">
                      {staff.role}
                    </span>
                  )}
                </div>
                <span className="text-muted-foreground text-xs-plus whitespace-nowrap">
                  {staff.since}
                </span>
                <div className="flex w-full justify-end gap-2 md:ml-auto md:w-auto md:shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-border text-foreground hover:border-primary hover:bg-secondary text-xs-plus bg-transparent"
                    onClick={() => handleView(staff)}
                  >
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-border text-foreground hover:border-primary hover:bg-secondary hover:text-primary bg-transparent"
                    aria-label="Edit staff member"
                    onClick={() => {
                      setEditStaff(staff);
                      setEditOpen(true);
                    }}
                  >
                    <Pencil size={14} />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="text-xs-plus"
                    onClick={() => setDeleteTarget(staff)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          {!staffError && !loadingStaff && filtered.length === 0 && (
            <EmptyState message="No staff members found." />
          )}
        </div>
      </div>

      <ViewClassesDialog
        staff={viewStaff}
        open={classesOpen}
        onClose={() => setClassesOpen(false)}
      />
      <AddMemberDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={() => toast.success('Staff member added successfully.')}
        exerciseTypes={exerciseTypes}
      />
      <EditStaffDialog
        staff={editStaff}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={() => toast.success('Staff member updated successfully.')}
        exerciseTypes={exerciseTypes}
      />
      <DeleteConfirmDialog
        name={
          deleteTarget
            ? `${deleteTarget.firstName} ${deleteTarget.lastName}`
            : ''
        }
        open={deleteTarget !== null}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
