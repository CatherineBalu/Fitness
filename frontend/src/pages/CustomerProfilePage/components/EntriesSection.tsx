import QrAccessPanel from '@/components/common/QrAccessPanel';

import { formatDate } from '../customerProfileHelpers';

import type { CustomerEntries, GenerateTokenResponse } from '@/hooks/useEntry';
import type { UseMutationResult } from '@tanstack/react-query';

interface EntriesSectionProps {
  entries: CustomerEntries | null;
  generateToken: Pick<
    UseMutationResult<GenerateTokenResponse, Error, void>,
    'mutate' | 'isPending'
  >;
  closeUserProfile: () => void;
  onEntryQrVisibilityChange: (open: boolean) => void;
  closeEntryQr: boolean;
}

export default function EntriesSection({
  entries,
  generateToken,
  closeUserProfile,
  onEntryQrVisibilityChange,
  closeEntryQr,
}: EntriesSectionProps) {
  return (
    <section className="flex flex-col gap-3">
      <p className="text-primary mb-0.5 text-[0.72rem] font-bold tracking-[0.12em] uppercase">
        Access
      </p>
      <h2 className="text-foreground mb-2.5 text-[1.1rem] font-extrabold">
        Gym Entries
      </h2>

      <div className="border-border bg-secondary flex flex-col gap-3 rounded-xl border px-5 py-[18px]">
        <div className="flex items-center justify-between gap-3">
          <span className="text-foreground text-base font-bold">
            Entry Balance
          </span>
          <span className="text-primary text-[1.1rem] font-extrabold">
            {entries?.entryBalance ?? 0}{' '}
            <span className="text-muted-foreground text-[0.8rem] font-normal">
              {(entries?.entryBalance ?? 0) === 1 ? 'entry' : 'entries'}
            </span>
          </span>
        </div>

        {entries && entries.credits.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <p className="text-muted-foreground text-[0.72rem] font-bold tracking-[0.1em] uppercase">
              Validity
            </p>
            {entries.credits.map((credit) => (
              <div
                key={credit.expiresAt}
                className="text-muted-foreground flex items-center justify-between text-[0.78rem]"
              >
                <span>
                  {credit.remainingCount}{' '}
                  {credit.remainingCount === 1 ? 'entry' : 'entries'}
                </span>
                <span>expire {formatDate(credit.expiresAt)}</span>
              </div>
            ))}
          </div>
        )}

        {entries && entries.logs.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <p className="text-muted-foreground text-[0.72rem] font-bold tracking-[0.1em] uppercase">
              Recent visits
            </p>
            {entries.logs.slice(0, 5).map((log) => (
              <div
                key={log.id}
                className="text-muted-foreground flex items-center justify-between text-[0.78rem]"
              >
                <span>{formatDate(log.scannedAt)}</span>
                <span>{log.staffName}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <a
            href="/#pricing"
            onClick={() => closeUserProfile()}
            className="border-border text-foreground hover:border-primary hover:text-primary cursor-pointer rounded-lg border bg-transparent py-2 text-center text-[0.82rem] font-semibold transition-colors"
          >
            Buy entries
          </a>
          <QrAccessPanel
            mutation={generateToken}
            disabled={(entries?.entryBalance ?? 0) === 0}
            onVisibilityChange={onEntryQrVisibilityChange}
            forceClose={closeEntryQr}
          />
        </div>
      </div>
    </section>
  );
}
