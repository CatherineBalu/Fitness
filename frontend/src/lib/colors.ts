// Dark-theme color constants — mirrors the CSS variables in index.css.
// Use semantic Tailwind tokens (bg-primary, text-foreground, etc.) in JSX.
// These raw hex values are only needed for APIs that cannot accept CSS variables (e.g. Clerk).
export const colors = {
  background: '#0d0d0d',
  card: '#161616',
  secondary: '#1e1e1e',
  border: '#2a2a2a',
  foreground: '#e5e5e5',
  mutedForeground: '#888888',
  primary: '#aacc00',
  primaryForeground: '#0d0d0d',
  white: '#ffffff',
  destructive: '#ef4444',
} as const;
