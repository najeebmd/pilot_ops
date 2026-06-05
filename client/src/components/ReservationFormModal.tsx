import { useEffect, useState } from 'react';
import type { ReservationFormData } from '../types/reservation';
import type { Aircraft } from '../types/aircraft';
import './ReservationFormModal.css';

interface Instructor { id: number; first_name: string; last_name: string; }
interface Student    { id: number; first_name: string; last_name: string; email: string; }

interface Props {
  userId:               number;           // logged-in user's id (default reservation owner)
  instructors:          Instructor[];
  aircraft:             Aircraft[];
  students?:            Student[];        // only passed for admin/staff
  canSelectStudent?:    boolean;
  defaultStart?:        string;
  defaultInstructorId?: number | null;
  onSave:  (data: ReservationFormData) => Promise<void>;
  onClose: () => void;
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function ReservationFormModal({
  userId, instructors, aircraft, students = [], canSelectStudent = false,
  defaultStart, defaultInstructorId, onSave, onClose,
}: Props) {
  const [selectedUserId, setSelectedUserId] = useState<number>(userId);
  const [instructorId,   setInstructorId]   = useState<number | ''>('');
  const [aircraftId,     setAircraftId]     = useState<number | ''>('');
  const [dateStart,      setDateStart]      = useState('');
  const [dateEnd,        setDateEnd]        = useState('');
  const [saving,         setSaving]         = useState(false);
  const [error,          setError]          = useState('');

  useEffect(() => {
    setSelectedUserId(userId);
    setInstructorId(defaultInstructorId ?? '');
    setError('');
    if (defaultStart) {
      const start = toLocalInput(defaultStart);
      setDateStart(start);
      const end = new Date(defaultStart);
      end.setHours(end.getHours() + 1);
      setDateEnd(toLocalInput(end.toISOString()));
    } else {
      setDateStart('');
      setDateEnd('');
    }
  }, [defaultStart, defaultInstructorId, userId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!dateStart || !dateEnd) { setError('Start and end date/time are required'); return; }
    if (new Date(dateEnd) <= new Date(dateStart)) { setError('End time must be after start time'); return; }
    if (canSelectStudent && !selectedUserId) { setError('Please select a student'); return; }
    setSaving(true);
    try {
      await onSave({
        user_id:       selectedUserId,
        instructor_id: instructorId ? Number(instructorId) : null,
        aircraft_id:   aircraftId   ? Number(aircraftId)   : null,
        date_start:    new Date(dateStart).toISOString(),
        date_end:      new Date(dateEnd).toISOString(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  const durationMins = dateStart && dateEnd && new Date(dateEnd) > new Date(dateStart)
    ? Math.round((new Date(dateEnd).getTime() - new Date(dateStart).getTime()) / 60000)
    : null;

  const selectedStudent = canSelectStudent
    ? students.find(s => s.id === selectedUserId)
    : null;

  return (
    <div className="modal-backdrop">
      <div className="modal res-modal">
        <div className="modal-header">
          <h2>New Reservation</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>

          {/* ── Student selector (admin/staff only) ── */}
          {canSelectStudent && (
            <>
              <p className="form-section-label">
                Student
                <span className="admin-badge">Admin / Staff</span>
              </p>
              <div className="field">
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(Number(e.target.value))}
                  required
                >
                  <option value="">— Select a student —</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.first_name} {s.last_name} — {s.email}
                    </option>
                  ))}
                </select>
                {selectedStudent && (
                  <p className="field-hint selected-student-hint">
                    📋 Booking on behalf of <strong>{selectedStudent.first_name} {selectedStudent.last_name}</strong>
                  </p>
                )}
              </div>
            </>
          )}

          {/* ── Date & Time ── */}
          <p className="form-section-label">Date &amp; Time</p>
          <div className="form-grid">
            <div className="field">
              <label>Start *</label>
              <input type="datetime-local" value={dateStart} required
                onChange={(e) => {
                  setDateStart(e.target.value);
                  if (!dateEnd || new Date(e.target.value) >= new Date(dateEnd)) {
                    const end = new Date(e.target.value); end.setHours(end.getHours() + 1);
                    setDateEnd(toLocalInput(end.toISOString()));
                  }
                }} />
            </div>
            <div className="field">
              <label>End *</label>
              <input type="datetime-local" value={dateEnd} min={dateStart} required
                onChange={(e) => setDateEnd(e.target.value)} />
            </div>
          </div>
          {durationMins && (
            <p className="duration-hint">
              Duration:{' '}
              {Math.floor(durationMins/60) > 0 ? `${Math.floor(durationMins/60)}h ` : ''}
              {durationMins%60 > 0 ? `${durationMins%60}m` : ''}
            </p>
          )}

          {/* ── Instructor ── */}
          <p className="form-section-label">Instructor <span className="optional-label">(optional)</span></p>
          <div className="field">
            <select value={instructorId} onChange={(e) => setInstructorId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">— No instructor —</option>
              {instructors.map((i) => (
                <option key={i.id} value={i.id}>{i.first_name} {i.last_name}</option>
              ))}
            </select>
            {!instructorId && (
              <p className="field-hint">You can reserve a slot without an instructor for solo practice.</p>
            )}
          </div>

          {/* ── Aircraft ── */}
          <p className="form-section-label">Aircraft <span className="optional-label">(optional)</span></p>
          <div className="field">
            <select value={aircraftId} onChange={(e) => setAircraftId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">— No aircraft selected —</option>
              {aircraft.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.tail_number} — {a.make} {a.model}
                  {a.rental_rate ? ` ($${a.rental_rate}/hr)` : ''}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="form-error">{error}</p>}

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Booking…' : 'Confirm Reservation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
