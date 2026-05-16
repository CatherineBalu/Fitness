import { Search, Plus, Clock, MapPin, Users, X, Pencil } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useApi } from '@/lib/api';
import { cn } from '@/lib/utils';

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
    `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${fmt(new Date(startIso))} - ${fmt(new Date(endIso))}`;
}

interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  clerkId: string;
  role: string;
  since: string;
  specializations: string[];
}

interface ExerciseType {
  id: string;
  name: string;
}

interface EmployeeType {
  id: string;
  roleName: string;
}

const RECEPTION_FILTER = 'Reception';

const STATUS_DOT_CLASSES: Record<string, string> = {
  available: 'bg-green-400',
  'almost-full': 'bg-orange-400',
  full: 'bg-red-400',
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
      <DialogContent className="max-w-[400px] border-border bg-card text-foreground">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-foreground">
            Delete staff member
          </DialogTitle>
        </DialogHeader>
        <p className="mb-5 mt-2 text-sm leading-relaxed text-muted-foreground">
          Are you sure you want to delete{' '}
          <strong className="text-foreground">{name}</strong>? This action
          cannot be undone.
        </p>
        <div className="flex justify-end gap-2.5">
          <Button variant="outline" className="border-border text-foreground" onClick={onClose}>
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
    <Card className="border-border bg-background transition-colors hover:border-primary">
      <CardContent className="flex flex-col gap-2 p-3.5">
        <div className="flex justify-end">
          <span className={cn('inline-block h-2.5 w-2.5 shrink-0 rounded-full', STATUS_DOT_CLASSES[status])} />
        </div>
        <h4 className="m-0 text-[0.9rem] font-semibold leading-snug text-foreground">{lecture.name}</h4>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Clock size={12} />
            <span>{formatLectureTime(lecture.startTime, lecture.endTime)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <MapPin size={12} />
            <span>{lecture.room}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Users size={12} />
            <span>
              {lecture.registered}/{lecture.capacity}
            </span>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="mt-0.5 w-full border-border bg-transparent text-[11px] text-foreground hover:border-primary hover:bg-primary hover:text-primary-foreground"
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
  const { apiRequest } = useApi();
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    if (!open || !lecture) return;
    apiRequest<Member[]>(`/api/lectures/${lecture.id}/members`)
      .then((data) => setMembers(data))
      .catch(() => setMembers([]));
    // apiRequest is stable via useCallback; lecture.id and open are the real triggers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lecture]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[420px] border-border bg-card text-foreground">
        <DialogHeader>
          <DialogTitle className="text-[1.1rem] font-bold text-foreground">
            {lecture?.name} — Members
          </DialogTitle>
        </DialogHeader>
        <div className="mt-1 flex flex-col gap-2.5">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 rounded-md border border-border bg-background px-3.5 py-2.5">
              <div className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-sm font-bold text-white">
                {m.name[0]}
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-foreground">{m.name}</span>
                <span className="text-xs text-muted-foreground">{m.email}</span>
              </div>
            </div>
          ))}
          {members.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">No members registered.</p>
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
  const { apiRequest } = useApi();
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [selectedLecture, setSelectedLecture] = useState<Lecture | null>(null);

  useEffect(() => {
    if (!open || !staff) return;
    apiRequest<Lecture[]>(`/api/staff/${staff.id}/lectures`)
      .then((data) => setLectures(data))
      .catch(() => setLectures([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, staff]);

  function handleViewMembers(lecture: Lecture) {
    setSelectedLecture(lecture);
    setMembersDialogOpen(true);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="flex max-h-[85vh] w-[90vw] max-w-[760px] flex-col overflow-hidden border-border bg-card text-foreground">
          <DialogHeader>
            <DialogTitle className="text-[1.2rem] font-bold text-foreground">
              {staff ? `${staff.firstName} ${staff.lastName}` : ''} — Classes
            </DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="mb-5 flex gap-5 text-[13px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className={cn('inline-block h-2.5 w-2.5 shrink-0 rounded-full', STATUS_DOT_CLASSES['available'])} />
                Available
              </span>
              <span className="flex items-center gap-1.5">
                <span className={cn('inline-block h-2.5 w-2.5 shrink-0 rounded-full', STATUS_DOT_CLASSES['almost-full'])} />
                Almost full
              </span>
              <span className="flex items-center gap-1.5">
                <span className={cn('inline-block h-2.5 w-2.5 shrink-0 rounded-full', STATUS_DOT_CLASSES['full'])} />
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
                <p className="py-4 text-center text-sm text-muted-foreground">No classes assigned.</p>
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

function AddMemberDialog({
  open,
  onClose,
  onAdded,
  exerciseTypes,
}: {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
  exerciseTypes: ExerciseType[];
}) {
  const { apiRequest } = useApi();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: '',
  });
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [employeeTypes, setEmployeeTypes] = useState<EmployeeType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    apiRequest<EmployeeType[]>('/api/employee-types')
      .then((data) => setEmployeeTypes(data))
      .catch(() => setEmployeeTypes([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function toggleSpecialization(id: string) {
    setSpecializations((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.role) {
      setError('Please select a role');
      return;
    }

    if (form.role === 'Instructor' && specializations.length === 0) {
      setError('Please select at least one specialization');
      return;
    }

    setLoading(true);

    try {
      const data = await apiRequest<{
        success: boolean;
        temporaryPassword: string;
      }>('/api/staff', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          specializations: form.role === 'Instructor' ? specializations : [],
        }),
      });
      setTempPassword(data.temporaryPassword);
      onAdded();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to create staff member',
      );
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setForm({ firstName: '', lastName: '', email: '', role: '' });
    setSpecializations([]);
    setError(null);
    setTempPassword(null);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-[400px] border-border bg-card text-foreground">
        <DialogHeader>
          <DialogTitle className="text-[1.2rem] font-bold text-foreground">
            {tempPassword ? 'Staff member created' : 'Add staff member'}
          </DialogTitle>
        </DialogHeader>

        {tempPassword ? (
          <div className="mt-2 flex flex-col gap-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Account created successfully. Share this temporary password with
              the new staff member — they can change it after first login.
            </p>
            <div className="rounded-md border border-border bg-background px-4 py-3 text-center font-mono text-[15px] font-bold tracking-widest text-foreground">
              {tempPassword}
            </div>
            <Button className="w-full bg-primary font-bold text-primary-foreground hover:bg-primary/90" onClick={handleClose}>
              Done
            </Button>
          </div>
        ) : (
          <form className="mt-2 flex flex-col gap-4" onSubmit={handleSubmit}>
            {error && (
              <p className="rounded-md border border-red-800/30 bg-red-400/10 px-3 py-2 text-[13px] text-red-400">
                {error}
              </p>
            )}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-muted-foreground">First name</label>
              <Input
                name="firstName"
                placeholder="Enter first name"
                value={form.firstName}
                onChange={handleChange}
                className="bg-background"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-muted-foreground">Last name</label>
              <Input
                name="lastName"
                placeholder="Enter last name"
                value={form.lastName}
                onChange={handleChange}
                className="bg-background"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-muted-foreground">Email</label>
              <Input
                name="email"
                type="email"
                placeholder="Enter email"
                value={form.email}
                onChange={handleChange}
                className="bg-background"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-muted-foreground">Role</label>
              <Select
                value={form.role}
                onValueChange={(value) => {
                  setForm((prev) => ({ ...prev, role: value }));
                  if (value !== 'Instructor') setSpecializations([]);
                }}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {employeeTypes.map((t) => (
                    <SelectItem key={t.id} value={t.roleName}>
                      {t.roleName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.role === 'Instructor' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-muted-foreground">Specializations</label>
                <div className="flex flex-wrap gap-2">
                  {exerciseTypes.map((et) => {
                    const active = specializations.includes(et.id);
                    return (
                      <Button
                        type="button"
                        key={et.id}
                        size="sm"
                        variant={active ? 'default' : 'outline'}
                        className={active ? '' : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'}
                        onClick={() => toggleSpecialization(et.id)}
                      >
                        {et.name}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            <Button
              type="submit"
              className="mt-1 bg-primary font-bold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create'}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditStaffDialog({
  staff,
  open,
  onClose,
  onSaved,
  exerciseTypes,
}: {
  staff: StaffMember | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  exerciseTypes: ExerciseType[];
}) {
  const { apiRequest } = useApi();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !staff) return;
    setFirstName(staff.firstName);
    setLastName(staff.lastName);
    const ids = exerciseTypes
      .filter((et) => staff.specializations.includes(et.name))
      .map((et) => et.id);
    setSpecializations(ids);
    setError(null);
  }, [open, staff, exerciseTypes]);

  function toggleSpecialization(id: string) {
    setSpecializations((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!staff) return;
    setError(null);

    if (staff.role === 'Instructor' && specializations.length === 0) {
      setError('Please select at least one specialization');
      return;
    }

    setLoading(true);
    try {
      await apiRequest(`/api/staff/${staff.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          firstName,
          lastName,
          specializations:
            staff.role === 'Instructor' ? specializations : undefined,
        }),
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update staff member',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[400px] border-border bg-card text-foreground">
        <DialogHeader>
          <DialogTitle className="text-[1.2rem] font-bold text-foreground">
            Edit staff member
          </DialogTitle>
        </DialogHeader>
        <form className="mt-2 flex flex-col gap-4" onSubmit={handleSubmit}>
          {error && (
            <p className="rounded-md border border-red-800/30 bg-red-400/10 px-3 py-2 text-[13px] text-red-400">
              {error}
            </p>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-muted-foreground">First name</label>
            <Input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="bg-background"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-muted-foreground">Last name</label>
            <Input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="bg-background"
              required
            />
          </div>
          {staff?.role === 'Instructor' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-muted-foreground">Specializations</label>
              <div className="flex flex-wrap gap-2">
                {exerciseTypes.map((et) => {
                  const active = specializations.includes(et.id);
                  return (
                    <Button
                      type="button"
                      key={et.id}
                      size="sm"
                      variant={active ? 'default' : 'outline'}
                      className={active ? '' : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'}
                      onClick={() => toggleSpecialization(et.id)}
                    >
                      {et.name}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
          <Button
            type="submit"
            className="mt-1 bg-primary font-bold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminStaffPage() {
  const { apiRequest } = useApi();
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [exerciseTypes, setExerciseTypes] = useState<ExerciseType[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [viewStaff, setViewStaff] = useState<StaffMember | null>(null);
  const [classesOpen, setClassesOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editStaff, setEditStaff] = useState<StaffMember | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);

  const loadStaff = useCallback(() => {
    setLoadingStaff(true);
    apiRequest<StaffMember[]>('/api/staff')
      .then((data) => {
        setStaffList(data);
        setLoadingStaff(false);
      })
      .catch(() => {
        setStaffList([]);
        setLoadingStaff(false);
      });
  }, [apiRequest]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadStaff();
    apiRequest<ExerciseType[]>('/api/exercise-types')
      .then((data) => setExerciseTypes(data))
      .catch(() => setExerciseTypes([]));
  }, [loadStaff, apiRequest]);

  async function handleDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      await apiRequest(`/api/staff/${target.id}`, { method: 'DELETE' });
      loadStaff();
      toast.success(`${target.firstName} ${target.lastName} has been removed.`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete staff member.',
      );
    }
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
    <div className="min-h-[calc(100svh-var(--nav-height))] bg-background pt-[var(--nav-height)] text-foreground">
      <div className="mx-auto max-w-[1200px] px-8 py-10 md:px-4 md:py-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 md:flex-col md:items-start">
          <h1 className="text-[2rem] font-extrabold text-foreground">Manage Staff</h1>
          <div className="flex items-center gap-3">
            <div className="relative flex items-center">
              <Search size={15} className="pointer-events-none absolute left-2.5 text-muted-foreground" />
              <Input
                placeholder="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-[220px] pl-8"
              />
              {search && (
                <button
                  className="absolute right-2 flex cursor-pointer items-center border-none bg-transparent p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => setSearch('')}
                >
                  <X size={13} />
                </button>
              )}
            </div>
            <Button
              className="gap-1.5 border border-border bg-secondary text-foreground hover:border-primary hover:bg-primary hover:text-primary-foreground"
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
              className={activeFilter === chip ? '' : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'}
              onClick={() =>
                setActiveFilter((prev) => (prev === chip ? null : chip))
              }
            >
              {chip}
            </Button>
          ))}
        </div>

        <div className="mb-6 inline-block rounded-full border border-border bg-card px-3.5 py-1 text-[13px] text-muted-foreground">
          Employee counter: {filtered.length}
        </div>

        <div className="flex flex-col gap-2.5">
          {loadingStaff && (
            <p className="py-6 text-sm text-muted-foreground">Loading staff...</p>
          )}
          {!loadingStaff &&
            filtered.map((staff) => (
              <div key={staff.id} className="flex flex-wrap items-center gap-2.5 rounded-lg border border-border bg-card px-5 py-3.5 transition-colors hover:border-primary md:flex-nowrap md:gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-sm font-bold text-white">
                  {getInitials(staff.firstName, staff.lastName)}
                </div>
                <span className="min-w-0 text-[15px] font-semibold text-foreground md:flex-1">
                  {staff.firstName} {staff.lastName}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {staff.role === RECEPTION_FILTER ? (
                    <span className="whitespace-nowrap rounded-full border border-border bg-secondary px-3 py-0.5 text-xs text-muted-foreground">
                      {staff.role}
                    </span>
                  ) : staff.specializations.length > 0 ? (
                    staff.specializations.map((spec) => (
                      <span key={spec} className="whitespace-nowrap rounded-full border border-border bg-secondary px-3 py-0.5 text-xs text-muted-foreground">
                        {spec}
                      </span>
                    ))
                  ) : (
                    <span className="whitespace-nowrap rounded-full border border-border bg-secondary px-3 py-0.5 text-xs text-muted-foreground">
                      {staff.role}
                    </span>
                  )}
                </div>
                <span className="whitespace-nowrap text-[13px] text-muted-foreground">{staff.since}</span>
                <div className="flex w-full justify-end gap-2 md:ml-auto md:w-auto md:shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-border bg-transparent text-[13px] text-foreground hover:border-primary hover:bg-secondary"
                    onClick={() => handleView(staff)}
                  >
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-border bg-transparent text-foreground hover:border-primary hover:bg-secondary hover:text-primary"
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
                    className="text-[13px]"
                    onClick={() => setDeleteTarget(staff)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          {!loadingStaff && filtered.length === 0 && (
            <p className="py-6 text-sm text-muted-foreground">No staff members found.</p>
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
        onAdded={() => {
          loadStaff();
          toast.success('Staff member added successfully.');
        }}
        exerciseTypes={exerciseTypes}
      />
      <EditStaffDialog
        staff={editStaff}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          loadStaff();
          toast.success('Staff member updated successfully.');
        }}
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
