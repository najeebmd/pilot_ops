import { useEffect, useState } from 'react';
import type { Aircraft, AircraftFormData, AircraftStatus } from '../types/aircraft';
import './AircraftFormModal.css';

interface Props {
  aircraft?: Aircraft | null;
  onSave:    (data: AircraftFormData) => Promise<void>;
  onClose:   () => void;
}

const STATUSES: { value: AircraftStatus; label: string; color: string }[] = [
  { value: 'READY',         label: 'Ready',         color: '#15803d' },
  { value: 'MAINTENANCE',   label: 'Maintenance',   color: '#d97706' },
  { value: 'NOT_AVAILABLE', label: 'Not Available', color: '#dc2626' },
];

const EMPTY: AircraftFormData = {
  tail_number: '', serial_number: '', make: '', model: '',
  year_built: new Date().getFullYear(), flight_hours: 0,
  seats: null, fuel_capacity: null, weight: null, status: 'READY',
  rental_rate: null, next_inspection_date: null,
};

export default function AircraftFormModal({ aircraft, onSave, onClose }: Props) {
  const [form, setForm]       = useState<AircraftFormData>(EMPTY);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (aircraft) {
      setForm({
        tail_number:          aircraft.tail_number,
        serial_number:        aircraft.serial_number,
        make:                 aircraft.make,
        model:                aircraft.model,
        year_built:           aircraft.year_built,
        flight_hours:         aircraft.flight_hours,
        seats:                aircraft.seats,
        fuel_capacity:        aircraft.fuel_capacity,
        weight:               aircraft.weight,
        status:               aircraft.status,
        rental_rate:          aircraft.rental_rate,
        next_inspection_date: aircraft.next_inspection_date
          ? aircraft.next_inspection_date.slice(0, 10)
          : null,
      });
    } else {
      setForm(EMPTY);
    }
    setError('');
  }, [aircraft]);

  function setStr(k: keyof AircraftFormData, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function setNum(k: keyof AircraftFormData, v: string) {
    setForm((f) => ({ ...f, [k]: v === '' ? null : Number(v) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await onSave({
        ...form,
        tail_number:          form.tail_number.toUpperCase(),
        next_inspection_date: form.next_inspection_date
          ? new Date(form.next_inspection_date).toISOString()
          : null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal aircraft-modal" role="dialog" aria-modal="true">
        <div className="modal-header">
          <h2>{aircraft ? `Edit — ${aircraft.tail_number}` : 'Add Aircraft'}</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* ── Registration ── */}
          <p className="form-section-label">Registration</p>
          <div className="form-grid">
            <div className="field">
              <label>Tail Number *</label>
              <input
                value={form.tail_number}
                onChange={(e) => setStr('tail_number', e.target.value)}
                placeholder="e.g. N1234A"
                required
              />
            </div>
            <div className="field">
              <label>Serial Number *</label>
              <input
                value={form.serial_number}
                onChange={(e) => setStr('serial_number', e.target.value)}
                placeholder="e.g. 17281234"
                required
              />
            </div>
          </div>

          {/* ── Aircraft details ── */}
          <p className="form-section-label">Aircraft</p>
          <div className="form-grid">
            <div className="field">
              <label>Make *</label>
              <input value={form.make}  onChange={(e) => setStr('make', e.target.value)}  placeholder="e.g. Cessna" required />
            </div>
            <div className="field">
              <label>Model *</label>
              <input value={form.model} onChange={(e) => setStr('model', e.target.value)} placeholder="e.g. 172S Skyhawk" required />
            </div>
            <div className="field">
              <label>Year Built *</label>
              <input type="number" min="1900" max={new Date().getFullYear() + 1}
                value={form.year_built}
                onChange={(e) => setNum('year_built', e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>Flight Hours</label>
              <input type="number" min="0" step="0.1"
                value={form.flight_hours ?? ''}
                onChange={(e) => setNum('flight_hours', e.target.value)}
              />
            </div>
            <div className="field">
              <label>Seats</label>
              <input type="number" min="1" step="1"
                value={form.seats ?? ''}
                onChange={(e) => setNum('seats', e.target.value)}
              />
            </div>
            <div className="field">
              <label>Fuel Capacity (gal)</label>
              <input type="number" min="0" step="0.1"
                value={form.fuel_capacity ?? ''}
                onChange={(e) => setNum('fuel_capacity', e.target.value)}
              />
            </div>
            <div className="field">
              <label>Weight (lbs)</label>
              <input type="number" min="0"
                value={form.weight ?? ''}
                onChange={(e) => setNum('weight', e.target.value)}
              />
            </div>
          </div>

          {/* ── Operations ── */}
          <p className="form-section-label">Operations</p>
          <div className="form-grid">
            <div className="field">
              <label>Rental Rate ($/hr)</label>
              <input type="number" min="0" step="0.01"
                value={form.rental_rate ?? ''}
                onChange={(e) => setNum('rental_rate', e.target.value)}
              />
            </div>
            <div className="field">
              <label>Next Inspection Date</label>
              <input type="date"
                value={form.next_inspection_date ?? ''}
                onChange={(e) => setStr('next_inspection_date', e.target.value)}
              />
            </div>
          </div>

          {/* ── Status ── */}
          <p className="form-section-label">Status</p>
          <div className="status-options">
            {STATUSES.map((s) => (
              <label
                key={s.value}
                className={`status-option${form.status === s.value ? ' status-option--selected' : ''}`}
                style={{ '--st-color': s.color } as React.CSSProperties}
              >
                <input
                  type="radio"
                  name="status"
                  value={s.value}
                  checked={form.status === s.value}
                  onChange={() => setForm((f) => ({ ...f, status: s.value }))}
                />
                {s.label}
              </label>
            ))}
          </div>

          {error && <p className="form-error">{error}</p>}

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save Aircraft'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
