import QrAccessPanel from '@/components/common/QrAccessPanel';
import { cn } from '@/lib/utils';

import { formatDate, formatBillingCycle } from '../customerProfileHelpers';

import type { Membership } from '../customerProfile.types';
import type { CustomerEntries } from '@/hooks/useEntry';
import type { GenerateTokenResponse } from '@/hooks/useEntry';
import type { UseMutationResult } from '@tanstack/react-query';

interface MembershipSectionProps {
  membership: Membership | null;
  entries: CustomerEntries | null;
  generateMembershipToken: Pick<
    UseMutationResult<GenerateTokenResponse, Error, void>,
    'mutate' | 'isPending'
  >;
  confirmCancel: boolean;
  setConfirmCancel: (v: boolean) => void;
  cancelMembership: { mutate: () => void; isPending: boolean };
  onMembershipQrVisibilityChange: (open: boolean) => void;
  closeMembershipQr: boolean;
}

export default function MembershipSection({
  membership,
  entries,
  generateMembershipToken,
  confirmCancel,
  setConfirmCancel,
  cancelMembership,
  onMembershipQrVisibilityChange,
  closeMembershipQr,
}: MembershipSectionProps) {
  return (
    <section className="flex flex-col gap-3">
      <p className="text-primary mb-0.5 text-[0.72rem] font-bold tracking-[0.12em] uppercase">
        Account
      </p>
      <h2 className="text-foreground mb-2.5 text-[1.1rem] font-extrabold">
        Membership
      </h2>

      {membership ? (
        <div
          className={cn(
            'border-border bg-secondary flex flex-col gap-3 rounded-xl border px-5 py-[18px] transition-colors',
            membership.isActive ? 'border-primary' : 'opacity-70',
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-foreground text-base font-bold">
              {membership.name}
            </span>
            <span
              className={cn(
                'rounded-full px-2.5 py-0.5 text-[0.7rem] font-bold tracking-[0.08em] uppercase',
                membership.isActive
                  ? 'border-primary/30 bg-primary/15 text-primary border'
                  : 'border-border bg-muted text-muted-foreground border',
              )}
            >
              {membership.isActive ? 'Active' : 'Expired'}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <p className="text-muted-foreground text-[0.8rem]">
              Valid until:{' '}
              <span className="text-foreground font-medium">
                {formatDate(membership.validUntil)}
              </span>
            </p>
            <p className="text-muted-foreground text-[0.8rem]">
              Price:{' '}
              <span className="text-foreground font-medium">
                €
                {(membership.price / (membership.durationDays / 30)).toFixed(0)}{' '}
                / month
                {formatBillingCycle(membership.price, membership.durationDays)}
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

          {membership.isActive && (
            <div className="border-border mt-1 flex flex-col gap-2 border-t pt-3">
              <QrAccessPanel
                mutation={generateMembershipToken}
                disabled={entries?.membershipEnteredToday ?? false}
                triggerLabel="Show entry QR"
                instruction="Daily gym entry — show this to staff"
                onVisibilityChange={onMembershipQrVisibilityChange}
                forceClose={closeMembershipQr}
              />
              {entries?.membershipEnteredToday && (
                <p className="text-muted-foreground text-center text-[0.75rem]">
                  You've already used today's entry. Come back tomorrow.
                </p>
              )}
            </div>
          )}
        </div>
      ) : (
        <p className="border-border bg-secondary text-muted-foreground rounded-xl border px-5 py-[18px] text-[0.85rem]">
          No active membership.
        </p>
      )}
    </section>
  );
}
