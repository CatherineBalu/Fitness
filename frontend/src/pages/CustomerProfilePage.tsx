import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { authKeys } from '@/hooks/useAuthProfile';
import {
  customerRegistrationsKey,
  useUnregisterReservation,
} from '@/hooks/useReservations';
import { apiClient } from '@/lib/apiClient';
import { cn } from '@/lib/utils';

import ContactIcons from '../components/common/ContactIcons';

interface Membership {
  name: string;
  price: number;
  durationDays: number;
  validUntil: string;
  isActive: boolean;
}

function formatBillingCycle(price: number, durationDays: number): string {
  if (durationDays <= 30) return '';
  const total = `€${price.toFixed(0)}`;
  if (durationDays >= 365) return ` · billed ${total} / year`;
  const months = Math.round(durationDays / 30);
  return ` · billed ${total} every ${months} months`;
}

interface ProfileData {
  name: string;
  surname: string;
  email: string;
  phoneNumber: string | null;
  membership: Membership | null;
}

interface RegistrationInstructor {
  name: string;
  phoneNumber: string | null;
  isLead: boolean;
}

interface Registration {
  reservationId: string;
  scheduleId: string;
  lectureName: string;
  startTime: string;
  endTime: string;
  roomName: string;
  instructors: RegistrationInstructor[];
}

interface Payment {
  id: string;
  subscriptionName: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
}

interface SpendingData {
  total: number;
  payments: Payment[];
}

const customerMeKey = ['customer', 'me'] as const;
const customerSpendingKey = ['customer', 'spending'] as const;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function CustomerProfilePage() {
  const qc = useQueryClient();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmUnregister, setConfirmUnregister] = useState<string | null>(
    null,
  );

  const profileQuery = useQuery({
    queryKey: customerMeKey,
    queryFn: () => apiClient<ProfileData>('/api/customer/me'),
  });
  const registrationsQuery = useQuery({
    queryKey: customerRegistrationsKey,
    queryFn: () => apiClient<Registration[]>('/api/customer/registrations'),
  });
  const spendingQuery = useQuery({
    queryKey: customerSpendingKey,
    queryFn: () => apiClient<SpendingData>('/api/customer/spending'),
  });

  const unregister = useUnregisterReservation();
  const cancelMembership = useMutation({
    mutationFn: () =>
      apiClient<void>('/api/customer/membership', { method: 'DELETE' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: customerMeKey });
      void qc.invalidateQueries({ queryKey: authKeys.profile() });
      setConfirmCancel(false);
    },
  });

  const loading =
    profileQuery.isLoading ||
    registrationsQuery.isLoading ||
    spendingQuery.isLoading;

  const error =
    profileQuery.error ?? registrationsQuery.error ?? spendingQuery.error;

  if (loading) {
    return (
      <div className="text-muted-foreground py-4 text-[0.85rem]">
        Loading your profile…
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-muted-foreground py-4 text-[0.85rem]">
        Failed to load profile: {error.message}
      </div>
    );
  }

  const profile = profileQuery.data ?? null;
  const registrations = registrationsQuery.data ?? [];
  const spending = spendingQuery.data ?? null;

  const upcoming = registrations.filter(
    (r) => new Date(r.startTime) >= new Date(),
  );
  const past = registrations.filter((r) => new Date(r.startTime) < new Date());

  const handleUnregister = (scheduleId: string) => {
    unregister.mutate(scheduleId, {
      onSuccess: () => setConfirmUnregister(null),
    });
  };

  return (
    <div className="text-foreground flex flex-col gap-8 pt-1 pb-4">
      {/* ── Membership ── */}
      <section className="flex flex-col gap-3">
        <p className="text-primary mb-0.5 text-[0.72rem] font-bold tracking-[0.12em] uppercase">
          Account
        </p>
        <h2 className="text-foreground mb-2.5 text-[1.1rem] font-extrabold">
          Membership
        </h2>

        {profile?.membership ? (
          <div
            className={cn(
              'border-border bg-secondary flex flex-col gap-3 rounded-xl border px-5 py-[18px] transition-colors',
              profile.membership.isActive ? 'border-primary' : 'opacity-70',
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-foreground text-base font-bold">
                {profile.membership.name}
              </span>
              <span
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-[0.7rem] font-bold tracking-[0.08em] uppercase',
                  profile.membership.isActive
                    ? 'border-primary/30 bg-primary/15 text-primary border'
                    : 'border-border bg-muted text-muted-foreground border',
                )}
              >
                {profile.membership.isActive ? 'Active' : 'Expired'}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <p className="text-muted-foreground text-[0.8rem]">
                Valid until:{' '}
                <span className="text-foreground font-medium">
                  {formatDate(profile.membership.validUntil)}
                </span>
              </p>
              <p className="text-muted-foreground text-[0.8rem]">
                Price:{' '}
                <span className="text-foreground font-medium">
                  €
                  {(
                    profile.membership.price /
                    (profile.membership.durationDays / 30)
                  ).toFixed(0)}{' '}
                  / month
                  {formatBillingCycle(
                    profile.membership.price,
                    profile.membership.durationDays,
                  )}
                </span>
              </p>
            </div>

            {!confirmCancel ? (
              <button
                className="border-destructive/25 bg-destructive/10 text-destructive hover:border-destructive/50 hover:bg-destructive/15 inline-flex cursor-pointer items-center gap-1.5 self-start rounded-lg border px-3.5 py-1.5 text-[0.8rem] font-semibold transition-colors"
                onClick={() => setConfirmCancel(true)}
              >
                Cancel membership
              </button>
            ) : (
              <div className="border-destructive/20 bg-destructive/[6%] flex flex-col gap-2.5 rounded-[10px] border px-4 py-3.5">
                <p className="text-muted-foreground text-[0.82rem] leading-[1.5]">
                  Your membership will be cancelled immediately. You'll lose
                  access to members-only classes.
                </p>
                <div className="flex gap-2">
                  <button
                    className="border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground cursor-pointer rounded-lg border bg-transparent px-3.5 py-1.5 text-[0.8rem] font-semibold transition-colors"
                    onClick={() => setConfirmCancel(false)}
                  >
                    Keep it
                  </button>
                  <button
                    className="text-destructive-foreground bg-destructive hover:bg-destructive/90 cursor-pointer rounded-lg px-3.5 py-1.5 text-[0.8rem] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => cancelMembership.mutate()}
                    disabled={cancelMembership.isPending}
                  >
                    {cancelMembership.isPending ? 'Cancelling…' : 'Yes, cancel'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="border-border bg-secondary text-muted-foreground rounded-xl border px-5 py-[18px] text-[0.85rem]">
            No active membership.
          </p>
        )}
      </section>

      {/* ── Registered lectures ── */}
      <section className="flex flex-col gap-3">
        <p className="text-primary mb-0.5 text-[0.72rem] font-bold tracking-[0.12em] uppercase">
          Schedule
        </p>
        <h2 className="text-foreground mb-2.5 text-[1.1rem] font-extrabold">
          Registered Lectures
        </h2>

        {registrations.length === 0 ? (
          <p className="text-muted-foreground py-3 text-[0.82rem]">
            No registrations yet.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {upcoming.length > 0 && (
              <>
                <p className="text-muted-foreground mt-2 mb-1 text-[0.72rem] font-bold tracking-[0.1em] uppercase">
                  Upcoming
                </p>
                {upcoming.map((r) => {
                  const lead = r.instructors.find((i) => i.isLead);
                  const primary = lead ?? r.instructors[0] ?? null;
                  return (
                    <div
                      key={r.reservationId}
                      className="border-border bg-secondary flex items-center justify-between gap-3 rounded-[10px] border px-4 py-3"
                    >
                      <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                        <span className="text-foreground overflow-hidden text-[0.88rem] font-semibold text-ellipsis whitespace-nowrap">
                          {r.lectureName}
                        </span>
                        <span className="text-muted-foreground text-[0.75rem]">
                          {formatDate(r.startTime)} · {formatTime(r.startTime)}–
                          {formatTime(r.endTime)} · {r.roomName}
                        </span>
                        {primary && (
                          <span className="text-muted-foreground flex items-center gap-2 text-[0.75rem]">
                            <span>Trainer: {primary.name}</span>
                            <ContactIcons
                              phone={primary.phoneNumber}
                              size="sm"
                            />
                          </span>
                        )}
                      </div>
                      {confirmUnregister === r.scheduleId ? (
                        <div className="flex shrink-0 items-center gap-1.5">
                          <span className="text-muted-foreground text-[0.75rem] whitespace-nowrap">
                            Cancel this?
                          </span>
                          <button
                            className="border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground cursor-pointer rounded-lg border bg-transparent px-2.5 py-1 text-[0.75rem] font-semibold transition-colors"
                            onClick={() => setConfirmUnregister(null)}
                          >
                            Keep
                          </button>
                          <button
                            className="text-destructive-foreground bg-destructive hover:bg-destructive/90 cursor-pointer rounded-lg px-2.5 py-1 text-[0.75rem] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={() => handleUnregister(r.scheduleId)}
                            disabled={unregister.isPending}
                          >
                            {unregister.isPending ? '…' : 'Yes'}
                          </button>
                        </div>
                      ) : (
                        <button
                          className="border-destructive/25 bg-destructive/10 text-destructive hover:border-destructive/50 hover:bg-destructive/15 shrink-0 cursor-pointer rounded-[7px] border px-3 py-1 text-[0.75rem] font-semibold transition-colors"
                          onClick={() => setConfirmUnregister(r.scheduleId)}
                        >
                          Unregister
                        </button>
                      )}
                    </div>
                  );
                })}
              </>
            )}
            {past.length > 0 && (
              <>
                <p className="text-muted-foreground mt-2 mb-1 text-[0.72rem] font-bold tracking-[0.1em] uppercase">
                  Past
                </p>
                {past.map((r) => (
                  <div
                    key={r.reservationId}
                    className="border-border bg-secondary flex items-center justify-between gap-3 rounded-[10px] border px-4 py-3 opacity-50"
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                      <span className="text-foreground overflow-hidden text-[0.88rem] font-semibold text-ellipsis whitespace-nowrap">
                        {r.lectureName}
                      </span>
                      <span className="text-muted-foreground text-[0.75rem]">
                        {formatDate(r.startTime)} · {formatTime(r.startTime)}–
                        {formatTime(r.endTime)} · {r.roomName}
                      </span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </section>

      {/* ── Spending ── */}
      <section className="flex flex-col gap-3">
        <p className="text-primary mb-0.5 text-[0.72rem] font-bold tracking-[0.12em] uppercase">
          Finances
        </p>
        <h2 className="text-foreground mb-2.5 text-[1.1rem] font-extrabold">
          Spending
        </h2>

        {!spending || spending.payments.length === 0 ? (
          <p className="text-muted-foreground py-3 text-[0.82rem]">
            No payments yet.
          </p>
        ) : (
          <>
            <div className="border-primary/20 bg-primary/[6%] mb-2 flex items-center justify-between rounded-[10px] border px-4 py-2.5 text-[0.85rem]">
              <span className="text-foreground font-semibold">Total spent</span>
              <span className="text-primary text-base font-extrabold">
                €{spending.total.toFixed(0)}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {spending.payments.map((p) => (
                <div
                  key={p.id}
                  className="border-border bg-secondary flex items-center justify-between gap-3 rounded-[10px] border px-4 py-3"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                    <span className="text-foreground overflow-hidden text-[0.88rem] font-semibold text-ellipsis whitespace-nowrap">
                      {p.subscriptionName}
                    </span>
                    <span className="text-muted-foreground text-[0.75rem]">
                      {formatDate(p.paymentDate)} · {p.paymentMethod}
                    </span>
                  </div>
                  <span className="text-primary shrink-0 text-[0.88rem] font-bold whitespace-nowrap">
                    €{p.amount.toFixed(0)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
