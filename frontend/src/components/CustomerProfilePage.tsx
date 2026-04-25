import { useEffect, useState } from 'react';
import { useApi } from '@/lib/api';
import './CustomerProfilePage.css';

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
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirmUnregister, setConfirmUnregister] = useState<string | null>(null);
  const [unregistering, setUnregistering] = useState(false);

  useEffect(() => {
    Promise.all([
      apiRequest<ProfileData>('/api/customer/me'),
      apiRequest<Registration[]>('/api/customer/registrations'),
      apiRequest<SpendingData>('/api/customer/spending'),
    ])
      .then(([p, r, s]) => {
        setProfile(p);
        setRegistrations(r);
        setSpending(s);
      })
      .finally(() => setLoading(false));
  }, [apiRequest]);

  async function handleUnregister(scheduleId: string) {
    setUnregistering(true);
    try {
      await apiRequest(`/schedule/${scheduleId}/reservations`, { method: 'DELETE' });
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
    return <div className="cp-loading">Loading your profile…</div>;
  }

  const upcoming = registrations.filter(
    (r) => new Date(r.startTime) >= new Date(),
  );
  const past = registrations.filter((r) => new Date(r.startTime) < new Date());

  return (
    <div className="cp-root">
      {/* ── Membership ── */}
      <section className="cp-section">
        <p className="cp-section-label">Account</p>
        <h2 className="cp-section-title">Membership</h2>

        {profile?.membership ? (
          <div
            className={`cp-membership-card ${
              profile.membership.isActive
                ? 'cp-membership-card--active'
                : 'cp-membership-card--expired'
            }`}
          >
            <div className="cp-membership-header">
              <span className="cp-membership-name">
                {profile.membership.name}
              </span>
              <span
                className={`cp-badge ${
                  profile.membership.isActive
                    ? 'cp-badge--active'
                    : 'cp-badge--expired'
                }`}
              >
                {profile.membership.isActive ? 'Active' : 'Expired'}
              </span>
            </div>

            <div className="cp-membership-meta">
              <p className="cp-membership-meta-row">
                Valid until:{' '}
                <span>{formatDate(profile.membership.validUntil)}</span>
              </p>
              <p className="cp-membership-meta-row">
                Price:{' '}
                <span>
                  {profile.membership.price} CZK /{' '}
                  {profile.membership.durationDays} days
                </span>
              </p>
            </div>

            {!confirmCancel ? (
              <button
                className="cp-cancel-btn"
                onClick={() => setConfirmCancel(true)}
              >
                Cancel membership
              </button>
            ) : (
              <div className="cp-confirm-box">
                <p className="cp-confirm-text">
                  Your membership will be cancelled immediately. You'll lose
                  access to members-only classes.
                </p>
                <div className="cp-confirm-actions">
                  <button
                    className="cp-btn-ghost"
                    onClick={() => setConfirmCancel(false)}
                  >
                    Keep it
                  </button>
                  <button
                    className="cp-btn-danger"
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
          <p className="cp-membership-empty">No active membership.</p>
        )}
      </section>

      {/* ── Registered lectures ── */}
      <section className="cp-section">
        <p className="cp-section-label">Schedule</p>
        <h2 className="cp-section-title">Registered Lectures</h2>

        {registrations.length === 0 ? (
          <p className="cp-empty">No registrations yet.</p>
        ) : (
          <div className="cp-list">
            {upcoming.length > 0 && (
              <>
                <p className="cp-sub-label">Upcoming</p>
                {upcoming.map((r) => (
                  <div key={r.reservationId} className="cp-row cp-row--interactive">
                    <div className="cp-row-info">
                      <span className="cp-row-name">{r.lectureName}</span>
                      <span className="cp-row-meta">
                        {formatDate(r.startTime)} · {formatTime(r.startTime)}–
                        {formatTime(r.endTime)} · {r.roomName}
                      </span>
                    </div>
                    {confirmUnregister === r.scheduleId ? (
                      <div className="cp-unregister-confirm">
                        <span className="cp-unregister-confirm-text">Cancel this?</span>
                        <button
                          className="cp-btn-ghost cp-btn-small"
                          onClick={() => setConfirmUnregister(null)}
                        >
                          Keep
                        </button>
                        <button
                          className="cp-btn-danger cp-btn-small"
                          onClick={() => handleUnregister(r.scheduleId)}
                          disabled={unregistering}
                        >
                          {unregistering ? '…' : 'Yes'}
                        </button>
                      </div>
                    ) : (
                      <button
                        className="cp-unregister-btn"
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
                <p className="cp-sub-label">Past</p>
                {past.map((r) => (
                  <div key={r.reservationId} className="cp-row cp-row--past">
                    <div className="cp-row-info">
                      <span className="cp-row-name">{r.lectureName}</span>
                      <span className="cp-row-meta">
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
      <section className="cp-section">
        <p className="cp-section-label">Finances</p>
        <h2 className="cp-section-title">Spending</h2>

        {!spending || spending.payments.length === 0 ? (
          <p className="cp-empty">No payments yet.</p>
        ) : (
          <>
            <div className="cp-spending-total">
              <span className="cp-spending-total-label">Total spent</span>
              <span className="cp-spending-total-amount">
                {spending.total.toFixed(0)} CZK
              </span>
            </div>
            <div className="cp-list">
              {spending.payments.map((p) => (
                <div key={p.id} className="cp-row">
                  <div className="cp-row-info">
                    <span className="cp-row-name">{p.subscriptionName}</span>
                    <span className="cp-row-meta">
                      {formatDate(p.paymentDate)} · {p.paymentMethod}
                    </span>
                  </div>
                  <span className="cp-row-value">
                    {p.amount.toFixed(0)} CZK
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
