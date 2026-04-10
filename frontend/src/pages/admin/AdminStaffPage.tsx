import { useState } from 'react';
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
  lectures: Lecture[];
}

interface Member {
  id: number;
  name: string;
  email: string;
}

const MOCK_MEMBERS: Member[] = [
  { id: 1, name: 'Jana Nováková', email: 'jana@example.com' },
  { id: 2, name: 'Peter Kováč', email: 'peter@example.com' },
  { id: 3, name: 'Mária Horáková', email: 'maria@example.com' },
  { id: 4, name: 'Tomáš Blaho', email: 'tomas@example.com' },
  { id: 5, name: 'Eva Slobodová', email: 'eva@example.com' },
];

const STAFF: StaffMember[] = [
  {
    id: 1,
    firstName: 'Štefan',
    lastName: 'Murín',
    role: 'Pilates',
    since: '04/2024',
    lectures: [
      {
        id: 1,
        name: 'Morning Pilates',
        time: '08:00 - 09:00',
        room: 'Room A',
        capacity: 15,
        registered: 7,
      },
      {
        id: 2,
        name: 'Evening Pilates',
        time: '18:00 - 19:00',
        room: 'Room A',
        capacity: 15,
        registered: 14,
      },
      {
        id: 3,
        name: 'Core Strength',
        time: '10:00 - 11:00',
        room: 'Room B',
        capacity: 12,
        registered: 12,
      },
    ],
  },
  {
    id: 2,
    firstName: 'Jana',
    lastName: 'Procházková',
    role: 'Yoga',
    since: '01/2023',
    lectures: [
      {
        id: 4,
        name: 'Vinyasa Yoga',
        time: '09:00 - 10:00',
        room: 'Room C',
        capacity: 20,
        registered: 10,
      },
      {
        id: 5,
        name: 'Yin Yoga',
        time: '17:00 - 18:00',
        room: 'Room C',
        capacity: 20,
        registered: 18,
      },
    ],
  },
  {
    id: 3,
    firstName: 'Martin',
    lastName: 'Horák',
    role: 'HIIT',
    since: '06/2023',
    lectures: [
      {
        id: 6,
        name: 'HIIT Cardio',
        time: '07:00 - 08:00',
        room: 'Room D',
        capacity: 25,
        registered: 25,
      },
      {
        id: 7,
        name: 'Cardio Blast',
        time: '16:00 - 17:00',
        room: 'Room D',
        capacity: 25,
        registered: 20,
      },
    ],
  },
  {
    id: 4,
    firstName: 'Katarína',
    lastName: 'Blahová',
    role: 'Spinning',
    since: '09/2024',
    lectures: [
      {
        id: 8,
        name: 'Spin Class',
        time: '06:30 - 07:30',
        room: 'Room B',
        capacity: 18,
        registered: 9,
      },
    ],
  },
  {
    id: 5,
    firstName: 'Ján',
    lastName: 'Breja',
    role: 'CrossFit',
    since: '03/2022',
    lectures: [
      {
        id: 9,
        name: 'CrossFit Basics',
        time: '12:00 - 13:00',
        room: 'Room D',
        capacity: 15,
        registered: 6,
      },
      {
        id: 10,
        name: 'Power Lifting',
        time: '15:00 - 16:00',
        room: 'Room B',
        capacity: 10,
        registered: 4,
      },
      {
        id: 11,
        name: 'CrossFit Advanced',
        time: '19:00 - 20:00',
        room: 'Room D',
        capacity: 12,
        registered: 11,
      },
    ],
  },
];

const ALL_ROLES = Array.from(new Set(STAFF.map((s) => s.role)));

function getInitials(first: string, last: string) {
  return `${first[0]}${last[0]}`.toUpperCase();
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
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="members-dialog">
        <DialogHeader>
          <DialogTitle className="members-dialog-title">
            {lecture?.name} — Members
          </DialogTitle>
        </DialogHeader>
        <div className="members-list">
          {MOCK_MEMBERS.slice(0, lecture?.registered ?? 0).map((m) => (
            <div key={m.id} className="members-list-row">
              <div className="member-avatar">{m.name[0]}</div>
              <div className="member-info">
                <span className="member-name">{m.name}</span>
                <span className="member-email">{m.email}</span>
              </div>
            </div>
          ))}
          {(lecture?.registered ?? 0) === 0 && (
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
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [selectedLecture, setSelectedLecture] = useState<Lecture | null>(null);

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
            {staff?.lectures.map((lecture) => (
              <LectureCard
                key={lecture.id}
                lecture={lecture}
                onViewMembers={handleViewMembers}
              />
            ))}
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
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    fullName: '',
    role: '',
    email: '',
    password: '',
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onClose();
    setForm({ fullName: '', role: '', email: '', password: '' });
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
          <Button type="submit" className="add-member-submit">
            Create
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminStaffPage() {
  const [search, setSearch] = useState('');
  const [activeRole, setActiveRole] = useState<string | null>(null);
  const [viewStaff, setViewStaff] = useState<StaffMember | null>(null);
  const [classesOpen, setClassesOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const filtered = STAFF.filter((s) => {
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
          {ALL_ROLES.map((role) => (
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

        <div className="admin-staff-counter">
          Employee counter: {filtered.length}
        </div>

        <div className="admin-staff-list">
          {filtered.map((staff) => (
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
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="admin-staff-empty">No staff members found.</p>
          )}
        </div>
      </div>

      <ViewClassesDialog
        staff={viewStaff}
        open={classesOpen}
        onClose={() => setClassesOpen(false)}
      />
      <AddMemberDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
