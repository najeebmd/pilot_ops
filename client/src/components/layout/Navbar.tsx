import { NavLink } from 'react-router-dom';
import './Navbar.css';

const NAV_ITEMS = [
  { to: '/',           label: 'Home' },
  { to: '/students',   label: 'Students' },
  { to: '/instructors',label: 'Instructors' },
  { to: '/courses',    label: 'Courses' },
  { to: '/aircraft',   label: 'Aircraft' },
  { to: '/schedule',   label: 'Schedule' },
];

export default function Navbar() {
  return (
    <header className="navbar">
      <NavLink to="/" className="navbar-brand">
        <img src="/logo.svg" alt="PilotOps logo" className="navbar-logo" />
        <span className="navbar-wordmark">
          <span className="navbar-wordmark-pilot">Pilot</span>
          <span className="navbar-wordmark-ops">Ops</span>
        </span>
      </NavLink>

      <nav className="navbar-nav">
        {NAV_ITEMS.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `nav-link${isActive ? ' nav-link--active' : ''}`}
          >
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="navbar-end">
        <button className="btn btn-primary btn-sm">Sign In</button>
      </div>
    </header>
  );
}
