import { clerk } from '../middleware/auth';

export async function getEmailsByClerkIds(clerkIds: string[]): Promise<Map<string, string | null>> {
  const unique = Array.from(new Set(clerkIds.filter((id) => !!id)));
  if (unique.length === 0) return new Map();

  try {
    const result = await clerk.users.getUserList({ userId: unique, limit: unique.length });
    const map = new Map<string, string | null>();
    for (const u of result.data) {
      const primary =
        u.emailAddresses.find((e) => e.id === u.primaryEmailAddressId)?.emailAddress ?? null;
      map.set(u.id, primary);
    }
    return map;
  } catch (err) {
    console.error('[clerk] Failed to fetch user emails', err);
    return new Map();
  }
}
