export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatBillingCycle(
  price: number,
  durationDays: number,
): string {
  if (durationDays <= 30) return '';
  const total = `€${price.toFixed(0)}`;
  if (durationDays >= 365) return ` · billed ${total} / year`;
  const months = Math.round(durationDays / 30);
  return ` · billed ${total} every ${months} months`;
}
