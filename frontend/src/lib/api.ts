import { useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';

const API_URL = import.meta.env.VITE_API_URL as string;

export function useApi() {
  const { getToken } = useAuth();

  const apiRequest = useCallback(
    async <T>(url: string, options: RequestInit = {}): Promise<T> => {
      const token = await getToken();
      const res = await fetch(`${API_URL}${url}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...options.headers,
        },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const message =
          (body as { error?: string })?.error ?? `API error ${res.status}`;
        throw new Error(message);
      }
      return res.json() as Promise<T>;
    },
    [getToken],
  );

  return { apiRequest };
}
