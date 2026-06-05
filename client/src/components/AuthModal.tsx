import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiLogin, apiRegister } from '../api/auth';
import './AuthModal.css';

interface Props {
  onClose: () => void;
}

type Tab = 'login' | 'register';

export default function AuthModal({ onClose }: Props) {
  const { signIn } = useAuth();
  const [tab, setTab]       = useState<Tab>('login');
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  // Login fields
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });

  // Register fields
  const [regForm, setRegForm] = useState({
    first_name: '', last_name: '', email: '',
    username: '', password: '', confirm_password: '',
  });

  function setLogin(k: keyof typeof loginForm, v: string) {
    setLoginForm((f) => ({ ...f, [k]: v }));
  }
  function setReg(k: keyof typeof regForm, v: string) {
    setRegForm((f) => ({ ...f, [k]: v }));
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token, user } = await apiLogin(loginForm.username, loginForm.password);
      signIn(token, user);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (regForm.password !== regForm.confirm_password) {
      setError('Passwords do not match');
      return;
    }
    if (regForm.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      const { token, user } = await apiRegister({
        first_name: regForm.first_name,
        last_name:  regForm.last_name,
        email:      regForm.email,
        username:   regForm.username,
        password:   regForm.password,
      });
      signIn(token, user);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="auth-modal">

        <div className="auth-modal-logo">
          <img src="/logo.svg" alt="PilotOps" width={48} height={48} />
          <span className="auth-modal-wordmark">
            <span>Pilot</span><span style={{ color: '#38bdf8' }}>Ops</span>
          </span>
        </div>

        <div className="auth-tabs">
          <button
            className={`auth-tab${tab === 'login' ? ' auth-tab--active' : ''}`}
            onClick={() => { setTab('login'); setError(''); }}
          >
            Sign In
          </button>
          <button
            className={`auth-tab${tab === 'register' ? ' auth-tab--active' : ''}`}
            onClick={() => { setTab('register'); setError(''); }}
          >
            Register
          </button>
        </div>

        {tab === 'login' ? (
          <form onSubmit={handleLogin} className="auth-form">
            <div className="auth-field">
              <label>Username</label>
              <input
                autoFocus
                value={loginForm.username}
                onChange={(e) => setLogin('username', e.target.value)}
                placeholder="your_username"
                required
              />
            </div>
            <div className="auth-field">
              <label>Password</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLogin('password', e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            {error && <p className="auth-error">{error}</p>}
            <button className="btn btn-auth" type="submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
            <p className="auth-switch">
              No account?{' '}
              <button type="button" className="auth-link" onClick={() => { setTab('register'); setError(''); }}>
                Register here
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="auth-form">
            <div className="auth-grid">
              <div className="auth-field">
                <label>First Name</label>
                <input value={regForm.first_name} onChange={(e) => setReg('first_name', e.target.value)} required />
              </div>
              <div className="auth-field">
                <label>Last Name</label>
                <input value={regForm.last_name} onChange={(e) => setReg('last_name', e.target.value)} required />
              </div>
            </div>
            <div className="auth-field">
              <label>Email</label>
              <input type="email" value={regForm.email} onChange={(e) => setReg('email', e.target.value)} required />
            </div>
            <div className="auth-field">
              <label>Username</label>
              <input value={regForm.username} onChange={(e) => setReg('username', e.target.value)} required />
            </div>
            <div className="auth-grid">
              <div className="auth-field">
                <label>Password</label>
                <input type="password" value={regForm.password} onChange={(e) => setReg('password', e.target.value)} placeholder="Min. 8 characters" required />
              </div>
              <div className="auth-field">
                <label>Confirm Password</label>
                <input type="password" value={regForm.confirm_password} onChange={(e) => setReg('confirm_password', e.target.value)} required />
              </div>
            </div>
            {error && <p className="auth-error">{error}</p>}
            <button className="btn btn-auth" type="submit" disabled={loading}>
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
            <p className="auth-switch">
              Already have an account?{' '}
              <button type="button" className="auth-link" onClick={() => { setTab('login'); setError(''); }}>
                Sign in
              </button>
            </p>
          </form>
        )}

        <button className="auth-close" onClick={onClose} aria-label="Close">✕</button>
      </div>
    </div>
  );
}
