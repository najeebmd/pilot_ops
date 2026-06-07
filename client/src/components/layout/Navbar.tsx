import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AuthModal from '../AuthModal';
import './Navbar.css';

const NAV_ITEMS = [
  { to: '/',            label: 'Home',         adminOnly: false, instructorOnly: false },
  { to: '/students',    label: 'Users',         adminOnly: true,  instructorOnly: false },
  { to: '/instructors', label: 'Instructors',   adminOnly: false, instructorOnly: false },
  { to: '/courses',     label: 'Courses',       adminOnly: false, instructorOnly: false },
  { to: '/aircraft',    label: 'Aircraft',      adminOnly: false, instructorOnly: false },
  { to: '/schedule',    label: 'My Schedule',   adminOnly: false, instructorOnly: true  },
  { to: '/reservations',label: 'Reservations',  adminOnly: false, instructorOnly: false },
];

export default function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [showAuth, setShowAuth]         = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const isAdminOrStaff = user?.roles.some(r => r === 'ADMIN' || r === 'STAFF') ?? false;
  const isInstructor   = user?.roles.includes('INSTRUCTOR') ?? false;

  const visibleItems = NAV_ITEMS.filter(item =>
    (!item.adminOnly      || isAdminOrStaff) &&
    (!item.instructorOnly || isInstructor)
  );

  return (
    <>
      <header className="navbar">
        <NavLink to="/" className="navbar-brand">
          <img src="/logo.svg" alt="PilotOps logo" className="navbar-logo" />
          <span className="navbar-wordmark">
            <span className="navbar-wordmark-pilot">Pilot</span>
            <span className="navbar-wordmark-ops">Ops</span>
          </span>
        </NavLink>

        <nav className="navbar-nav">
          {visibleItems.map(({ to, label }) => (
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
          {user ? (
            <div className="user-menu-wrapper">
              <button
                className="user-pill"
                onClick={() => setShowUserMenu((v) => !v)}
              >
                <span className="user-avatar">
                  {user.first_name[0]}{user.last_name[0]}
                </span>
                <span className="user-name">{user.first_name} {user.last_name}</span>
                <span className="user-chevron">▾</span>
              </button>

              {showUserMenu && (
                <>
                  <div className="user-menu-backdrop" onClick={() => setShowUserMenu(false)} />
                  <div className="user-menu">
                    <div className="user-menu-header">
                      <p className="user-menu-fullname">{user.first_name} {user.last_name}</p>
                      <p className="user-menu-username">@{user.username}</p>
                      <div className="user-menu-roles">
                        {user.roles.map((r) => (
                          <span key={r} className="role-badge">{r}</span>
                        ))}
                      </div>
                    </div>
                    <div className="user-menu-divider" />
                    <button className="user-menu-item" onClick={() => { navigate('/profile'); setShowUserMenu(false); }}>
                      👤 Profile
                    </button>
                    <div className="user-menu-divider" />
                    <button className="user-menu-item user-menu-item--danger" onClick={() => { signOut(); setShowUserMenu(false); }}>
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={() => setShowAuth(true)}>
              Sign In
            </button>
          )}
        </div>
      </header>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  );
}
