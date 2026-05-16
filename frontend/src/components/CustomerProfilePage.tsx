import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';
import { useApi } from '@/lib/api';

interface Membership {
  name: string;
  price: number;
  durationDays: number;
  validUntil: string;
  isActive: boolean;
}

interface ProfileData {
  name: string;
  surname: string;
  email: string;
  phoneNumber: string | null;
  membership: Membership | null;
}

interface Registration {
  reservationId: string;
  scheduleId: string;
  lectureName: string;
  startTime: string;
  endTime: string;
  roomName: string;
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
  const { apiRequest } = useApi();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [spending, setSpending] = useState<SpendingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirmUnregister, setConfirmUnregister] = useState<string | null>(null);
  const [unregistering, setUnregistering] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiRequest<ProfileData>('/api/customer/me'),
      apiRequest<Registration[]>('/api/customer/registrations'),
      apiRequest<SpendingData>('/api/customer/spending'),
    ])
      .then(([p, r, s]) => {
        if (cancelled) return;
        setProfile(p);
        setRegistrations(r);
        setSpending(s);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiRequest]);

  async function handleUnregister(scheduleId: string) {
    setUnregistering(true);
    try {
      await apiRequest(`/schedule/${scheduleId}/reservations`, {
        method: 'DELETE',
      });
      setRegistrations((prev) => prev.filter((r) => r.scheduleId !== scheduleId));
      setConfirmUnregister(null);
      window.dispatchEvent(new CustomEvent('schedule:invalidated'));
    } finally {
      setUnregistering(false);
    }
  }

  async function handleCancelMembership() {
    setCancelling(true);
    try {
      await apiRequest('/api/customer/membership', { method: 'DELETE' });
      setProfile((prev) => (prev ? { ...prev, membership: null } : prev));
      setConfirmCancel(false);
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return <div className="py-4 text-[0.85rem] text-muted-foreground">Loading your profile…</div>;
  }

  if (error) {
    return <div className="py-4 text-[0.85rem] text-muted-foreground">Failed to load profile: {error}</div>;
  }

  const upcoming = registrations.filter((r) => new Date(r.startTime) >= new Date());
  const past = registrations.filter((r) => new Date(r.startTime) < new Date());

  return (
    <div className="flex flex-col gap-8 pb-4 pt-1 text-foreground">
      {/* ── Membership ── */}
      <section className="flex flex-col gap-3">
        <p className="mb-0.5 text-[0.72rem] font-bold uppercase tracking-[0.12em] text-primary">Account</p>
        <h2 className="mb-2.5 text-[1.1rem] font-extrabold text-foreground">Membership</h2>

        {profile?.membership ? (
          <div
            className={cn(
              'flex flex-col gap-3 rounded-xl border border-border bg-secondary px-5 py-[18px] transition-colors',
              profile.membership.isActive ? 'border-primary' : 'opacity-70',
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-base font-bold text-foreground">{profile.membership.name}</span>
              <span
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-[0.7rem] font-bold uppercase tracking-[0.08em]',
                  profile.membership.isActive
                    ? 'border border-primary/30 bg-primary/15 text-primary'
                    : 'border border-border bg-muted text-muted-foreground',
                )}
              >
                {profile.membership.isActive ? 'Active' : 'Expired'}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <p className="text-[0.8rem] text-muted-foreground">
                Valid until:{' '}
                <span className="font-medium text-foreground">{formatDate(profile.membership.validUntil)}</span>
              </p>
              <p className="text-[0.8rem] text-muted-foreground">
                Price:{' '}
                <span className="font-medium text-foreground">
                  €{(profile.membership.price / (profile.membership.durationDays / 30)).toFixed(0)} / month
                  {profile.membership.durationDays > 30
                    ? ` · billed €${profile.membership.price.toFixed(0)} / year`
                    : ''}
                </span>
              </p>
            </div>

            {!confirmCancel ? (
              <button
                className="inline-flex cursor-pointer self-start items-center gap-1.5 rounded-lg border border-red-500/25 bg-red-500/[8%] px-3.5 py-1.5 text-[0.8rem] font-semibold text-red-500 transition-colors hover:border-red-500/50 hover:bg-red-500/15"
                onClick={() => setConfirmCancel(true)}
              >
                Cancel membership
              </button>
            ) : (
              <div className="flex flex-col gap-2.5 rounded-[10px] border border-red-500/20 bg-red-500/[6%] px-4 py-3.5">
                <p className="text-[0.82rem] leading-[1.5] text-muted-foreground">
                  Your membership will be cancelled immediately. You'll lose access to members-only classes.
                </p>
                <div className="flex gap-2">
                  <button
                    className="cursor-pointer rounded-lg border border-border bg-transparent px-3.5 py-1.5 text-[0.8rem] font-semibold text-muted-foreground transition-colors hover:border-muted-foreground hover:text-foreground"
                    onClick={() => setConfirmCancel(false)}
                  >
                    Keep it
                  </button>
                  <button
                    className="cursor-pointer rounded-lg bg-red-500 px-3.5 py-1.5 text-[0.8rem] font-bold text-[#0d0d0d] transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={handleCancelMembership}
                    disabled={cancelling}
                  >
                    {cancelling ? 'Cancelling…' : 'Yes, cancel'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="rounded-xl border border-border bg-secondary px-5 py-[18px] text-[0.85rem] text-muted-foreground">
            No active membership.
          </p>
        )}
      </section>

      {/* ── Registered lectures ── */}
      <section className="flex flex-col gap-3">
        <p className="mb-0.5 text-[0.72rem] font-bold uppercase tracking-[0.12em] text-primary">Schedule</p>
        <h2 className="mb-2.5 text-[1.1rem] font-extrabold text-foreground">Registered Lectures</h2>

        {registrations.length === 0 ? (
          <p className="py-3 text-[0.82rem] text-muted-foreground">No registrations yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {upcoming.length > 0 && (
              <>
                <p className="mb-1 mt-2 text-[0.72rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Upcoming
                </p>
                {upcoming.map((r) => (
                  <div key={r.reservationId} className="flex items-center justify-between gap-3 rounded-[10px] border border-border bg-secondary px-4 py-3">
                    <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                      <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[0.88rem] font-semibold text-foreground">
                        {r.lectureName}
                      </span>
                      <span className="text-[0.75rem] text-muted-foreground">
                        {formatDate(r.startTime)} · {formatTime(r.startTime)}–{formatTime(r.endTime)} · {r.roomName}
                      </span>
                    </div>
                    {confirmUnregister === r.scheduleId ? (
                      <div className="flex shrink-0 items-center gap-1.5">
                        <span className="whitespace-nowrap text-[0.75rem] text-muted-foreground">Cancel this?</span>
                        <button
                          className="cursor-pointer rounded-lg border border-border bg-transparent px-2.5 py-1 text-[0.75rem] font-semibold text-muted-foreground transition-colors hover:border-muted-foreground hover:text-foreground"
                          onClick={() => setConfirmUnregister(null)}
                        >
                          Keep
                        </button>
                        <button
                          className="cursor-pointer rounded-lg bg-red-500 px-2.5 py-1 text-[0.75rem] font-bold text-[#0d0d0d] transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={() => handleUnregister(r.scheduleId)}
                          disabled={unregistering}
                        >
                          {unregistering ? '…' : 'Yes'}
                        </button>
                      </div>
                    ) : (
                      <button
                        className="shrink-0 cursor-pointer rounded-[7px] border border-red-500/25 bg-red-500/[8%] px-3 py-1 text-[0.75rem] font-semibold text-red-500 transition-colors hover:border-red-500/50 hover:bg-red-500/15"
                        onClick={() => setConfirmUnregister(r.scheduleId)}
                      >
                        Unregister
                      </button>
                    )}
                  </div>
                ))}
              </>
            )}
            {past.length > 0 && (
              <>
                <p className="mb-1 mt-2 text-[0.72rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Past
                </p>
                {past.map((r) => (
                  <div key={r.reservationId} className="flex items-center justify-between gap-3 rounded-[10px] border border-border bg-secondary px-4 py-3 opacity-50">
                    <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                      <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[0.88rem] font-semibold text-foreground">
                        {r.lectureName}
                      </span>
                      <span className="text-[0.75rem] text-muted-foreground">
                        {formatDate(r.startTime)} · {formatTime(r.startTime)}–{formatTime(r.endTime)} · {r.roomName}
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
        <p className="mb-0.5 text-[0.72rem] font-bold uppercase tracking-[0.12em] text-primary">Finances</p>
        <h2 className="mb-2.5 text-[1.1rem] font-extrabold text-foreground">Spending</h2>

        {!spending || spending.payments.length === 0 ? (
          <p className="py-3 text-[0.82rem] text-muted-foreground">No payments yet.</p>
        ) : (
          <>
            <div className="mb-2 flex items-center justify-between rounded-[10px] border border-primary/20 bg-primary/[6%] px-4 py-2.5 text-[0.85rem]">
              <span className="font-semibold text-foreground">Total spent</span>
              <span className="text-base font-extrabold text-primary">€{spending.total.toFixed(0)}</span>
            </div>
            <div className="flex flex-col gap-2">
              {spending.payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 rounded-[10px] border border-border bg-secondary px-4 py-3">
                  <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                    <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[0.88rem] font-semibold text-foreground">
                      {p.subscriptionName}
                    </span>
                    <span className="text-[0.75rem] text-muted-foreground">
                      {formatDate(p.paymentDate)} · {p.paymentMethod}
                    </span>
                  </div>
                  <span className="shrink-0 whitespace-nowrap text-[0.88rem] font-bold text-primary">
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
