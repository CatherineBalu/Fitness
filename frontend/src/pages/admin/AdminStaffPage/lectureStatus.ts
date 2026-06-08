export const STATUS_DOT_CLASSES: Record<string, string> = {
  available: 'bg-success',
  'almost-full': 'bg-warning',
  full: 'bg-destructive',
};

export function getLectureStatus(
  registered: number,
  capacity: number,
): 'available' | 'almost-full' | 'full' {
  const ratio = registered / capacity;
  if (ratio >= 1) return 'full';
  if (ratio >= 0.7) return 'almost-full';
  return 'available';
}

export function formatLectureTime(startIso: string, endIso: string): string {
  const fmt = (d: Date) =>
    `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
  return `${fmt(new Date(startIso))} - ${fmt(new Date(endIso))}`;
}
