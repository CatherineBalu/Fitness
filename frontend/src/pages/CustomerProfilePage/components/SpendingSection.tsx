import { formatDate } from '../customerProfileHelpers';

import type { SpendingData } from '../customerProfile.types';

export default function SpendingSection({ spending }: { spending: SpendingData | null }) {
  return (
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
                  <span className="flex items-center gap-2">
                    <span className="text-foreground overflow-hidden text-[0.88rem] font-semibold text-ellipsis whitespace-nowrap">
                      {p.subscriptionName}
                    </span>
                    <span className="border-border text-muted-foreground shrink-0 rounded-full border px-2 py-0.5 text-[0.62rem] font-bold tracking-[0.06em] uppercase">
                      {p.kind === 'entry' ? 'Entries' : 'Membership'}
                    </span>
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
  );
}
