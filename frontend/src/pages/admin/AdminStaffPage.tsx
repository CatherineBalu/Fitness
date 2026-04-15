import { useState, useEffect } from 'react';
import { Search, Plus, Clock, MapPin, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import './AdminStaffPage.css';

const API_BASE = 'http://localhost:3000';

interface Lecture {
  id: number;
  name: string;
  time: string;
  room: string;
  capacity: number;
  registered: number;
}

interface StaffMember {
  id: number;
  firstName: string;
  lastName: string;
  role: string;
  since: string;
}

interface Member {
  id: number;
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
            <span>{lecture.time}</span>
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
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    if (!open || !lecture) return;
    fetch(`${API_BASE}/api/lectures/${lecture.id}/members`)
      .then((r) => r.json())
      .then((data: Member[]) => setMembers(data))
      .catch(() => setMembers([]));
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
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [selectedLecture, setSelectedLecture] = useState<Lecture | null>(null);

  useEffect(() => {
    if (!open || !staff) return;
    fetch(`${API_BASE}/api/staff/${staff.id}/lectures`)
      .then((r) => r.json())
      .then((data: Lecture[]) => setLectures(data))
      .catch(() => setLectures([]));
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
}: {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [form, setForm] = useState({
    fullName: '',
    role: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch(`${API_BASE}/api/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError((data as { error: string }).error ?? 'Something went wrong');
      return;
    }

    setForm({ fullName: '', role: '', email: '', password: '' });
    onAdded();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="add-member-dialog">
        <DialogHeader>
          <DialogTitle className="add-member-dialog-title">
            Add member
          </DialogTitle>
        </DialogHeader>
        <form className="add-member-form" onSubmit={handleSubmit}>
          {error && <p className="add-member-error">{error}</p>}
          <div className="add-member-field">
            <label className="add-member-label">Full name</label>
            <Input
              name="fullName"
              placeholder="Enter text here"
              value={form.fullName}
              onChange={handleChange}
              className="add-member-input"
              required
            />
          </div>
          <div className="add-member-field">
            <label className="add-member-label">Role</label>
            <Input
              name="role"
              placeholder="Enter text here"
              value={form.role}
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
              placeholder="Enter text here"
              value={form.email}
              onChange={handleChange}
              className="add-member-input"
              required
            />
          </div>
          <div className="add-member-field">
            <label className="add-member-label">Password</label>
            <Input
              name="password"
              type="password"
              placeholder="Enter text here"
              value={form.password}
              onChange={handleChange}
              className="add-member-input"
              required
            />
          </div>
          <Button
            type="submit"
            className="add-member-submit"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminStaffPage() {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [search, setSearch] = useState('');
  const [activeRole, setActiveRole] = useState<string | null>(null);
  const [viewStaff, setViewStaff] = useState<StaffMember | null>(null);
  const [classesOpen, setClassesOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function loadStaff() {
    fetch(`${API_BASE}/api/staff`)
      .then((r) => r.json())
      .then((data: StaffMember[]) => {
        setStaffList(data);
        setLoadingStaff(false);
      })
      .catch(() => {
        setStaffList([]);
        setLoadingStaff(false);
      });
  }

  useEffect(() => {
    loadStaff();
  }, []);

  function showSuccess(message: string) {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await fetch(`${API_BASE}/api/staff/${deleteTarget.id}`, {
      method: 'DELETE',
    });
    setDeleteTarget(null);
    loadStaff();
    showSuccess(
      `${deleteTarget.firstName} ${deleteTarget.lastName} has been removed.`,
    );
  }

  const allRoles = Array.from(new Set(staffList.map((s) => s.role)));

  const filtered = staffList.filter((s) => {
    const matchesSearch =
      search === '' ||
      `${s.firstName} ${s.lastName}`
        .toLowerCase()
        .includes(search.toLowerCase());
    const matchesRole = activeRole === null || s.role === activeRole;
    return matchesSearch && matchesRole;
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
          {allRoles.map((role) => (
            <Button
              key={role}
              size="sm"
              variant={activeRole === role ? 'default' : 'outline'}
              className={
                activeRole === role
                  ? 'staff-filter-btn staff-filter-btn--active'
                  : 'staff-filter-btn'
              }
              onClick={() =>
                setActiveRole((prev) => (prev === role ? null : role))
              }
            >
              {role}
            </Button>
          ))}
        </div>

        {successMessage && (
          <div className="staff-success">{successMessage}</div>
        )}

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
                <span className="staff-row-badge">{staff.role}</span>
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
          showSuccess('Staff member added successfully.');
        }}
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
