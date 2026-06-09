import ContactIcons from '@/components/common/ContactIcons';

import { formatDate, formatTime } from '../customerProfileHelpers';

import type { Registration } from '../customerProfile.types';
import type { UseMutationResult } from '@tanstack/react-query';

interface LecturesSectionProps {
  upcoming: Registration[];
  past: Registration[];
  unregister: Pick<
    UseMutationResult<void, Error, string>,
    'mutate' | 'isPending'
  >;
  confirmUnregister: string | null;
  setConfirmUnregister: (id: string | null) => void;
}

export default function LecturesSection({
  upcoming,
  past,
  unregister,
  confirmUnregister,
  setConfirmUnregister,
}: LecturesSectionProps) {
  const hasAny = upcoming.length > 0 || past.length > 0;

  const handleUnregister = (scheduleId: string) => {
    unregister.mutate(scheduleId, {
      onSuccess: () => setConfirmUnregister(null),
    });
  };

  return (
    <section className="flex flex-col gap-3">
      <p className="text-primary mb-0.5 text-[0.72rem] font-bold tracking-[0.12em] uppercase">
        Schedule
      </p>
      <h2 className="text-foreground mb-2.5 text-[1.1rem] font-extrabold">
        Registered Lectures
      </h2>

      {!hasAny ? (
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
                            email={primary.email}
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
  );
}
