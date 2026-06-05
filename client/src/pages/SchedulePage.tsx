import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchSchedule, createScheduleEntry, updateScheduleEntry, deleteScheduleEntry } from '../api/schedule';
import type { ScheduleEntry, ScheduleFormData } from '../types/schedule';
import ScheduleFormModal from '../components/ScheduleFormModal';
import ConfirmDialog from '../components/ConfirmDialog';
import './SchedulePage.css';

// ── Helpers ────────────────────────────────────────────────────────────────

const ACT_META: Record<string, { label: string; color: string; bg: string }> = {
  INSTRUCTION:   { label: 'Instruction',   color: '#0369a1', bg: '#e0f2fe' },
  OTHER:         { label: 'Other',         color: '#6d28d9', bg: '#ede9fe' },
  NOT_AVAILABLE: { label: 'Not Available', color: '#b91c1c', bg: '#fee2e2' },
};

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function fmtDateHeader(date: Date) {
  return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function fmtWeekRange(weekStart: Date) {
  const end = addDays(weekStart, 6);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${weekStart.toLocaleDateString([], opts)} – ${end.toLocaleDateString([], { ...opts, year: 'numeric' })}`;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function SchedulePage() {
  const { user } = useAuth();

  const [entries, setEntries]     = useState<ScheduleEntry[]>([]);
  const [loading, setLoading]     = useState(true);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));

  const [editEntry, setEditEntry]     = useState<ScheduleEntry | null | undefined>(undefined);
  const [defaultStart, setDefaultStart] = useState<string | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<ScheduleEntry | null>(null);

  const isInstructor = user?.roles.includes('INSTRUCTOR');

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch the whole week in one go (up to 100 entries)
      const result = await fetchSchedule({
        instructor_id: user.id,
        pageSize: 100,
        sortBy: 'date_start',
        sortOrder: 'asc',
      });
      setEntries(result.data);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Build the 7-day columns for the current week
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Group entries by day
  function entriesForDay(day: Date) {
    return entries.filter((e) =>
      sameDay(new Date(e.date_start), day) || sameDay(new Date(e.date_end), day) ||
      (new Date(e.date_start) <= day && new Date(e.date_end) >= addDays(day, 1))
    );
  }

  async function handleSave(data: ScheduleFormData) {
    if (editEntry) {
      await updateScheduleEntry(editEntry.id, data);
    } else {
      await createScheduleEntry(data);
    }
    setEditEntry(undefined);
    setDefaultStart(undefined);
    await load();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteScheduleEntry(deleteTarget.id);
    setDeleteTarget(null);
    await load();
  }

  function openNew(day?: Date) {
    setDefaultStart(day ? day.toISOString() : new Date().toISOString());
    setEditEntry(null);
  }

  if (!user) {
    return (
      <div className="sched-gate">
        <div className="sched-gate-icon">🔒</div>
        <h2>Sign in to view your schedule</h2>
        <p>Please sign in using the button in the top right.</p>
      </div>
    );
  }

  if (!isInstructor) {
    return (
      <div className="sched-gate">
        <div className="sched-gate-icon">✈️</div>
        <h2>Instructor Access Only</h2>
        <p>The schedule is available to users with the Instructor role.</p>
      </div>
    );
  }

  return (
    <div className="sched-page">
      {/* ── Header ── */}
      <div className="sched-header">
        <div>
          <h1>My Schedule</h1>
          <p className="sched-subtitle">
            {user.first_name} {user.last_name} · {entries.length} entr{entries.length === 1 ? 'y' : 'ies'}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => openNew()}>+ Add Entry</button>
      </div>

      {/* ── Legend ── */}
      <div className="sched-legend">
        {Object.entries(ACT_META).map(([key, meta]) => (
          <span key={key} className="legend-item" style={{ background: meta.bg, color: meta.color }}>
            {meta.label}
          </span>
        ))}
      </div>

      {/* ── Week nav ── */}
      <div className="week-nav">
        <button className="btn btn-secondary btn-page" onClick={() => setWeekStart((w) => addDays(w, -7))}>‹</button>
        <span className="week-label">{fmtWeekRange(weekStart)}</span>
        <button className="btn btn-secondary btn-page" onClick={() => setWeekStart((w) => addDays(w, 7))}>›</button>
        <button className="btn btn-secondary btn-today" onClick={() => setWeekStart(startOfWeek(new Date()))}>
          Today
        </button>
      </div>

      {/* ── Calendar grid ── */}
      {loading ? (
        <p className="sched-state">Loading…</p>
      ) : (
        <div className="week-grid">
          {days.map((day) => {
            const dayEntries = entriesForDay(day);
            const isToday    = sameDay(day, new Date());
            return (
              <div key={day.toISOString()} className={`day-col${isToday ? ' day-col--today' : ''}`}>
                <div className="day-header">
                  <span className={`day-label${isToday ? ' day-label--today' : ''}`}>
                    {fmtDateHeader(day)}
                  </span>
                  <button className="add-day-btn" title="Add entry" onClick={() => openNew(day)}>+</button>
                </div>

                <div className="day-entries">
                  {dayEntries.length === 0 ? (
                    <div className="day-empty" onClick={() => openNew(day)}>Free</div>
                  ) : (
                    dayEntries.map((entry) => {
                      const meta = ACT_META[entry.activity_type];
                      return (
                        <div
                          key={entry.id}
                          className="entry-card"
                          style={{ background: meta.bg, borderLeftColor: meta.color }}
                        >
                          <div className="entry-card-top">
                            <span className="entry-type" style={{ color: meta.color }}>{meta.label}</span>
                            <div className="entry-actions">
                              <button
                                className="btn-icon-sm"
                                title="Edit"
                                onClick={() => { setEditEntry(entry); setDefaultStart(undefined); }}
                              >✏️</button>
                              <button
                                className="btn-icon-sm"
                                title="Delete"
                                onClick={() => setDeleteTarget(entry)}
                              >🗑️</button>
                            </div>
                          </div>
                          <div className="entry-time">
                            {fmtTime(entry.date_start)} – {fmtTime(entry.date_end)}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Upcoming list (next 30 days) ── */}
      {!loading && (
        <div className="upcoming-section">
          <h2>All Entries</h2>
          {entries.length === 0 ? (
            <p className="sched-state">No schedule entries yet.</p>
          ) : (
            <div className="entry-list">
              {[...entries].sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime())
                .map((entry) => {
                  const meta = ACT_META[entry.activity_type];
                  const start = new Date(entry.date_start);
                  const end   = new Date(entry.date_end);
                  const mins  = Math.round((end.getTime() - start.getTime()) / 60000);
                  const dur   = mins >= 60 ? `${Math.floor(mins/60)}h${mins%60 ? ` ${mins%60}m` : ''}` : `${mins}m`;
                  return (
                    <div key={entry.id} className="list-entry" style={{ borderLeftColor: meta.color }}>
                      <div className="list-entry-date">
                        <span className="list-entry-day">
                          {start.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                        <span className="list-entry-time">
                          {fmtTime(entry.date_start)} – {fmtTime(entry.date_end)}
                        </span>
                        <span className="list-entry-dur">{dur}</span>
                      </div>
                      <span className="list-entry-type" style={{ background: meta.bg, color: meta.color }}>
                        {meta.label}
                      </span>
                      <div className="list-entry-actions">
                        <button className="btn-icon-sm" onClick={() => { setEditEntry(entry); setDefaultStart(undefined); }}>✏️</button>
                        <button className="btn-icon-sm" onClick={() => setDeleteTarget(entry)}>🗑️</button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* ── Modals ── */}
      {editEntry !== undefined && (
        <ScheduleFormModal
          entry={editEntry}
          instructorId={user.id}
          defaultStart={defaultStart}
          onSave={handleSave}
          onClose={() => { setEditEntry(undefined); setDefaultStart(undefined); }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          message={`Delete the ${ACT_META[deleteTarget.activity_type].label} entry on ${new Date(deleteTarget.date_start).toLocaleDateString()}? This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
