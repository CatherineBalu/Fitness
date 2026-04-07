import { useState } from 'react';
import heroImg from './assets/hero.png';
import './App.css';

const pricingPlans = [
  {
    name: 'Basic',
    price: '€19',
    period: '/month',
    features: [
      'Access to gym equipment',
      '2 group classes / week',
      'Locker room access',
      'Basic app access',
    ],
    highlighted: false,
  },
  {
    name: 'Standard',
    price: '€39',
    period: '/month',
    features: [
      'Unlimited gym access',
      'Unlimited group classes',
      'Personal trainer (1× / month)',
      'Full app access',
      'Nutrition guide',
    ],
    highlighted: true,
  },
  {
    name: 'Premium',
    price: '€69',
    period: '/month',
    features: [
      'Everything in Standard',
      'Personal trainer (4× / month)',
      'Sauna & spa access',
      'Priority class booking',
      'Diet consultation',
    ],
    highlighted: false,
  },
];

const classes = [
  {
    emoji: '🧘',
    name: 'Yoga',
    schedule: 'Mon, Wed — 9:00 AM',
    level: 'Beginner',
  },
  {
    emoji: '🔥',
    name: 'HIIT',
    schedule: 'Tue, Thu — 6:00 PM',
    level: 'Intermediate',
  },
  {
    emoji: '🏋️',
    name: 'Strength',
    schedule: 'Mon–Fri — 8:00 AM',
    level: 'All levels',
  },
  {
    emoji: '🚴',
    name: 'Cycling',
    schedule: 'Wed, Fri — 7:00 PM',
    level: 'All levels',
  },
];

function App() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="app-root">
      {/* ── Navbar ── */}
      <nav className="navbar">
        <div className="navbar-inner">
          <a href="#" className="navbar-logo">
            <img src="/src/assets/logo.png" alt="Logo" className="logo-icon" />
            <span className="logo-text">FITNESS</span>
          </a>
          <div
            className={`navbar-links${menuOpen ? ' navbar-links--open' : ''}`}
          >
            <a href="#about" onClick={() => setMenuOpen(false)}>
              About
            </a>
            <a href="#classes" onClick={() => setMenuOpen(false)}>
              Classes
            </a>
            <a href="#pricing" onClick={() => setMenuOpen(false)}>
              Pricing
            </a>
            <a href="#contact" onClick={() => setMenuOpen(false)}>
              Contact
            </a>
            <button className="btn-primary">Sign Up</button>
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

      {/* ── Hero ── */}
      <section className="hero-section">
        <img src={heroImg} alt="Gym" className="hero-bg" />
        <div className="hero-overlay" />
        <div className="hero-content">
          <p className="hero-eyebrow">Welcome to our gym</p>
          <h1 className="hero-heading">
            Pursue Outdoor,&nbsp;
            <span className="accent">Fitness Performance</span>
          </h1>
          <p className="hero-sub">
            Join our world-class fitness facility and transform your body.
            Expert trainers, modern equipment, and flexible membership plans.
          </p>
          <button className="btn-primary btn-large">Get Started</button>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="stats-section" id="about">
        <div className="stats-inner">
          {[
            { value: '5 000+', label: 'Active Members' },
            { value: '50+', label: 'Weekly Classes' },
            { value: '30+', label: 'Expert Trainers' },
            { value: '10+', label: 'Years of Experience' },
          ].map((s) => (
            <div className="stat-item" key={s.label}>
              <span className="stat-value">{s.value}</span>
              <span className="stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="pricing-section" id="pricing">
        <div className="section-inner">
          <h2 className="section-title">Choose the Plan That Fits You Best</h2>
          <p className="section-sub">No contracts. Cancel anytime.</p>
          <div className="pricing-grid">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`pricing-card ${plan.highlighted ? 'pricing-card--highlight' : ''}`}
              >
                <h3 className="plan-name">{plan.name}</h3>
                <div className="plan-price">
                  <span className="price-amount">{plan.price}</span>
                  <span className="price-period">{plan.period}</span>
                </div>
                <ul className="plan-features">
                  {plan.features.map((f) => (
                    <li key={f}>
                      <span className="check">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  className={
                    plan.highlighted
                      ? 'btn-dark btn-block'
                      : 'btn-primary btn-block'
                  }
                >
                  Get Started
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Classes ── */}
      <section className="classes-section" id="classes">
        <div className="section-inner">
          <h2 className="section-title">Our Classes</h2>
          <p className="section-sub">Find a class that works for you</p>
          <div className="classes-grid">
            {classes.map((cls) => (
              <div className="class-card" key={cls.name}>
                <span className="class-emoji">{cls.emoji}</span>
                <h3 className="class-name">{cls.name}</h3>
                <p className="class-schedule">{cls.schedule}</p>
                <span className="class-badge">{cls.level}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="footer" id="contact">
        <div className="footer-inner">
          <div className="navbar-logo">
            <img src="/src/assets/logo.png" alt="Logo" className="logo-icon" />
            <span className="logo-text">FITNESS</span>
          </div>
          <p className="footer-copy">
            © 2026 Fitness App. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
