import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import heroImg from './assets/hero.png';
import './App.css';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';

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

const trainers = [
  {
    id: 1,
    name: 'Janko Mrkvička',
    speciality: 'Strength & HIIT',
    bio: 'Specializing in strength training and high-intensity interval training. My goal is to push your limits, refine your form, and unlock your true physical potential.',
    tags: ['Strength', 'HIIT', 'Nutrition'],
    img: 'https://randomuser.me/api/portraits/men/32.jpg',
  },
  {
    id: 2,
    name: 'Katarína Nováková',
    speciality: 'Yoga & Mobility',
    bio: 'Dedicated to helping you find balance and flexibility. With 8 years of yoga experience I guide students of all levels toward a stronger, more mindful body.',
    tags: ['Yoga', 'Mobility', 'Meditation'],
    img: 'https://randomuser.me/api/portraits/women/44.jpg',
  },
  {
    id: 3,
    name: 'Martin Horváth',
    speciality: 'Cycling & Cardio',
    bio: 'Former professional cyclist turned coach. I bring real-world endurance experience to every session — whether you are a beginner or chasing a personal best.',
    tags: ['Cycling', 'Cardio', 'Endurance'],
    img: 'https://randomuser.me/api/portraits/men/76.jpg',
  },
  {
    id: 4,
    name: 'Lucia Benešová',
    speciality: 'Pilates & Core',
    bio: 'Core strength is the foundation of every movement. My Pilates-based approach rebuilds posture, reduces pain, and creates lasting functional strength.',
    tags: ['Pilates', 'Core', 'Rehabilitation'],
    img: 'https://randomuser.me/api/portraits/women/68.jpg',
  },
  {
    id: 5,
    name: 'Tomáš Kováč',
    speciality: 'CrossFit & Olympic Lifting',
    bio: 'Certified CrossFit coach and Olympic lifting enthusiast. I thrive on helping athletes of all levels discover what they are truly capable of.',
    tags: ['CrossFit', 'Olympic Lifting', 'Power'],
    img: 'https://randomuser.me/api/portraits/men/52.jpg',
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
            <a href="#trainers" onClick={() => setMenuOpen(false)}>
              Trainers
            </a>
            <a href="#pricing" onClick={() => setMenuOpen(false)}>
              Pricing
            </a>
            <Link to="/schedule" onClick={() => setMenuOpen(false)}>
              Schedule
            </Link>
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

      {/* ── Trainers ── */}
      <section className="trainers-section" id="trainers">
        <div className="section-inner">
          <h2 className="section-title">Train with the Elite</h2>
          <p className="section-sub">
            Ready to take your workouts to the next level? Our top-tier coaches
            are here to push your limits, refine your form, and unlock your true
            physical potential.
          </p>
          <Carousel
            opts={{ align: 'start', loop: true }}
            className="trainers-carousel"
          >
            <CarouselContent>
              {trainers.map((trainer) => (
                <CarouselItem
                  key={trainer.id}
                  className="md:basis-1/2 lg:basis-1/3"
                >
                  <Card className="trainer-card">
                    <CardHeader className="trainer-card-header">
                      <img
                        src={trainer.img}
                        alt={trainer.name}
                        className="trainer-avatar"
                      />
                    </CardHeader>
                    <CardContent className="trainer-card-body">
                      <h3 className="trainer-name">{trainer.name}</h3>
                      <p className="trainer-speciality">{trainer.speciality}</p>
                      <p className="trainer-bio">{trainer.bio}</p>
                      <div className="trainer-tags">
                        {trainer.tags.map((tag) => (
                          <Badge key={tag} className="trainer-badge">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                    <CardFooter className="trainer-card-footer">
                      <Button className="trainer-btn">Contact Coach</Button>
                    </CardFooter>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="carousel-prev" />
            <CarouselNext className="carousel-next" />
          </Carousel>
        </div>
      </section>

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

export default App;
