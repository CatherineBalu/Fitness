import { useAuth, useUser, SignInButton, UserButton } from '@clerk/clerk-react';
import { Link, Outlet, useRouterState } from '@tanstack/react-router';
import { MapPin, Phone, Mail, Clock, UserCircle, Menu, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Toaster } from 'sonner';

import ThemeToggle from '@/components/common/ThemeToggle';
import CustomerProfilePage from '@/components/CustomerProfilePage';
import { Button } from '@/components/ui/button';
import { useApi } from '@/lib/api';
import { can } from '@/lib/permissions';
import { cn } from '@/lib/utils';

import logoImg from '../assets/logo.png';

const SocialIcon = ({ d }: { d: string }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
);

const FACEBOOK_PATH =
  'M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z';
const INSTAGRAM_PATH =
  'M7 2C4.24 2 2 4.24 2 7v10c0 2.76 2.24 5 5 5h10c2.76 0 5-2.24 5-5V7c0-2.76-2.24-5-5-5H7zm10 2c1.66 0 3 1.34 3 3v10c0 1.66-1.34 3-3 3H7c-1.66 0-3-1.34-3-3V7c0-1.66 1.34-3 3-3h10zm1.5 1.5a1 1 0 100 2 1 1 0 000-2zM12 7a5 5 0 100 10 5 5 0 000-10zm0 2a3 3 0 110 6 3 3 0 010-6z';
const YOUTUBE_PATH =
  'M21.6 7.2a2.5 2.5 0 00-1.76-1.77C18.27 5 12 5 12 5s-6.27 0-7.84.43A2.5 2.5 0 002.4 7.2C2 8.78 2 12 2 12s0 3.22.4 4.8a2.5 2.5 0 001.76 1.77C5.73 19 12 19 12 19s6.27 0 7.84-.43a2.5 2.5 0 001.76-1.77C22 15.22 22 12 22 12s0-3.22-.4-4.8zM10 15V9l5 3-5 3z';
const TIKTOK_PATH =
  'M19.6 6.32a5.6 5.6 0 01-3.36-1.12 5.6 5.5 0 01-2.24-3.2H10.4v13.12a2.56 2.56 0 11-2.56-2.56c.28 0 .55.05.8.13V9.36a6 6 0 00-.8-.06 5.92 5.92 0 105.92 5.92V9.6a8 8 0 005.84 2.24V8.4a5.4 5.4 0 01-1.6-.16 5.6 5.6 0 01-1.4-.92z';

const navLinkClass =
  'border-b border-border py-2 text-xs-plus text-muted-foreground no-underline transition-colors hover:text-foreground sm:border-none sm:py-0 sm:text-[15px]';

export default function RootLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const role = (user?.publicMetadata as { role?: string })?.role ?? null;

  const { apiRequest } = useApi();
  const bootstrappedRef = useRef(false);

  useEffect(() => {
    if (!isSignedIn || !user || role || bootstrappedRef.current) return;
    bootstrappedRef.current = true;
    void (async () => {
      try {
        await apiRequest('/auth/profile');
      } catch {
        // bootstrap failure is non-fatal — user still loads with no role
      }
      try {
        await user.reload();
      } catch {
        // reload failure is non-fatal
      }
    })();
  }, [isSignedIn, user, role, apiRequest]);

  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAdminPath =
    pathname.startsWith('/admin') || pathname.startsWith('/staff/');

  const isAdmin = role === 'admin';
  const isStaff = role === 'employee';

  const mode: 'public' | 'staff' | 'admin' = isStaff
    ? 'staff'
    : isAdmin && isAdminPath
      ? 'admin'
      : 'public';

  const canSeeAdminStats = can(role, 'stats:admin');
  const canSeeStaffStats = can(role, 'stats:staff');

  const closeMenu = () => setMenuOpen(false);

  const logoTarget = mode === 'public' ? '/' : '/admin';

  const mobileDropdown =
    'absolute inset-x-0 top-[var(--nav-height)] z-50 flex flex-col gap-1 border-b border-border bg-background/95 px-6 pb-5 pt-4';
  const desktopLinks = 'sm:flex sm:items-center sm:gap-8';

  return (
    <div className="bg-background text-foreground min-h-svh">
      {/* ── Navbar ── */}
      <nav className="border-border bg-background/90 fixed inset-x-0 top-0 isolate z-[100] h-[var(--nav-height)] border-b backdrop-blur-[10px]">
        <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between px-3 sm:px-4">
          <Link
            to={logoTarget}
            data-testid="navbar-logo"
            className="flex items-center gap-1 text-inherit no-underline"
          >
            <img
              src={logoImg}
              alt="Logo"
              className="block h-12 w-auto sm:h-16"
            />
            <span
              data-testid="logo-text"
              className="tracking-px text-foreground text-sm font-extrabold sm:text-base sm:tracking-[1.5px]"
            >
              FITNESS
            </span>
          </Link>

          <div className="flex items-center gap-2">
            {mode === 'public' && (
              <div
                className={cn(
                  desktopLinks,
                  menuOpen ? mobileDropdown : 'hidden',
                )}
              >
                <Link to="/" className={navLinkClass} onClick={closeMenu}>
                  Home
                </Link>
                <Link
                  to="/schedule"
                  className={navLinkClass}
                  onClick={closeMenu}
                >
                  Schedule
                </Link>
                <a href="#contact" className={navLinkClass} onClick={closeMenu}>
                  Contact
                </a>
                {isAdmin && (
                  <Button
                    asChild
                    className="bg-primary text-primary-foreground hover:bg-primary/90 mt-3 h-10 w-full px-5 font-bold sm:mt-0 sm:w-auto"
                  >
                    <Link to="/admin" onClick={closeMenu}>
                      Switch to admin view
                    </Link>
                  </Button>
                )}
                {isLoaded && !isSignedIn && (
                  <SignInButton mode="modal">
                    <Button className="bg-primary text-primary-foreground hover:bg-primary/90 mt-3 h-10 w-full px-5 font-bold sm:mt-0 sm:w-auto">
                      Log in
                    </Button>
                  </SignInButton>
                )}
                {isLoaded && isSignedIn && (
                  <UserButton>
                    <UserButton.MenuItems>
                      <UserButton.Action
                        label="My Profile"
                        labelIcon={<UserCircle size={16} />}
                        open="my-profile"
                      />
                      <UserButton.Action label="manageAccount" />
                      <UserButton.Action label="signOut" />
                    </UserButton.MenuItems>
                    <UserButton.UserProfilePage label="account" />
                    <UserButton.UserProfilePage label="security" />
                    <UserButton.UserProfilePage
                      label="My Profile"
                      url="my-profile"
                      labelIcon={<UserCircle size={16} />}
                    >
                      <CustomerProfilePage />
                    </UserButton.UserProfilePage>
                  </UserButton>
                )}
              </div>
            )}

            {mode === 'staff' && (
              <div
                className={cn(
                  desktopLinks,
                  menuOpen ? mobileDropdown : 'hidden',
                )}
              >
                <Link
                  to="/admin/calendar"
                  className={navLinkClass}
                  onClick={closeMenu}
                >
                  Calendar
                </Link>
                {canSeeStaffStats && (
                  <Link
                    to="/staff/statistics"
                    className={navLinkClass}
                    onClick={closeMenu}
                  >
                    Statistics
                  </Link>
                )}
                <UserButton />
              </div>
            )}

            {mode === 'admin' && (
              <div
                className={cn(
                  desktopLinks,
                  menuOpen ? mobileDropdown : 'hidden',
                )}
              >
                <Link
                  to="/admin/staff"
                  className={navLinkClass}
                  onClick={closeMenu}
                >
                  Manage Staff
                </Link>
                <Link
                  to="/admin/calendar"
                  className={navLinkClass}
                  onClick={closeMenu}
                >
                  Calendar
                </Link>
                {canSeeAdminStats && (
                  <Link
                    to="/admin/statistics"
                    className={navLinkClass}
                    onClick={closeMenu}
                  >
                    Statistics
                  </Link>
                )}
                <Button
                  asChild
                  className="bg-primary text-primary-foreground hover:bg-primary/90 mt-3 h-10 w-full px-5 font-bold sm:mt-0 sm:w-auto"
                >
                  <Link to="/" onClick={closeMenu}>
                    Switch to public view
                  </Link>
                </Button>
                <UserButton />
              </div>
            )}

            <ThemeToggle className="ml-1" />

            <button
              className="text-foreground flex h-9 w-9 cursor-pointer items-center justify-center border-none bg-transparent p-0 sm:hidden"
              aria-label="Toggle menu"
              onClick={() => setMenuOpen((o) => !o)}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </nav>

      <Outlet />

      {/* ── Footer ── */}
      <footer
        data-testid="footer"
        className="border-border bg-background border-t px-8 pt-[60px]"
        id="contact"
      >
        <div className="border-border mx-auto grid max-w-[1200px] grid-cols-1 gap-10 border-b pb-12 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.5fr]">
          <div className="flex flex-col gap-3">
            <h4 className="text-xs-plus tracking-px text-foreground mb-1 font-bold uppercase">
              Address
            </h4>
            <div className="text-muted-foreground text-xs-plus flex items-start gap-2 leading-[1.6]">
              <MapPin size={15} className="text-primary mt-0.5 shrink-0" />
              <span>
                Fitness Centrum XY
                <br />
                Údolí 221, 602 00 Brno-střed
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="text-xs-plus tracking-px text-foreground mb-1 font-bold uppercase">
              Contact
            </h4>
            <div className="text-muted-foreground text-xs-plus flex items-start gap-2 leading-[1.6]">
              <Phone size={15} className="text-primary mt-0.5 shrink-0" />
              <span>+420 000 111 222</span>
            </div>
            <div className="text-muted-foreground text-xs-plus flex items-start gap-2 leading-[1.6]">
              <Mail size={15} className="text-primary mt-0.5 shrink-0" />
              <span>info@fitnessxy.cz</span>
            </div>
            <div className="text-muted-foreground text-xs-plus flex items-start gap-2 leading-[1.6]">
              <span className="text-muted-foreground text-xs-plus">
                Manager: Janko Mrkvička
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="text-xs-plus tracking-px text-foreground mb-1 font-bold uppercase">
              Opening Hours
            </h4>
            <div className="text-muted-foreground text-xs-plus flex items-start gap-2 leading-[1.6]">
              <Clock size={15} className="text-primary mt-0.5 shrink-0" />
              <span>
                Mon – Fri: 6:00 – 22:00
                <br />
                Sat – Sun: 8:00 – 20:00
              </span>
            </div>
            <div className="mt-4 flex gap-3.5">
              <a
                href="#"
                aria-label="Facebook"
                className="text-muted-foreground hover:text-primary inline-flex items-center justify-center transition-colors"
              >
                <SocialIcon d={FACEBOOK_PATH} />
              </a>
              <a
                href="#"
                aria-label="Instagram"
                className="text-muted-foreground hover:text-primary inline-flex items-center justify-center transition-colors"
              >
                <SocialIcon d={INSTAGRAM_PATH} />
              </a>
              <a
                href="#"
                aria-label="TikTok"
                className="text-muted-foreground hover:text-primary inline-flex items-center justify-center transition-colors"
              >
                <SocialIcon d={TIKTOK_PATH} />
              </a>
              <a
                href="#"
                aria-label="YouTube"
                className="text-muted-foreground hover:text-primary inline-flex items-center justify-center transition-colors"
              >
                <SocialIcon d={YOUTUBE_PATH} />
              </a>
            </div>
          </div>

          <div className="order-first col-span-full min-h-[240px] w-full overflow-hidden rounded-[var(--radius)] lg:order-none lg:col-auto lg:min-h-[200px]">
            <iframe
              title="Fitness Centrum XY location"
              src="https://www.google.com/maps?q=Údolní+221%2F3%2C+602+00+Brno&output=embed"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="block h-full min-h-[200px] w-full border-0"
            />
          </div>
        </div>
        <div className="text-muted-foreground mx-auto max-w-[1200px] py-5 text-[12px]">
          <p>© 2026 Fitness XY. All rights reserved.</p>
        </div>
      </footer>

      <Toaster theme="dark" position="bottom-right" richColors />
    </div>
  );
}
