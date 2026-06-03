import { redirect } from '@tanstack/react-router';

import { can, type Permission } from '@/lib/permissions';

declare global {
  interface Window {
    Clerk?: {
      loaded?: boolean;
      user?: {
        publicMetadata?: Record<string, unknown>;
      };
    };
  }
}

function waitForClerk(): Promise<void> {
  if (window.Clerk?.loaded) return Promise.resolve();
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      if (window.Clerk?.loaded) {
        clearInterval(interval);
        resolve();
      }
    }, 30);
  });
}

export function getRole(): string | null {
  return (
    (window.Clerk?.user?.publicMetadata as { role?: string })?.role ?? null
  );
}

export async function requireAuth(): Promise<void> {
  await waitForClerk();
  if (!window.Clerk?.user) throw redirect({ to: '/' });
}

export function requirePermission(permission: Permission): () => Promise<void> {
  return async function () {
    await waitForClerk();
    if (!window.Clerk?.user) throw redirect({ to: '/' });
    if (!can(getRole(), permission)) throw redirect({ to: '/' });
  };
}
