import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useRouterState } from '@tanstack/react-router';
import { MapPin, Phone, Mail, Clock, UserCircle } from 'lucide-react';
import { useAuth, useUser, SignInButton, UserButton } from '@clerk/clerk-react';
import { Toaster } from 'sonner';
import { can } from '@/lib/permissions';
import { useApi } from '@/lib/api';
import CustomerProfilePage from '@/components/CustomerProfilePage';
import ThemeToggle from '@/components/common/ThemeToggle';
import '../App.css';

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
    apiRequest('/auth/profile')
      .catch(() => {})
      .finally(() => {
        user.reload().catch(() => {});
      });
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

  return (
    <div className="app-root">
      {/* ── Navbar ── */}
      <nav className="navbar">
        <div className="navbar-inner">
          <Link to={logoTarget} className="navbar-logo">
            <img src="/src/assets/logo.png" alt="Logo" className="logo-icon" />
            <span className="logo-text">FITNESS</span>
          </Link>

          {mode === 'public' && (
            <div
              className={`navbar-links${menuOpen ? 'navbar-links--open' : ''}`}
            >
              <Link to="/" onClick={closeMenu}>
                Home
              </Link>
              <Link to="/schedule" onClick={closeMenu}>
                Schedule
              </Link>
              <a href="#contact" onClick={closeMenu}>
                Contact
              </a>
              {isAdmin && (
                <Link to="/admin" className="btn-primary" onClick={closeMenu}>
                  Switch to admin view
                </Link>
              )}
              {isLoaded && !isSignedIn && (
                <SignInButton mode="modal">
                  <button className="btn-primary">Log in</button>
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
              className={`navbar-links${menuOpen ? 'navbar-links--open' : ''}`}
            >
              <Link to="/admin/calendar" onClick={closeMenu}>
                Calendar
              </Link>
              {canSeeStaffStats && (
                <Link to="/staff/statistics" onClick={closeMenu}>
                  Statistics
                </Link>
              )}
              <UserButton />
            </div>
          )}

          {mode === 'admin' && (
            <div
              className={`navbar-links${menuOpen ? 'navbar-links--open' : ''}`}
            >
              <Link to="/admin/staff" onClick={closeMenu}>
                Manage Staff
              </Link>
              <Link to="/admin/calendar" onClick={closeMenu}>
                Calendar
              </Link>
              {canSeeAdminStats && (
                <Link to="/admin/statistics" onClick={closeMenu}>
                  Statistics
                </Link>
              )}
              <Link to="/" className="btn-primary" onClick={closeMenu}>
                Switch to public view
              </Link>
              <UserButton />
            </div>
          )}

          <ThemeToggle className="ml-2" />

          <button
            className="hamburger"
            aria-label="Toggle menu"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span
              className={`hamburger-bar${menuOpen ? 'hamburger-bar--open' : ''}`}
            />
          </button>
        </div>
      </nav>

      <Outlet />

      {/* ── Footer ── */}
      <footer className="footer" id="contact">
        <div className="footer-inner">
          <div className="footer-col">
            <h4 className="footer-col-title">Address</h4>
            <div className="footer-info-row">
              <MapPin size={15} />
              <span>
                Fitness Centrum XY
                <br />
                Údolí 221, 602 00 Brno-střed
              </span>
            </div>
          </div>

          <div className="footer-col">
            <h4 className="footer-col-title">Contact</h4>
            <div className="footer-info-row">
              <Phone size={15} />
              <span>+420 000 111 222</span>
            </div>
            <div className="footer-info-row">
              <Mail size={15} />
              <span>info@fitnessxy.cz</span>
            </div>
            <div className="footer-info-row">
              <span className="footer-manager">Manager: Janko Mrkvička</span>
            </div>
          </div>

          <div className="footer-col">
            <h4 className="footer-col-title">Opening Hours</h4>
            <div className="footer-info-row">
              <Clock size={15} />
              <span>
                Mon – Fri: 6:00 – 22:00
                <br />
                Sat – Sun: 8:00 – 20:00
              </span>
            </div>
            <div className="footer-socials">
              <a href="#" aria-label="Facebook">
                <SocialIcon d={FACEBOOK_PATH} />
              </a>
              <a href="#" aria-label="Instagram">
                <SocialIcon d={INSTAGRAM_PATH} />
              </a>
              <a href="#" aria-label="TikTok">
                <SocialIcon d={TIKTOK_PATH} />
              </a>
              <a href="#" aria-label="YouTube">
                <SocialIcon d={YOUTUBE_PATH} />
              </a>
            </div>
          </div>

          <div className="footer-map">
            <iframe
              title="Fitness Centrum XY location"
              src="https://www.google.com/maps?q=Údolní+221%2F3%2C+602+00+Brno&output=embed"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2026 Fitness XY. All rights reserved.</p>
        </div>
      </footer>
      <Toaster theme="dark" position="bottom-right" richColors />
    </div>
  );
}
