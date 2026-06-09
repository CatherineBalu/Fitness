import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, X, Pencil } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import EmptyState from '@/components/common/EmptyState';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient } from '@/lib/apiClient';
import { getInitials } from '@/lib/formatters';

import AddMemberDialog from '../AddMemberDialog';
import EditStaffDialog from '../EditStaffDialog';
import DeleteConfirmDialog from './components/DeleteConfirmDialog';
import ViewClassesDialog from './components/ViewClassesDialog';

import type { ExerciseType, StaffMember } from './adminStaff.types';

const staffListKey = ['staff', 'list'] as const;
const exerciseTypesKey = ['exercise-types'] as const;

const RECEPTION_FILTER = 'Reception';

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
