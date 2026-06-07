import { useEffect, useState } from 'react';
import type { ScheduleEntry, ScheduleFormData, ActivityType } from '../types/schedule';
import './ScheduleFormModal.css';

interface Props {
  entry?:       ScheduleEntry | null;
  instructorId: number;
  defaultStart?: string; // ISO datetime for pre-filling when clicking a day
  onSave:       (data: ScheduleFormData) => Promise<void>;
  onClose:      () => void;
}

const ACTIVITY_OPTIONS: { value: ActivityType; label: string; color: string }[] = [
  { value: 'OTHER',          label: 'Other',          color: '#8b5cf6' },
  { value: 'NOT_AVAILABLE',  label: 'Not Available',  color: '#ef4444' },
];

function toLocalInput(iso: string) {
  // Convert ISO to local datetime-local input value (YYYY-MM-DDTHH:mm)
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toISO(localStr: string) {
  return new Date(localStr).toISOString();
}

export default function ScheduleFormModal({ entry, instructorId, defaultStart, onSave, onClose }: Props) {
  const [activityType, setActivityType] = useState<ActivityType>('OTHER');
  const [dateStart, setDateStart]       = useState('');
  const [dateEnd, setDateEnd]           = useState('');
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState('');

  useEffect(() => {
    if (entry) {
      setActivityType(entry.activity_type);
      setDateStart(toLocalInput(entry.date_start));
      setDateEnd(toLocalInput(entry.date_end));
    } else {
      setActivityType('INSTRUCTION');
      if (defaultStart) {
        const start = toLocalInput(defaultStart);
        setDateStart(start);
        // Default to 1 hour later
        const end = new Date(defaultStart);
        end.setHours(end.getHours() + 1);
        setDateEnd(toLocalInput(end.toISOString()));
      } else {
        setDateStart('');
        setDateEnd('');
      }
    }
    setError('');
  }, [entry, defaultStart]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!dateStart || !dateEnd) {
      setError('Start and end date/time are required');
      return;
    }
    if (new Date(dateEnd) <= new Date(dateStart)) {
      setError('End time must be after start time');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        instructor_id: instructorId,
        date_start:    toISO(dateStart),
        date_end:      toISO(dateEnd),
        activity_type: activityType,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal sched-modal">
        <div className="modal-header">
          <h2>{entry ? 'Edit Schedule Entry' : 'New Schedule Entry'}</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Activity type selector */}
          <div className="field field-full" style={{ marginBottom: '1.25rem' }}>
            <label>Activity Type</label>
            <div className="activity-options">
              {ACTIVITY_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`activity-option${activityType === opt.value ? ' activity-option--selected' : ''}`}
                  style={{ '--act-color': opt.color } as React.CSSProperties}
                >
                  <input
                    type="radio"
                    name="activity_type"
                    value={opt.value}
                    checked={activityType === opt.value}
                    onChange={() => setActivityType(opt.value)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          <div className="form-grid">
            <div className="field">
              <label>Start Date &amp; Time</label>
              <input
                type="datetime-local"
                value={dateStart}
                onChange={(e) => {
                  setDateStart(e.target.value);
                  // Auto-advance end by 1h if end is empty or before new start
                  if (!dateEnd || new Date(e.target.value) >= new Date(dateEnd)) {
                    const end = new Date(e.target.value);
                    end.setHours(end.getHours() + 1);
                    setDateEnd(toLocalInput(end.toISOString()));
                  }
                }}
                required
              />
            </div>
            <div className="field">
              <label>End Date &amp; Time</label>
              <input
                type="datetime-local"
                value={dateEnd}
                min={dateStart}
                onChange={(e) => setDateEnd(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Duration hint */}
          {dateStart && dateEnd && new Date(dateEnd) > new Date(dateStart) && (
            <p className="duration-hint">
              Duration:{' '}
              {(() => {
                const mins = Math.round((new Date(dateEnd).getTime() - new Date(dateStart).getTime()) / 60000);
                const h = Math.floor(mins / 60), m = mins % 60;
                return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ''}` : `${m}m`;
              })()}
            </p>
          )}

          {error && <p className="form-error">{error}</p>}

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
