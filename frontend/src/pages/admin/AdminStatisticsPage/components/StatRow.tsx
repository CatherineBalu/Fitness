interface StatRowProps {
  label: string;
  value: string;
  meta?: string;
  rank?: number;
}

export default function StatRow({ label, value, meta, rank }: StatRowProps) {
  return (
    <div className="border-border bg-card hover:border-primary flex items-center gap-4 rounded-lg border px-4 py-3 transition-colors">
      {rank !== undefined && (
        <span className="text-primary min-w-7 text-sm font-bold">#{rank}</span>
      )}
      <span className="text-foreground min-w-0 flex-1 truncate text-sm font-semibold">
        {label}
      </span>
      {meta && (
        <span className="text-muted-foreground text-xs whitespace-nowrap">
          {meta}
        </span>
      )}
      <span className="border-border bg-secondary text-foreground rounded-full border px-3 py-0.5 text-sm font-bold whitespace-nowrap">
        {value}
      </span>
    </div>
  );
}
