/** Format a numeric-string price as euros. `decimals` defaults to 2 (cents); pass 0 for whole euros. */
export function formatPrice(price: string, decimals = 2): string {
  const num = Number(price);
  return Number.isFinite(num) ? `€${num.toFixed(decimals)}` : `€${price}`;
}

/** Initials from a name. Uses first+last when a surname is present, else the first two letters. */
export function getInitials(first: string, last: string): string {
  if (last) return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();
  return first.slice(0, 2).toUpperCase();
}
