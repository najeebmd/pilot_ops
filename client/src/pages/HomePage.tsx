import { useNavigate } from 'react-router-dom';
import './HomePage.css';

const MENU_ITEMS = [
  {
    to: '/students',
    icon: '🎓',
    title: 'Students',
    description: 'Manage student enrolments, progress and personal records.',
    color: '#0ea5e9',
  },
  {
    to: '/instructors',
    icon: '👨‍✈️',
    title: 'Instructors',
    description: 'Instructor profiles, certifications and availability.',
    color: '#8b5cf6',
  },
  {
    to: '/courses',
    icon: '📋',
    title: 'Courses',
    description: 'PPL, CPL and instrument rating syllabi and lesson plans.',
    color: '#f59e0b',
  },
  {
    to: '/aircraft',
    icon: '✈️',
    title: 'Aircraft',
    description: 'Fleet maintenance logs, airworthiness and scheduling.',
    color: '#10b981',
  },
  {
    to: '/schedule',
    icon: '🗓️',
    title: 'Schedule',
    description: 'Book flights, ground school and simulator sessions.',
    color: '#ef4444',
  },
  {
    to: '/students',
    icon: '📊',
    title: 'Reports',
    description: 'Flight hours, training progress and compliance reports.',
    color: '#6366f1',
  },
];

const STATS = [
  { value: '200+', label: 'Graduates' },
  { value: '12',   label: 'Aircraft' },
  { value: '18',   label: 'Instructors' },
  { value: '98%',  label: 'Pass Rate' },
];

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="home">
      {/* ── Hero Banner ── */}
      <section className="hero">
        <div className="hero-bg" aria-hidden="true">
          <div className="hero-horizon" />
          <div className="hero-glow hero-glow--left" />
          <div className="hero-glow hero-glow--right" />
          {/* runway lights */}
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="runway-light" style={{ left: `${10 + i * 8}%`, animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>

        <div className="hero-content">
          <div className="hero-badge">✈ Certified Flight Training</div>
          <h1 className="hero-title">
            Your Journey to<br />
            <span className="hero-title-accent">The Skies Starts Here</span>
          </h1>
          <p className="hero-subtitle">
            PilotOps is the complete management platform for modern flying schools —
            from first solo to commercial licence.
          </p>
          <div className="hero-actions">
            <button className="btn btn-hero-primary" onClick={() => navigate('/students')}>
              Manage Students
            </button>
            <button className="btn btn-hero-secondary" onClick={() => navigate('/schedule')}>
              View Schedule
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="hero-stats">
          {STATS.map(({ value, label }) => (
            <div key={label} className="stat">
              <span className="stat-value">{value}</span>
              <span className="stat-label">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Menu Cards ── */}
      <section className="menu-section">
        <div className="menu-header">
          <h2>Operations Centre</h2>
          <p>Everything you need to run your flying school, in one place.</p>
        </div>
        <div className="menu-grid">
          {MENU_ITEMS.map(({ to, icon, title, description, color }) => (
            <button
              key={title}
              className="menu-card"
              onClick={() => navigate(to)}
              style={{ '--card-color': color } as React.CSSProperties}
            >
              <div className="menu-card-icon">{icon}</div>
              <div className="menu-card-body">
                <h3 className="menu-card-title">{title}</h3>
                <p className="menu-card-desc">{description}</p>
              </div>
              <span className="menu-card-arrow">→</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="home-footer">
        <p>© {new Date().getFullYear()} PilotOps · Built for aviators, by aviators.</p>
      </footer>
    </div>
  );
}
