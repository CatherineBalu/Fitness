import { useClerk } from '@clerk/clerk-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { authKeys } from '@/hooks/useAuthProfile';
import {
  useCustomerEntries,
  useGenerateMembershipQrToken,
  useGenerateQrToken,
} from '@/hooks/useEntry';
import {
  customerRegistrationsKey,
  useUnregisterReservation,
} from '@/hooks/useReservations';
import { apiClient } from '@/lib/apiClient';

import EntriesSection from './components/EntriesSection';
import LecturesSection from './components/LecturesSection';
import MembershipSection from './components/MembershipSection';
import SpendingSection from './components/SpendingSection';

import type { ProfileData, Registration, SpendingData } from './customerProfile.types';

const customerMeKey = ['customer', 'me'] as const;
const customerSpendingKey = ['customer', 'spending'] as const;

export default function CustomerProfilePage() {
  const qc = useQueryClient();
  const { closeUserProfile } = useClerk();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmUnregister, setConfirmUnregister] = useState<string | null>(null);
  const [entryQrOpen, setEntryQrOpen] = useState(false);
  const [membershipQrOpen, setMembershipQrOpen] = useState(false);
  const qrOpen = entryQrOpen || membershipQrOpen;

  const [openingEntryBalance, setOpeningEntryBalance] = useState<number | null>(null);

  function handleEntryQrVisibilityChange(open: boolean) {
    setOpeningEntryBalance(
      open ? (entriesQuery.data?.entryBalance ?? null) : null,
    );
    setEntryQrOpen(open);
  }

  function handleMembershipQrVisibilityChange(open: boolean) {
    setMembershipQrOpen(open);
  }

  const generateToken = useGenerateQrToken();
  const generateMembershipToken = useGenerateMembershipQrToken();

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
  const entriesQuery = useCustomerEntries({
    refetchInterval: qrOpen ? 2000 : false,
  });

  const currentEntryBalance = entriesQuery.data?.entryBalance ?? null;
  const closeEntryQr =
    entryQrOpen &&
    openingEntryBalance !== null &&
    currentEntryBalance !== null &&
    currentEntryBalance < openingEntryBalance;

  const closeMembershipQr =
    membershipQrOpen && (entriesQuery.data?.membershipEnteredToday ?? false);

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
    spendingQuery.isLoading ||
    entriesQuery.isLoading;

  const error =
    profileQuery.error ??
    registrationsQuery.error ??
    spendingQuery.error ??
    entriesQuery.error;

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
  const entries = entriesQuery.data ?? null;

  const upcoming = registrations.filter(
    (r) => new Date(r.startTime) >= new Date(),
  );
  const past = registrations.filter((r) => new Date(r.startTime) < new Date());

  return (
    <div className="text-foreground flex flex-col gap-8 pt-1 pb-4">
      <MembershipSection
        membership={profile?.membership ?? null}
        entries={entries}
        generateMembershipToken={generateMembershipToken}
        confirmCancel={confirmCancel}
        setConfirmCancel={setConfirmCancel}
        cancelMembership={cancelMembership}
        onMembershipQrVisibilityChange={handleMembershipQrVisibilityChange}
        closeMembershipQr={closeMembershipQr}
      />

      <EntriesSection
        entries={entries}
        generateToken={generateToken}
        closeUserProfile={closeUserProfile}
        onEntryQrVisibilityChange={handleEntryQrVisibilityChange}
        closeEntryQr={closeEntryQr}
      />

      <LecturesSection
        upcoming={upcoming}
        past={past}
        unregister={unregister}
        confirmUnregister={confirmUnregister}
        setConfirmUnregister={setConfirmUnregister}
      />

      <SpendingSection spending={spending} />
    </div>
  );
}
