import { useEffect, useState } from 'react';
import type { User, UserFormData } from '../types/user';
import './UserFormModal.css';

const EMPTY: UserFormData = {
  first_name: '', last_name: '', email: '', phone: '',
  date_of_birth: '', address_line1: '', address_line2: '',
  city: '', state: '', country: '', postal_code: '',
};

interface Props {
  user?: User | null;
  onSave: (data: UserFormData) => Promise<void>;
  onClose: () => void;
}

export default function UserFormModal({ user, onSave, onClose }: Props) {
  const [form, setForm] = useState<UserFormData>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setForm({
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone ?? '',
        date_of_birth: user.date_of_birth ? user.date_of_birth.slice(0, 10) : '',
        address_line1: user.address_line1 ?? '',
        address_line2: user.address_line2 ?? '',
        city: user.city ?? '',
        state: user.state ?? '',
        country: user.country ?? '',
        postal_code: user.postal_code ?? '',
      });
    } else {
      setForm(EMPTY);
    }
  }, [user]);

  function set(field: keyof UserFormData, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await onSave(form);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
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
          </div>

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
