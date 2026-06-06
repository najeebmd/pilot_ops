import { useEffect, useState } from 'react';
import type { Reservation, ReservationFormData } from '../types/reservation';
import type { Aircraft } from '../types/aircraft';
import StudentSearch, { type StudentOption } from './StudentSearch';
import './ReservationFormModal.css';

interface Instructor { id: number; first_name: string; last_name: string; }

interface Props {
  userId:               number;
  instructors:          Instructor[];
  aircraft:             Aircraft[];
  canSelectStudent?:    boolean;
  defaultStart?:        string;
  defaultInstructorId?: number | null;
  defaultAircraftId?:   number | null;
  existingReservation?: Reservation | null;   // when set → edit mode
  onDelete?: () => Promise<void>;             // admin/staff only
  onSave:  (data: ReservationFormData) => Promise<void>;
  onClose: () => void;
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function ReservationFormModal({
  userId, instructors, aircraft, canSelectStudent = false,
  defaultStart, defaultInstructorId, defaultAircraftId, existingReservation, onDelete, onSave, onClose,
}: Props) {
  const isEditing = !!existingReservation;

  const [selectedStudent,  setSelectedStudent]  = useState<StudentOption | null>(null);
  const [instructorId,     setInstructorId]     = useState<number | ''>('');
  const [aircraftId,       setAircraftId]       = useState<number | ''>('');
  const [dateStart,        setDateStart]        = useState('');
  const [dateEnd,          setDateEnd]          = useState('');
  const [saving,           setSaving]           = useState(false);
  const [deleting,         setDeleting]         = useState(false);
  const [confirmDelete,    setConfirmDelete]    = useState(false);
  const [error,            setError]            = useState('');

  useEffect(() => {
    setSelectedStudent(null);
    setConfirmDelete(false);
    setError('');

    if (existingReservation) {
      // Edit mode: pre-fill from existing reservation
      setDateStart(toLocalInput(existingReservation.date_start));
      setDateEnd(toLocalInput(existingReservation.date_end));
      setInstructorId(existingReservation.instructor_id ?? '');
      setAircraftId(existingReservation.aircraft_id ?? '');
    } else {
      // Create mode
      setInstructorId(defaultInstructorId ?? '');
      setAircraftId(defaultAircraftId ?? '');
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
    }
  }, [existingReservation, defaultStart, defaultInstructorId, defaultAircraftId, userId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!isEditing && canSelectStudent && !selectedStudent) {
      setError('Please search for and select a student');
      return;
    }
    if (!dateStart || !dateEnd) { setError('Start and end date/time are required'); return; }
    if (new Date(dateEnd) <= new Date(dateStart)) { setError('End time must be after start time'); return; }
    if (!instructorId && !aircraftId) { setError('Please select at least an instructor or an aircraft'); return; }
    setSaving(true);
    try {
      const resolvedUserId = isEditing
        ? existingReservation!.user_id
        : (canSelectStudent && selectedStudent ? selectedStudent.id : userId);
      await onSave({
        user_id:       resolvedUserId,
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

  return (
    <div className="modal-backdrop">
      <div className="modal res-modal">
        <div className="modal-header">
          <h2>{isEditing ? 'Edit Reservation' : 'New Reservation'}</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>

          {/* ── Student search (admin/staff only, create mode only) ── */}
          {canSelectStudent && !isEditing && (
            <>
              <p className="form-section-label">
                Student / Pilot
                <span className="admin-badge">Admin / Staff</span>
              </p>
              <StudentSearch value={selectedStudent} onChange={setSelectedStudent} />
              {!selectedStudent && (
                <p className="field-hint" style={{marginTop:'0.3rem'}}>
                  Type at least 2 characters to search by name or email.
                </p>
              )}
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

          <div className="modal-footer res-modal-footer">
            {/* Delete — admin/staff edit mode only */}
            {isEditing && onDelete && (
              <div className="res-delete-group">
                {confirmDelete ? (
                  <>
                    <span className="res-delete-confirm-label">Delete this reservation?</span>
                    <button
                      type="button"
                      className="btn btn-danger"
                      disabled={deleting}
                      onClick={async () => {
                        setDeleting(true);
                        try { await onDelete(); }
                        catch (e) { setError(e instanceof Error ? e.message : 'Delete failed'); setConfirmDelete(false); }
                        finally { setDeleting(false); }
                      }}
                    >
                      {deleting ? 'Deleting…' : 'Yes, Delete'}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => setConfirmDelete(false)}>
                      No, Keep
                    </button>
                  </>
                ) : (
                  <button type="button" className="btn btn-danger-outline" onClick={() => setConfirmDelete(true)}>
                    🗑 Delete
                  </button>
                )}
              </div>
            )}

            <div className="res-modal-right">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving || confirmDelete}>
                {saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Confirm Reservation'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
