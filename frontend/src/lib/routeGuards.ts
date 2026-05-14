import { redirect } from '@tanstack/react-router';

import { can, type Permission } from '@/lib/permissions';

declare global {
  interface Window {
    Clerk?: {
      user?: {
        publicMetadata?: Record<string, unknown>;
      };
    };
  }
}

export function getRole(): string | null {
  return (
    (window.Clerk?.user?.publicMetadata as { role?: string })?.role ?? null
  );
}

export function requireAuth(): void {
  if (!window.Clerk?.user) throw redirect({ to: '/' });
}

export function requirePermission(permission: Permission): () => void {
  return function () {
    if (!window.Clerk?.user) throw redirect({ to: '/' });
    if (!can(getRole(), permission)) throw redirect({ to: '/' });
  };
}
