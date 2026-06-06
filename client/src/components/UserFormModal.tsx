import { useEffect, useState } from 'react';
import type { User, UserFormData } from '../types/user';
import './UserFormModal.css';

interface Role { id: number; name: string; }

const EMPTY: UserFormData = {
  first_name: '', last_name: '', email: '', phone: '',
  date_of_birth: '', address_line1: '', address_line2: '',
  city: '', state: '', country: '', postal_code: '',
  role_ids: [],
};

interface Props {
  user?: User | null;
  canResetPassword?: boolean;   // admin/staff only
  onSave: (data: UserFormData) => Promise<void>;
  onClose: () => void;
}

export default function UserFormModal({ user, canResetPassword, onSave, onClose }: Props) {
  const isEdit = !!user;
  const [form, setForm]         = useState<UserFormData>(EMPTY);
  const [roles, setRoles]       = useState<Role[]>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  // Password reset (edit mode, admin/staff)
  const [showReset,   setShowReset]   = useState(false);
  const [newPw,       setNewPw]       = useState('');
  const [confirmPw,   setConfirmPw]   = useState('');
  const [pwSaving,    setPwSaving]    = useState(false);
  const [pwMsg,       setPwMsg]       = useState('');
  const [pwError,     setPwError]     = useState('');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  // Load available roles once
  useEffect(() => {
    fetch('/api/roles')
      .then((r) => r.json())
      .then(setRoles)
      .catch(() => {});
  }, []);

  // Populate form when editing
  useEffect(() => {
    if (user) {
      setForm({
        first_name:    user.first_name,
        last_name:     user.last_name,
        email:         user.email,
        phone:         user.phone         ?? '',
        date_of_birth: user.date_of_birth ? user.date_of_birth.slice(0, 10) : '',
        address_line1: user.address_line1 ?? '',
        address_line2: user.address_line2 ?? '',
        city:          user.city          ?? '',
        state:         user.state         ?? '',
        country:       user.country       ?? '',
        postal_code:   user.postal_code   ?? '',
        role_ids:      user.roles.map((r) => r.role_id),
      });
    } else {
      setForm(EMPTY);
      setUsername('');
      setPassword('');
    }
    setError('');
    setShowReset(false);
    setNewPw(''); setConfirmPw('');
    setPwMsg(''); setPwError('');
  }, [user]);

  function set(field: keyof UserFormData, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function toggleRole(id: number) {
    setForm((f) => ({
      ...f,
      role_ids: f.role_ids.includes(id)
        ? f.role_ids.filter((r) => r !== id)
        : [...f.role_ids, id],
    }));
  }

  async function handlePasswordReset(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(''); setPwError('');
    if (newPw.length < 8) { setPwError('Password must be at least 8 characters'); return; }
    if (newPw !== confirmPw) { setPwError('Passwords do not match'); return; }
    setPwSaving(true);
    try {
      const token = localStorage.getItem('po_token');
      const res = await fetch(`/api/users/${user!.id}/login/reset`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ new_password: newPw }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? 'Failed to reset password');
      setPwMsg('Password reset successfully.');
      setNewPw(''); setConfirmPw('');
      setShowReset(false);
    } catch (err) {
      setPwError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setPwSaving(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!isEdit) {
      if (!username.trim()) { setError('Username is required'); return; }
      if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    }
    setSaving(true);
    try {
      await onSave({ ...form, _username: username, _password: password } as any);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          <h2>{user ? 'Edit User' : 'Add User'}</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="field">
              <label>First Name *</label>
              <input value={form.first_name} onChange={(e) => set('first_name', e.target.value)} required />
            </div>
            <div className="field">
              <label>Last Name *</label>
              <input value={form.last_name} onChange={(e) => set('last_name', e.target.value)} required />
            </div>
            <div className="field field-full">
              <label>Email *</label>
              <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required />
            </div>
            <div className="field">
              <label>Phone</label>
              <input value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} />
            </div>
            <div className="field">
              <label>Date of Birth</label>
              <input type="date" value={form.date_of_birth ?? ''} onChange={(e) => set('date_of_birth', e.target.value)} />
            </div>
            <div className="field field-full">
              <label>Address Line 1</label>
              <input value={form.address_line1 ?? ''} onChange={(e) => set('address_line1', e.target.value)} />
            </div>
            <div className="field field-full">
              <label>Address Line 2</label>
              <input value={form.address_line2 ?? ''} onChange={(e) => set('address_line2', e.target.value)} />
            </div>
            <div className="field">
              <label>City</label>
              <input value={form.city ?? ''} onChange={(e) => set('city', e.target.value)} />
            </div>
            <div className="field">
              <label>State</label>
              <input value={form.state ?? ''} onChange={(e) => set('state', e.target.value)} />
            </div>
            <div className="field">
              <label>Country</label>
              <input value={form.country ?? ''} onChange={(e) => set('country', e.target.value)} />
            </div>
            <div className="field">
              <label>Postal Code</label>
              <input value={form.postal_code ?? ''} onChange={(e) => set('postal_code', e.target.value)} />
            </div>

            {/* Roles */}
            <div className="field field-full">
              <label>Roles</label>
              <div className="role-checkboxes">
                {roles.map((role) => {
                  const checked = form.role_ids.includes(role.id);
                  return (
                    <label key={role.id} className={`role-checkbox${checked ? ' role-checkbox--checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleRole(role.id)}
                      />
                      {role.name}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Password reset — edit mode, admin/staff only */}
          {isEdit && canResetPassword && (
            <div className="pw-reset-section">
              <div className="pw-reset-header">
                <span className="form-section-label" style={{margin:0}}>Reset Password</span>
                <button type="button" className="btn-filter-ctrl"
                  onClick={() => { setShowReset(r => !r); setPwMsg(''); setPwError(''); setNewPw(''); setConfirmPw(''); }}>
                  {showReset ? 'Cancel' : 'Change Password'}
                </button>
              </div>
              {pwMsg && <p className="pw-success">{pwMsg}</p>}
              {showReset && (
                <form onSubmit={handlePasswordReset} className="pw-reset-form">
                  <div className="form-grid">
                    <div className="field">
                      <label>New Password <span style={{fontWeight:400,color:'#94a3b8',fontSize:'0.75rem'}}>(min 8 chars)</span></label>
                      <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
                        autoComplete="new-password" required />
                    </div>
                    <div className="field">
                      <label>Confirm Password</label>
                      <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                        autoComplete="new-password" required />
                    </div>
                  </div>
                  {pwError && <p className="form-error" style={{marginTop:'0.5rem'}}>{pwError}</p>}
                  <div style={{marginTop:'0.75rem',display:'flex',justifyContent:'flex-end'}}>
                    <button type="submit" className="btn btn-primary" disabled={pwSaving}>
                      {pwSaving ? 'Resetting…' : 'Reset Password'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Login credentials — create mode only */}
          {!isEdit && (
            <>
              <div className="field field-full" style={{marginTop:'0.25rem'}}>
                <label style={{fontSize:'0.72rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',color:'#94a3b8',marginBottom:'0.5rem',display:'block'}}>
                  Login Credentials
                </label>
              </div>
              <div className="form-grid">
                <div className="field">
                  <label>Username *</label>
                  <input
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="e.g. james.smith"
                    autoComplete="off"
                  />
                </div>
                <div className="field">
                  <label>Password * <span style={{fontWeight:400,color:'#94a3b8',fontSize:'0.75rem'}}>(min 8 chars)</span></label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
              </div>
            </>
          )}

          {error && <p className="form-error">{error}</p>}

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
