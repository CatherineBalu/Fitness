import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Clock, MapPin, Users, X, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useApi } from '@/lib/api';
import './AdminStaffPage.css';

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
      <DialogContent className="delete-confirm-dialog">
        <DialogHeader>
          <DialogTitle className="delete-confirm-title">
            Delete staff member
          </DialogTitle>
        </DialogHeader>
        <p className="delete-confirm-body">
          Are you sure you want to delete <strong>{name}</strong>? This action
          cannot be undone.
        </p>
        <div className="delete-confirm-actions">
          <Button
            variant="outline"
            className="delete-confirm-cancel"
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
    <Card className="staff-lecture-card">
      <CardContent className="staff-lecture-card-content">
        <div className="staff-lecture-card-top">
          <span className={`status-dot status-dot--${status}`} />
        </div>
        <h4 className="staff-lecture-name">{lecture.name}</h4>
        <div className="staff-lecture-meta">
          <div className="staff-lecture-meta-row">
            <Clock size={12} />
            <span>{formatLectureTime(lecture.startTime, lecture.endTime)}</span>
          </div>
          <div className="staff-lecture-meta-row">
            <MapPin size={12} />
            <span>{lecture.room}</span>
          </div>
          <div className="staff-lecture-meta-row">
            <Users size={12} />
            <span>
              {lecture.registered}/{lecture.capacity}
            </span>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="staff-lecture-view-btn"
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
      <DialogContent className="members-dialog">
        <DialogHeader>
          <DialogTitle className="members-dialog-title">
            {lecture?.name} — Members
          </DialogTitle>
        </DialogHeader>
        <div className="members-list">
          {members.map((m) => (
            <div key={m.id} className="members-list-row">
              <div className="member-avatar">{m.name[0]}</div>
              <div className="member-info">
                <span className="member-name">{m.name}</span>
                <span className="member-email">{m.email}</span>
              </div>
            </div>
          ))}
          {members.length === 0 && (
            <p className="members-empty">No members registered.</p>
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
        <DialogContent className="classes-dialog">
          <DialogHeader>
            <DialogTitle className="classes-dialog-title">
              {staff ? `${staff.firstName} ${staff.lastName}` : ''} — Classes
            </DialogTitle>
          </DialogHeader>
          <div className="classes-dialog-body">
            <div className="classes-dialog-legend">
              <span className="legend-item">
                <span className="status-dot status-dot--available" />
                Available
              </span>
              <span className="legend-item">
                <span className="status-dot status-dot--almost-full" />
                Almost full
              </span>
              <span className="legend-item">
                <span className="status-dot status-dot--full" />
                Full
              </span>
            </div>
            <div className="classes-dialog-grid">
              {lectures.map((lecture) => (
                <LectureCard
                  key={lecture.id}
                  lecture={lecture}
                  onViewMembers={handleViewMembers}
                />
              ))}
              {lectures.length === 0 && (
                <p className="members-empty">No classes assigned.</p>
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
      <DialogContent className="add-member-dialog">
        <DialogHeader>
          <DialogTitle className="add-member-dialog-title">
            {tempPassword ? 'Staff member created' : 'Add staff member'}
          </DialogTitle>
        </DialogHeader>

        {tempPassword ? (
          <div className="add-member-success">
            <p className="add-member-success-text">
              Account created successfully. Share this temporary password with
              the new staff member — they can change it after first login.
            </p>
            <div className="add-member-temp-password">{tempPassword}</div>
            <Button className="add-member-submit" onClick={handleClose}>
              Done
            </Button>
          </div>
        ) : (
          <form className="add-member-form" onSubmit={handleSubmit}>
            {error && <p className="add-member-error">{error}</p>}
            <div className="add-member-field">
              <label className="add-member-label">First name</label>
              <Input
                name="firstName"
                placeholder="Enter first name"
                value={form.firstName}
                onChange={handleChange}
                className="add-member-input"
                required
              />
            </div>
            <div className="add-member-field">
              <label className="add-member-label">Last name</label>
              <Input
                name="lastName"
                placeholder="Enter last name"
                value={form.lastName}
                onChange={handleChange}
                className="add-member-input"
                required
              />
            </div>
            <div className="add-member-field">
              <label className="add-member-label">Email</label>
              <Input
                name="email"
                type="email"
                placeholder="Enter email"
                value={form.email}
                onChange={handleChange}
                className="add-member-input"
                required
              />
            </div>
            <div className="add-member-field">
              <label className="add-member-label">Role</label>
              <Select
                value={form.role}
                onValueChange={(value) => {
                  setForm((prev) => ({ ...prev, role: value }));
                  if (value !== 'Instructor') setSpecializations([]);
                }}
              >
                <SelectTrigger className="add-member-input">
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
              <div className="add-member-field">
                <label className="add-member-label">Specializations</label>
                <div className="add-member-specializations">
                  {exerciseTypes.map((et) => {
                    const active = specializations.includes(et.id);
                    return (
                      <Button
                        type="button"
                        key={et.id}
                        size="sm"
                        variant={active ? 'default' : 'outline'}
                        className={
                          active
                            ? 'staff-filter-btn staff-filter-btn--active'
                            : 'staff-filter-btn'
                        }
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
              className="add-member-submit"
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
      <DialogContent className="add-member-dialog">
        <DialogHeader>
          <DialogTitle className="add-member-dialog-title">
            Edit staff member
          </DialogTitle>
        </DialogHeader>
        <form className="add-member-form" onSubmit={handleSubmit}>
          {error && <p className="add-member-error">{error}</p>}
          <div className="add-member-field">
            <label className="add-member-label">First name</label>
            <Input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="add-member-input"
              required
            />
          </div>
          <div className="add-member-field">
            <label className="add-member-label">Last name</label>
            <Input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="add-member-input"
              required
            />
          </div>
          {staff?.role === 'Instructor' && (
            <div className="add-member-field">
              <label className="add-member-label">Specializations</label>
              <div className="add-member-specializations">
                {exerciseTypes.map((et) => {
                  const active = specializations.includes(et.id);
                  return (
                    <Button
                      type="button"
                      key={et.id}
                      size="sm"
                      variant={active ? 'default' : 'outline'}
                      className={
                        active
                          ? 'staff-filter-btn staff-filter-btn--active'
                          : 'staff-filter-btn'
                      }
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
            className="add-member-submit"
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
    <div className="admin-staff-page">
      <div className="admin-staff-inner">
        <div className="admin-staff-header">
          <h1 className="admin-staff-title">Manage Staff</h1>
          <div className="admin-staff-header-actions">
            <div className="admin-staff-search-wrap">
              <Search size={15} className="admin-staff-search-icon" />
              <Input
                placeholder="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="admin-staff-search"
              />
              {search && (
                <button
                  className="admin-staff-search-clear"
                  onClick={() => setSearch('')}
                >
                  <X size={13} />
                </button>
              )}
            </div>
            <Button
              className="admin-staff-add-btn"
              onClick={() => setAddOpen(true)}
            >
              <Plus size={14} />
              Add
            </Button>
          </div>
        </div>

        <div className="admin-staff-filters">
          {filterChips.map((chip) => (
            <Button
              key={chip}
              size="sm"
              variant={activeFilter === chip ? 'default' : 'outline'}
              className={
                activeFilter === chip
                  ? 'staff-filter-btn staff-filter-btn--active'
                  : 'staff-filter-btn'
              }
              onClick={() =>
                setActiveFilter((prev) => (prev === chip ? null : chip))
              }
            >
              {chip}
            </Button>
          ))}
        </div>

        <div className="admin-staff-counter">
          Employee counter: {filtered.length}
        </div>

        <div className="admin-staff-list">
          {loadingStaff && (
            <p className="admin-staff-loading">Loading staff...</p>
          )}
          {!loadingStaff &&
            filtered.map((staff) => (
              <div key={staff.id} className="staff-row">
                <div className="staff-row-avatar">
                  {getInitials(staff.firstName, staff.lastName)}
                </div>
                <span className="staff-row-name">
                  {staff.firstName} {staff.lastName}
                </span>
                <div className="staff-row-badges">
                  {staff.role === RECEPTION_FILTER ? (
                    <span className="staff-row-badge">{staff.role}</span>
                  ) : staff.specializations.length > 0 ? (
                    staff.specializations.map((spec) => (
                      <span key={spec} className="staff-row-badge">
                        {spec}
                      </span>
                    ))
                  ) : (
                    <span className="staff-row-badge">{staff.role}</span>
                  )}
                </div>
                <span className="staff-row-since">{staff.since}</span>
                <div className="staff-row-actions">
                  <Button
                    size="sm"
                    variant="outline"
                    className="staff-row-view-btn"
                    onClick={() => handleView(staff)}
                  >
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="staff-row-edit-btn"
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
                    className="staff-row-delete-btn"
                    onClick={() => setDeleteTarget(staff)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          {!loadingStaff && filtered.length === 0 && (
            <p className="admin-staff-empty">No staff members found.</p>
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
