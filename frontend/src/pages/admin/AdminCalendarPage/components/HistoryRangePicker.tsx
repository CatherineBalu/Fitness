import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface HistoryRangePickerProps {
  historyFrom: string;
  historyTo: string;
  maxDate: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  onLoadRange: () => void;
  onLoadAll: () => void;
}

export default function HistoryRangePicker({
  historyFrom,
  historyTo,
  maxDate,
  onFromChange,
  onToChange,
  onLoadRange,
  onLoadAll,
}: HistoryRangePickerProps) {
  return (
    <div className="border-border bg-card/50 mt-4 mb-2 flex flex-col items-end gap-4 rounded-lg border p-4 sm:flex-row">
      <div className="flex w-full flex-col gap-1 sm:w-auto">
        <label className="text-muted-foreground text-xs">From Date</label>
        <Input
          type="date"
          value={historyFrom}
          max={maxDate}
          onChange={(e) => onFromChange(e.target.value)}
          className="border-border bg-background text-sm"
        />
      </div>
      <div className="flex w-full flex-col gap-1 sm:w-auto">
        <label className="text-muted-foreground text-xs">To Date</label>
        <Input
          type="date"
          value={historyTo}
          max={maxDate}
          onChange={(e) => onToChange(e.target.value)}
          className="border-border bg-background text-sm"
        />
      </div>
      <Button
        onClick={onLoadRange}
        className="bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto"
      >
        Load Range
      </Button>
      <Button
        onClick={onLoadAll}
        variant="outline"
        className="border-border bg-card text-foreground hover:bg-secondary w-full sm:w-auto"
      >
        Load All History
      </Button>
    </div>
  );
}
