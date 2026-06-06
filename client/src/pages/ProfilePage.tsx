import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchProfile, updateProfile, changePassword } from '../api/profile';
import './ProfilePage.css';

export default function ProfilePage() {
  const { user, signIn, token } = useAuth();

  // Personal info
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    date_of_birth: '', address_line1: '', address_line2: '',
    city: '', state: '', country: '', postal_code: '',
  });
  const [saving,       setSaving]       = useState(false);
  const [saveMsg,      setSaveMsg]      = useState('');
  const [saveError,    setSaveError]    = useState('');

  // Password change
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwSaving,  setPwSaving]  = useState(false);
  const [pwMsg,     setPwMsg]     = useState('');
  const [pwError,   setPwError]   = useState('');

  useEffect(() => {
    fetchProfile().then((p: any) => {
      setForm({
        first_name:    p.first_name    ?? '',
        last_name:     p.last_name     ?? '',
        email:         p.email         ?? '',
        phone:         p.phone         ?? '',
        date_of_birth: p.date_of_birth ? p.date_of_birth.slice(0, 10) : '',
        address_line1: p.address_line1 ?? '',
        address_line2: p.address_line2 ?? '',
        city:          p.city          ?? '',
        state:         p.state         ?? '',
        country:       p.country       ?? '',
        postal_code:   p.postal_code   ?? '',
      });
    });
  }, []);

  function set(k: keyof typeof form, v: string) {
    setForm(f => ({ ...f, [k]: v }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setSaveMsg(''); setSaveError('');
    try {
      const updated = await updateProfile({
        ...form,
        date_of_birth: form.date_of_birth ? new Date(form.date_of_birth).toISOString() : null,
      });
      setSaveMsg('Profile updated successfully.');
      // Refresh auth user name in navbar
      if (token) signIn(token, {
        ...user!,
        first_name: updated.first_name,
        last_name:  updated.last_name,
        email:      updated.email,
      });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(''); setPwError('');
    if (pwForm.next !== pwForm.confirm) { setPwError('New passwords do not match'); return; }
    if (pwForm.next.length < 8) { setPwError('New password must be at least 8 characters'); return; }
    setPwSaving(true);
    try {
      await changePassword(pwForm.current, pwForm.next);
      setPwMsg('Password changed successfully.');
      setPwForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      setPwError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setPwSaving(false);
    }
  }

  if (!user) return (
    <div className="profile-gate">
      <p>Please sign in to view your profile.</p>
    </div>
  );

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-avatar-lg">
          {user.first_name[0]}{user.last_name[0]}
        </div>
        <div>
          <h1>{user.first_name} {user.last_name}</h1>
          <p className="profile-meta">@{user.username}</p>
          <div className="profile-roles">
            {user.roles.map(r => (
              <span key={r} className="role-badge">{r}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Personal Info ── */}
      <section className="profile-section">
        <h2>Personal Information</h2>
        <form onSubmit={handleSave}>
          <div className="profile-grid">
            <div className="field">
              <label>First Name *</label>
              <input value={form.first_name} onChange={e => set('first_name', e.target.value)} required />
            </div>
            <div className="field">
              <label>Last Name *</label>
              <input value={form.last_name} onChange={e => set('last_name', e.target.value)} required />
            </div>
            <div className="field profile-field-full">
              <label>Email *</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} required />
            </div>
            <div className="field">
              <label>Phone</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            <div className="field">
              <label>Date of Birth</label>
              <input type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} />
            </div>
            <div className="field profile-field-full">
              <label>Address Line 1</label>
              <input value={form.address_line1} onChange={e => set('address_line1', e.target.value)} />
            </div>
            <div className="field profile-field-full">
              <label>Address Line 2</label>
              <input value={form.address_line2} onChange={e => set('address_line2', e.target.value)} />
            </div>
            <div className="field">
              <label>City</label>
              <input value={form.city} onChange={e => set('city', e.target.value)} />
            </div>
            <div className="field">
              <label>State</label>
              <input value={form.state} onChange={e => set('state', e.target.value)} />
            </div>
            <div className="field">
              <label>Country</label>
              <input value={form.country} onChange={e => set('country', e.target.value)} />
            </div>
            <div className="field">
              <label>Postal Code</label>
              <input value={form.postal_code} onChange={e => set('postal_code', e.target.value)} />
            </div>
          </div>

          {saveMsg   && <p className="profile-success">{saveMsg}</p>}
          {saveError && <p className="form-error">{saveError}</p>}

          <div className="profile-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </section>

      {/* ── Change Password ── */}
      <section className="profile-section">
        <h2>Change Password</h2>
        <form onSubmit={handlePasswordChange}>
          <div className="profile-grid profile-grid--narrow">
            <div className="field profile-field-full">
              <label>Current Password</label>
              <input type="password" value={pwForm.current}
                onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))} required />
            </div>
            <div className="field">
              <label>New Password</label>
              <input type="password" value={pwForm.next} placeholder="Min. 8 characters"
                onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))} required />
            </div>
            <div className="field">
              <label>Confirm New Password</label>
              <input type="password" value={pwForm.confirm}
                onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} required />
            </div>
          </div>

          {pwMsg   && <p className="profile-success">{pwMsg}</p>}
          {pwError && <p className="form-error">{pwError}</p>}

          <div className="profile-actions">
            <button type="submit" className="btn btn-primary" disabled={pwSaving}>
              {pwSaving ? 'Changing…' : 'Change Password'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
