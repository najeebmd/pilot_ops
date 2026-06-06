import { useEffect, useState } from 'react';
import './InstructorFormModal.css';

export interface InstructorFormData {
  first_name:    string;
  last_name:     string;
  email:         string;
  phone:         string;
  date_of_birth: string;
  address_line1: string;
  address_line2: string;
  city:          string;
  state:         string;
  country:       string;
  postal_code:   string;
  // Only for create
  username?:     string;
  password?:     string;
}

interface Instructor {
  id:         number;
  first_name: string;
  last_name:  string;
  email:      string;
  phone:      string | null;
  date_of_birth: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city:       string | null;
  state:      string | null;
  country:    string | null;
  postal_code:string | null;
}

interface Props {
  instructor?: Instructor | null;
  onSave:  (data: InstructorFormData) => Promise<void>;
  onClose: () => void;
}

const EMPTY: InstructorFormData = {
  first_name: '', last_name: '', email: '', phone: '',
  date_of_birth: '', address_line1: '', address_line2: '',
  city: '', state: '', country: '', postal_code: '',
  username: '', password: '',
};

export default function InstructorFormModal({ instructor, onSave, onClose }: Props) {
  const isEdit = !!instructor;
  const [form,   setForm]   = useState<InstructorFormData>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  useEffect(() => {
    if (instructor) {
      setForm({
        first_name:    instructor.first_name,
        last_name:     instructor.last_name,
        email:         instructor.email,
        phone:         instructor.phone         ?? '',
        date_of_birth: instructor.date_of_birth ? instructor.date_of_birth.slice(0, 10) : '',
        address_line1: instructor.address_line1 ?? '',
        address_line2: instructor.address_line2 ?? '',
        city:          instructor.city          ?? '',
        state:         instructor.state         ?? '',
        country:       instructor.country       ?? '',
        postal_code:   instructor.postal_code   ?? '',
      });
    } else {
      setForm(EMPTY);
    }
    setError('');
  }, [instructor]);

  function set(k: keyof InstructorFormData, v: string) {
    setForm(f => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!isEdit) {
      if (!form.username?.trim()) { setError('Username is required'); return; }
      if (!form.password || form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    }
    setSaving(true);
    try {
      await onSave(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal instructor-modal">
        <div className="modal-header">
          <h2>{isEdit ? `Edit — ${instructor!.first_name} ${instructor!.last_name}` : 'Add Instructor'}</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <p className="form-section-label">Personal Details</p>
          <div className="form-grid">
            <div className="field">
              <label>First Name *</label>
              <input value={form.first_name} onChange={e => set('first_name', e.target.value)} required />
            </div>
            <div className="field">
              <label>Last Name *</label>
              <input value={form.last_name} onChange={e => set('last_name', e.target.value)} required />
            </div>
            <div className="field field-full">
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
            <div className="field field-full">
              <label>Address Line 1</label>
              <input value={form.address_line1} onChange={e => set('address_line1', e.target.value)} />
            </div>
            <div className="field field-full">
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

          {!isEdit && (
            <>
              <p className="form-section-label">Login Credentials</p>
              <div className="form-grid">
                <div className="field">
                  <label>Username *</label>
                  <input value={form.username ?? ''} onChange={e => set('username', e.target.value)}
                    placeholder="e.g. john.smith" autoComplete="off" />
                </div>
                <div className="field">
                  <label>Password * <span style={{fontWeight:400,color:'#94a3b8'}}>(min 8 chars)</span></label>
                  <input type="password" value={form.password ?? ''} onChange={e => set('password', e.target.value)}
                    autoComplete="new-password" />
                </div>
              </div>
            </>
          )}

          {error && <p className="form-error">{error}</p>}

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Instructor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
