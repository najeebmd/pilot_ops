import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchReservations, createReservation, updateReservation } from '../api/reservations';
import { fetchAircraft } from '../api/aircraft';
import { fetchSchedule } from '../api/schedule';
import { fetchUsers } from '../api/users';
import type { Reservation } from '../types/reservation';
import type { Aircraft } from '../types/aircraft';
import type { ScheduleEntry } from '../types/schedule';
import ReservationFormModal from '../components/ReservationFormModal';
import ConfirmDialog from '../components/ConfirmDialog';
import './ReservationsPage.css';

// ── Helpers ───────────────────────────────────────────────────────────────────
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate()+n); return r; }
function sod(d: Date) { const r = new Date(d); r.setHours(0,0,0,0); return r; }
function fmtTime(iso: string) { return new Date(iso).toLocaleTimeString([],{hour:'numeric',minute:'2-digit',hour12:true}); }
function fmtHour(h: number) {
  const d = new Date(); d.setHours(h, 0, 0, 0);
  return d.toLocaleTimeString([], { hour: 'numeric', hour12: true });
}
function fmtFullDate(d: Date) { return d.toLocaleDateString([],{weekday:'long',month:'long',day:'numeric',year:'numeric'}); }
function overlaps(s1: Date, e1: Date, s2: Date, e2: Date) { return s1 < e2 && e1 > s2; }

interface Instructor { id: number; first_name: string; last_name: string; }

const HOURS = Array.from({length: 16}, (_,i) => i + 6); // 06:00–21:00

const STATUS_META: Record<string, {label: string; bg: string; color: string}> = {
  RESERVED:  { label: 'Reserved',  bg: '#dbeafe', color: '#1e40af' },
  COMPLETED: { label: 'Completed', bg: '#dcfce7', color: '#15803d' },
  CANCELED:  { label: 'Cancelled', bg: '#f3f4f6', color: '#6b7280' },
};

export default function ReservationsPage() {
  const { user } = useAuth();

  const [tab,       setTab]       = useState<'book'|'mine'>('book');
  const [activeDay, setActiveDay] = useState(() => sod(new Date()));

  const [instructors,    setInstructors]    = useState<Instructor[]>([]);
  const [allAircraft,    setAllAircraft]    = useState<Aircraft[]>([]);

  const isAdminOrStaff = user?.roles.some(r => r === 'ADMIN' || r === 'STAFF') ?? false;
  const [scheduleMap,    setScheduleMap]    = useState<Record<number, ScheduleEntry[]>>({});
  const [reservations,   setReservations]   = useState<Reservation[]>([]);
  const [myReservations, setMyReservations] = useState<Reservation[]>([]);
  const [loading,        setLoading]        = useState(true);

  const [bookingSlot,  setBookingSlot]  = useState<{start: string; instructorId: number|null}|null>(null);
  const [editTarget,   setEditTarget]   = useState<Reservation|null>(null);
  const [cancelTarget, setCancelTarget] = useState<Reservation|null>(null);

  // Load instructors + ready aircraft once; also load students if admin/staff
  useEffect(() => {
    fetchUsers({ role: 'INSTRUCTOR', pageSize: 100 } as any).then(r => setInstructors(r.data as any));
    fetchAircraft({ pageSize: 100, status: 'READY' }).then(r => setAllAircraft(r.data));
  }, []);

  const loadDay = useCallback(async () => {
    setLoading(true);
    const dateFrom = activeDay.toISOString();
    const dateTo   = addDays(activeDay, 1).toISOString();
    try {
      const [schedResult, resResult] = await Promise.all([
        fetchSchedule({ pageSize: 200, sortBy: 'date_start', sortOrder: 'asc' }),
        fetchReservations({ date_from: dateFrom, date_to: dateTo, pageSize: 200 }),
      ]);
      const map: Record<number, ScheduleEntry[]> = {};
      schedResult.data.forEach(e => {
        if (!map[e.instructor_id]) map[e.instructor_id] = [];
        map[e.instructor_id].push(e);
      });
      setScheduleMap(map);
      setReservations(resResult.data);
    } finally {
      setLoading(false);
    }
  }, [activeDay]);

  const loadMine = useCallback(async () => {
    if (!user) return;
    // Admin/staff see all reservations; students only see their own
    const params = isAdminOrStaff
      ? { pageSize: 200, sortBy: 'date_start', sortOrder: 'desc' as const }
      : { user_id: user.id, pageSize: 100, sortBy: 'date_start', sortOrder: 'desc' as const };
    const r = await fetchReservations(params);
    setMyReservations(r.data);
  }, [user, isAdminOrStaff]);

  useEffect(() => { loadDay(); }, [loadDay]);
  useEffect(() => { if (tab === 'mine') loadMine(); }, [tab, loadMine]);

  // ── Cell helpers ──────────────────────────────────────────────────────────
  function slotRange(hour: number) {
    const s = new Date(activeDay); s.setHours(hour,   0, 0, 0);
    const e = new Date(activeDay); e.setHours(hour+1, 0, 0, 0);
    return { slotStart: s, slotEnd: e };
  }

  function cellStatus(instructorId: number, hour: number): 'free'|'booked'|'busy' {
    const { slotStart, slotEnd } = slotRange(hour);
    const blocks = scheduleMap[instructorId] ?? [];
    if (blocks.some(e => e.activity_type !== 'INSTRUCTION' &&
        overlaps(new Date(e.date_start), new Date(e.date_end), slotStart, slotEnd)))
      return 'busy';
    if (reservations.some(r => r.instructor_id === instructorId && r.status !== 'CANCELED' &&
        overlaps(new Date(r.date_start), new Date(r.date_end), slotStart, slotEnd)))
      return 'booked';
    return 'free';
  }

  /** Returns the reservation that occupies this instructor × hour slot, if any. */
  function findReservation(instructorId: number, hour: number): Reservation | null {
    const { slotStart, slotEnd } = slotRange(hour);
    return reservations.find(r =>
      r.instructor_id === instructorId &&
      r.status !== 'CANCELED' &&
      overlaps(new Date(r.date_start), new Date(r.date_end), slotStart, slotEnd)
    ) ?? null;
  }

  function openBooking(hour: number, instructorId: number | null) {
    const start = new Date(activeDay); start.setHours(hour, 0, 0, 0);
    setBookingSlot({ start: start.toISOString(), instructorId });
  }

  async function handleBook(data: import('../types/reservation').ReservationFormData) {
    await createReservation(data);
    setBookingSlot(null);
    await loadDay();
    if (tab === 'mine') await loadMine();
  }

  async function handleEdit(data: import('../types/reservation').ReservationFormData) {
    if (!editTarget) return;
    await updateReservation(editTarget.id, data);
    setEditTarget(null);
    await loadDay();
    await loadMine();
  }

  async function handleCancel() {
    if (!cancelTarget) return;
    await updateReservation(cancelTarget.id, { status: 'CANCELED' });
    setCancelTarget(null);
    await loadDay();
    await loadMine();
  }

  const isToday = sod(new Date()).getTime() === activeDay.getTime();

  if (!user) return (
    <div className="res-gate">
      <div className="res-gate-icon">🔒</div>
      <h2>Sign in to make a reservation</h2>
    </div>
  );

  return (
    <div className="res-page">
      <div className="res-page-header">
        <div>
          <h1>Reservations</h1>
          <p className="page-subtitle">Schedule your next flight</p>
        </div>
        <button className="btn btn-primary" onClick={() => openBooking(new Date().getHours(), null)}>
          + Reserve a Slot
        </button>
      </div>

      {/* Tabs */}
      <div className="res-tabs">
        <button className={`res-tab${tab==='book'?' res-tab--active':''}`} onClick={() => setTab('book')}>
          📅 Instructor Availability
        </button>
        <button className={`res-tab${tab==='mine'?' res-tab--active':''}`} onClick={() => setTab('mine')}>
          {isAdminOrStaff ? '📋 All Reservations' : '🎓 My Reservations'}
        </button>
      </div>

      {/* ── AVAILABILITY CALENDAR ── */}
      {tab === 'book' && (
        <>
          {/* Day nav */}
          <div className="day-nav">
            <button className="btn btn-secondary btn-page" onClick={() => setActiveDay(d => addDays(d,-1))}>‹</button>
            <span className={`day-nav-label${isToday?' day-nav-label--today':''}`}>{fmtFullDate(activeDay)}</span>
            <button className="btn btn-secondary btn-page" onClick={() => setActiveDay(d => addDays(d, 1))}>›</button>
            {!isToday && (
              <button className="btn btn-secondary btn-today" onClick={() => setActiveDay(sod(new Date()))}>Today</button>
            )}
          </div>

          {/* Legend */}
          <div className="cal-legend">
            <span className="cal-legend-item cal-legend-item--free">Available — click to book</span>
            <span className="cal-legend-item cal-legend-item--booked">Reserved</span>
            <span className="cal-legend-item cal-legend-item--busy">Unavailable</span>
            <span className="cal-legend-item cal-legend-item--past">Past</span>
          </div>

          {loading ? (
            <p className="res-state">Loading availability…</p>
          ) : instructors.length === 0 ? (
            <p className="res-state">No instructors found.</p>
          ) : (
            <div className="big-table-wrapper">
              <table className="avail-table">
                <thead>
                  <tr>
                    <th className="avail-th-instructor">Instructor</th>
                    {HOURS.map(h => (
                      <th key={h} className="avail-th-hour">
                        {fmtHour(h)}
                      </th>
                    ))}
                    <th className="avail-th-action"></th>
                  </tr>
                </thead>
                <tbody>
                  {instructors.map(instructor => (
                    <tr key={instructor.id} className="avail-row">
                      {/* Instructor name cell */}
                      <td className="avail-td-instructor">
                        <div className="avail-instructor-info">
                          <span className="cal-avatar cal-avatar--sm">
                            {instructor.first_name[0]}{instructor.last_name[0]}
                          </span>
                          <span className="avail-instructor-name">
                            {instructor.first_name} {instructor.last_name}
                          </span>
                        </div>
                      </td>

                      {/* Hour cells */}
                      {HOURS.map(hour => {
                        const status    = cellStatus(instructor.id, hour);
                        const isPast    = new Date(activeDay).setHours(hour+1) < Date.now();
                        const canBook   = !isPast && status === 'free';
                        const canEdit   = !isPast && status === 'booked' && isAdminOrStaff;
                        const isClickable = canBook || canEdit;
                        const cls = [
                          `avail-cell avail-cell--${isPast ? 'past' : status}`,
                          canEdit ? 'avail-cell--editable' : '',
                        ].join(' ').trim();

                        function handleCellClick() {
                          if (canBook) { openBooking(hour, instructor.id); return; }
                          if (canEdit) {
                            const res = findReservation(instructor.id, hour);
                            if (res) setEditTarget(res);
                          }
                        }

                        return (
                          <td
                            key={hour}
                            className={cls}
                            onClick={isClickable ? handleCellClick : undefined}
                            style={isClickable ? { cursor: 'pointer' } : undefined}
                            title={canBook ? `Book ${instructor.first_name} at ${fmtHour(hour)}`
                              : canEdit   ? `Edit reservation at ${fmtHour(hour)}`
                              : status === 'busy' ? 'Unavailable' : undefined}
                          >
                            {status === 'booked' && !isPast && (
                              <span className="avail-cell-dot avail-cell-dot--booked" />
                            )}
                            {status === 'busy' && !isPast && (
                              <span className="avail-cell-dot avail-cell-dot--busy" />
                            )}
                          </td>
                        );
                      })}

                      {/* Quick book button */}
                      <td className="avail-td-action">
                        <button
                          className="btn-book-quick"
                          onClick={() => openBooking(new Date().getHours(), instructor.id)}
                        >
                          Book
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Solo booking */}
          <div className="solo-booking">
            <div>
              <p className="solo-booking-title">✈️ Solo / Aircraft-only reservation</p>
              <p className="solo-booking-desc">Reserve a slot without an instructor — for solo practice or aircraft rental.</p>
            </div>
            <button className="btn btn-secondary" onClick={() => openBooking(new Date().getHours(), null)}>
              Reserve Without Instructor
            </button>
          </div>
        </>
      )}

      {/* ── MY RESERVATIONS ── */}
      {tab === 'mine' && (
        <div className="my-reservations">
          {myReservations.length === 0 ? (
            <p className="res-state">You have no reservations yet.</p>
          ) : (
            <div className="res-list">
              {myReservations.map(r => {
                const meta = STATUS_META[r.status];
                const start = new Date(r.date_start);
                const end   = new Date(r.date_end);
                const dur   = Math.round((end.getTime()-start.getTime())/60000);
                const durLabel = `${Math.floor(dur/60)>0?Math.floor(dur/60)+'h ':''}${dur%60>0?dur%60+'m':''}`;
                return (
                  <div key={r.id} className="res-card" style={{borderLeftColor: meta.color}}>
                    <div className="res-card-top">
                      <div>
                        <span className="res-card-date">
                          {start.toLocaleDateString([],{weekday:'short',month:'short',day:'numeric',year:'numeric'})}
                        </span>
                        <span className="res-card-time"> · {fmtTime(r.date_start)} – {fmtTime(r.date_end)} ({durLabel})</span>
                      </div>
                      <span className="res-status-badge" style={{background:meta.bg,color:meta.color}}>
                        {meta.label}
                      </span>
                    </div>
                    <div className="res-card-details">
                      {isAdminOrStaff && (
                        <span className="res-card-student">
                          🎓 {r.user.first_name} {r.user.last_name}
                        </span>
                      )}
                      {r.instructor && <span>👨‍✈️ {r.instructor.first_name} {r.instructor.last_name}</span>}
                      {r.aircraft   && <span>✈️ {r.aircraft.tail_number} — {r.aircraft.make} {r.aircraft.model}</span>}
                      {!r.instructor && !r.aircraft && <span className="res-card-solo">Solo / no aircraft</span>}
                    </div>
                    {r.status === 'RESERVED' && (isAdminOrStaff || r.user_id === user.id) && (
                      <div className="res-card-actions">
                        <button className="btn btn-secondary" style={{fontSize:'0.78rem',padding:'0.3rem 0.75rem'}}
                          onClick={() => setEditTarget(r)}>
                          ✏️ Edit
                        </button>
                        <button className="btn btn-danger" style={{fontSize:'0.78rem',padding:'0.3rem 0.75rem'}}
                          onClick={() => setCancelTarget(r)}>
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {bookingSlot && (
        <ReservationFormModal
          userId={user.id}
          instructors={instructors}
          aircraft={allAircraft}
          canSelectStudent={isAdminOrStaff}
          defaultStart={bookingSlot.start}
          defaultInstructorId={bookingSlot.instructorId}
          onSave={handleBook}
          onClose={() => setBookingSlot(null)}
        />
      )}

      {editTarget && (
        <ReservationFormModal
          userId={user.id}
          instructors={instructors}
          aircraft={allAircraft}
          existingReservation={editTarget}
          onSave={handleEdit}
          onClose={() => setEditTarget(null)}
        />
      )}

      {cancelTarget && (
        <ConfirmDialog
          message={`Cancel your reservation on ${new Date(cancelTarget.date_start).toLocaleDateString()}? This cannot be undone.`}
          onConfirm={handleCancel}
          onCancel={() => setCancelTarget(null)}
        />
      )}
    </div>
  );
}
