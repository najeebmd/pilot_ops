import { useState, useEffect } from 'react';
import './UserFormModal.css';
import './InstructorEditModal.css';

interface Props {
  instructor: { id: number; first_name: string; last_name: string };
  rate:       number | null;
  status:     string;
  onSave:     (rate: number, status: string) => Promise<void>;
  onClose:    () => void;
}

const STATUS_OPTIONS = [
  { value: 'ACTIVE',   label: 'Active',   color: '#16a34a' },
  { value: 'INACTIVE', label: 'Inactive', color: '#64748b' },
] as const;

export default function InstructorEditModal({ instructor, rate, status, onSave, onClose }: Props) {
  const [rateVal,  setRateVal]  = useState(rate != null ? String(rate) : '');
  const [statusVal, setStatusVal] = useState(status);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  useEffect(() => {
    setRateVal(rate != null ? String(rate) : '');
    setStatusVal(status);
    setError('');
  }, [instructor.id, rate, status]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const parsed = parseFloat(rateVal);
    if (isNaN(parsed) || parsed < 0) {
      setError('Hourly rate must be a non-negative number');
      return;
    }
    setSaving(true);
    try {
      await onSave(parsed, statusVal);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal instr-edit-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit — {instructor.first_name} {instructor.last_name}</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <p className="instr-edit-section-label">Hourly Rate</p>
          <div className="instr-edit-rate-field">
            <span className="instr-edit-rate-prefix">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={rateVal}
              onChange={e => setRateVal(e.target.value)}
              placeholder="e.g. 95.00"
              required
            />
            <span className="instr-edit-rate-suffix">/hr</span>
          </div>

          <p className="instr-edit-section-label">Status</p>
          <div className="status-options">
            {STATUS_OPTIONS.map(opt => (
              <label
                key={opt.value}
                className={`status-option${statusVal === opt.value ? ' status-option--selected' : ''}`}
                style={{ '--st-color': opt.color } as React.CSSProperties}
              >
                <input
                  type="radio"
                  name="instructor-status"
                  value={opt.value}
                  checked={statusVal === opt.value}
                  onChange={() => setStatusVal(opt.value)}
                />
                {opt.label}
              </label>
            ))}
          </div>

          {error && <p className="form-error">{error}</p>}

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
