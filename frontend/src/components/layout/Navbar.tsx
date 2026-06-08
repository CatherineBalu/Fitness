import { useAuth, useUser, SignInButton, UserButton } from '@clerk/clerk-react';
import { Link, useRouterState } from '@tanstack/react-router';
import { UserCircle, Menu, X } from 'lucide-react';
import { useState } from 'react';

import logoImg from '@/assets/logo.png';
import ThemeToggle from '@/components/common/ThemeToggle';
import { Button } from '@/components/ui/button';
import { can } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import CustomerProfilePage from '@/pages/CustomerProfilePage/CustomerProfilePage';

const navLinkClass =
  'border-b border-border py-2 text-xs-plus text-foreground font-semibold no-underline transition-colors hover:text-primary sm:border-none sm:py-0 sm:text-[15px]';

const mobileDropdown =
  'absolute inset-x-0 top-[var(--nav-height)] z-50 flex flex-col gap-1 border-b border-border bg-background/95 px-6 pb-5 pt-4';
const desktopLinks = 'sm:flex sm:items-center sm:gap-8';

type NavbarProps = { className?: string };

export default function Navbar({ className }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const role = (user?.publicMetadata as { role?: string })?.role ?? null;

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
  const canScanEntry = can(role, 'entry:scan');

  const closeMenu = () => setMenuOpen(false);

  const logoTarget = mode === 'public' ? '/' : '/admin';

  return (
    <nav
      className={cn(
        'border-border dark:bg-background/90 fixed inset-x-0 top-0 isolate z-[100] h-[var(--nav-height)] border-b bg-white/95 backdrop-blur-[10px]',
        className,
      )}
    >
      <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between px-3 sm:px-4">
        <Link
          to={logoTarget}
          data-testid="navbar-logo"
          className="flex items-center gap-1 text-inherit no-underline"
        >
          <img src={logoImg} alt="Logo" className="block h-12 w-auto sm:h-16" />
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
              className={cn(desktopLinks, menuOpen ? mobileDropdown : 'hidden')}
            >
              <Link to="/" className={navLinkClass} onClick={closeMenu}>
                Home
              </Link>
              <Link to="/schedule" className={navLinkClass} onClick={closeMenu}>
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
              className={cn(desktopLinks, menuOpen ? mobileDropdown : 'hidden')}
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
              {canScanEntry && (
                <Link
                  to="/staff/scan"
                  className={navLinkClass}
                  onClick={closeMenu}
                >
                  Scan Entry
                </Link>
              )}
              <UserButton />
            </div>
          )}

          {mode === 'admin' && (
            <div
              className={cn(desktopLinks, menuOpen ? mobileDropdown : 'hidden')}
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
              {canScanEntry && (
                <Link
                  to="/staff/scan"
                  className={navLinkClass}
                  onClick={closeMenu}
                >
                  Scan Entry
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
  );
}
