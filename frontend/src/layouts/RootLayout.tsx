import { useState } from 'react';
import { Link, Outlet } from '@tanstack/react-router';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';

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
  'M19.6 6.32a5.6 5.6 0 01-3.36-1.12 5.6 5.6 0 01-2.24-3.2H10.4v13.12a2.56 2.56 0 11-2.56-2.56c.28 0 .55.05.8.13V9.36a6 6 0 00-.8-.06 5.92 5.92 0 105.92 5.92V9.6a8 8 0 005.84 2.24V8.4a5.4 5.4 0 01-1.6-.16 5.6 5.6 0 01-1.4-.92z';
import '../App.css';

export default function RootLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="app-root">
      {/* ── Navbar ── */}
      <nav className="navbar">
        <div className="navbar-inner">
          <Link to="/" className="navbar-logo">
            <img src="/src/assets/logo.png" alt="Logo" className="logo-icon" />
            <span className="logo-text">FITNESS</span>
          </Link>
          <div
            className={`navbar-links${menuOpen ? ' navbar-links--open' : ''}`}
          >
            <Link to="/" onClick={() => setMenuOpen(false)}>
              Home
            </Link>
            <Link to="/schedule" onClick={() => setMenuOpen(false)}>
              Schedule
            </Link>
            <a href="#contact" onClick={() => setMenuOpen(false)}>
              Contact
            </a>
            <button className="btn-primary">Log in</button>
          </div>
          <button
            className="hamburger"
            aria-label="Toggle menu"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span
              className={`hamburger-bar${menuOpen ? ' hamburger-bar--open' : ''}`}
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
    </div>
  );
}
