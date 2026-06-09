import { useAuth, useUser } from '@clerk/clerk-react';
import { Outlet } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { Toaster } from 'sonner';

import Footer from '@/components/layout/Footer';
import Navbar from '@/components/layout/Navbar';
import { apiClient } from '@/lib/apiClient';

export default function RootLayout() {
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const role = (user?.publicMetadata as { role?: string })?.role ?? null;

  const bootstrappedRef = useRef(false);

  useEffect(() => {
    if (!isSignedIn || !user || role || bootstrappedRef.current) return;
    bootstrappedRef.current = true;
    void (async () => {
      try {
        await apiClient('/auth/profile');
      } catch {
        // bootstrap failure is non-fatal — user still loads with no role
      }
      try {
        await user.reload();
      } catch {
        // reload failure is non-fatal
      }
    })();
  }, [isSignedIn, user, role]);

  return (
    <div className="bg-background text-foreground min-h-svh">
      <Navbar />
      <Outlet />
      <Footer />
      <Toaster theme="dark" position="bottom-right" richColors />
    </div>
  );
}
