import { useState } from 'react';
import { Link, Outlet } from '@tanstack/react-router';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import '../App.css';
import { SignUpForm } from '@/components/ui/signUpForm';

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
            <SignUpForm />
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
          <div className="footer-brand">
            <div className="navbar-logo">
              <img
                src="/src/assets/logo.png"
                alt="Logo"
                className="logo-icon logo-icon--footer"
              />
              <span className="logo-text">FITNESS</span>
            </div>
            <p className="footer-tagline">
              Your journey to a better self starts here.
            </p>
            <div className="footer-socials">
              <a href="#" aria-label="Facebook">
                fb
              </a>
              <a href="#" aria-label="Instagram">
                ig
              </a>
              <a href="#" aria-label="YouTube">
                yt
              </a>
              <a href="#" aria-label="TikTok">
                tt
              </a>
            </div>
          </div>

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
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2026 Fitness XY. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
