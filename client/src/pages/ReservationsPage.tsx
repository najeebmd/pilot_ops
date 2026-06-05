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

// ── Date helpers ──────────────────────────────────────────────────────────────
function startOfWeek(d: Date) {
  const r = new Date(d); r.setDate(r.getDate() - r.getDay()); r.setHours(0,0,0,0); return r;
}
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate()+n); return r; }
function addHours(d: Date, h: number) { const r = new Date(d); r.setHours(r.getHours()+h); return r; }
function sameDay(a: Date, b: Date) { return a.toDateString() === b.toDateString(); }
function fmtTime(iso: string) { return new Date(iso).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',hour12:false}); }
function fmtDate(d: Date) { return d.toLocaleDateString([],{weekday:'short',month:'short',day:'numeric'}); }
function fmtWeek(ws: Date) {
  const we = addDays(ws, 6);
  return `${ws.toLocaleDateString([],{month:'short',day:'numeric'})} – ${we.toLocaleDateString([],{month:'short',day:'numeric',year:'numeric'})}`;
}
// Does the entry overlap [slotStart, slotEnd)?
function overlaps(entryStart: Date, entryEnd: Date, slotStart: Date, slotEnd: Date) {
  return entryStart < slotEnd && entryEnd > slotStart;
}

interface Instructor { id: number; first_name: string; last_name: string; }

const HOURS = Array.from({length: 16}, (_, i) => i + 6); // 06:00 – 21:00
const STATUS_META: Record<string, {label: string; bg: string; color: string}> = {
  RESERVED:  { label: 'Reserved',   bg: '#dbeafe', color: '#1e40af' },
  COMPLETED: { label: 'Completed',  bg: '#dcfce7', color: '#15803d' },
  CANCELED:  { label: 'Cancelled',  bg: '#f3f4f6', color: '#6b7280' },
};

export default function ReservationsPage() {
  const { user } = useAuth();

  const [tab, setTab] = useState<'book'|'mine'>('book');
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const days = Array.from({length: 7}, (_, i) => addDays(weekStart, i));

  // Data
  const [instructors,   setInstructors]   = useState<Instructor[]>([]);
  const [allAircraft,   setAllAircraft]   = useState<Aircraft[]>([]);
  const [scheduleMap,   setScheduleMap]   = useState<Record<number, ScheduleEntry[]>>({});
  const [reservations,  setReservations]  = useState<Reservation[]>([]);
  const [myReservations,setMyReservations]= useState<Reservation[]>([]);
  const [loading,       setLoading]       = useState(true);

  // Selected instructor filter (null = show all)
  const [selectedInstructor, setSelectedInstructor] = useState<number | null>(null);

  // Modal
  const [bookingSlot,  setBookingSlot]  = useState<{start: string; instructorId: number|null}|null>(null);
  const [cancelTarget, setCancelTarget] = useState<Reservation|null>(null);

  // Load static data once
  useEffect(() => {
    Promise.all([
      fetchUsers({ role: 'INSTRUCTOR', pageSize: 100 } as any).then(r => setInstructors(r.data as any)),
      fetchAircraft({ pageSize: 100, status: 'READY' }).then(r => setAllAircraft(r.data)),
    ]);
  }, []);

  const loadWeek = useCallback(async () => {
    setLoading(true);
    const dateFrom = weekStart.toISOString();
    const dateTo   = addDays(weekStart, 7).toISOString();
    try {
      // Fetch schedule blocks for all instructors in this week
      const schedResult = await fetchSchedule({ pageSize: 200, sortBy: 'date_start', sortOrder: 'asc' });
      // Group by instructor
      const map: Record<number, ScheduleEntry[]> = {};
      schedResult.data.forEach(e => {
        if (!map[e.instructor_id]) map[e.instructor_id] = [];
        map[e.instructor_id].push(e);
      });
      setScheduleMap(map);

      // Reservations in this week (for calendar display)
      const resResult = await fetchReservations({ date_from: dateFrom, date_to: dateTo, pageSize: 200 });
      setReservations(resResult.data);
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  const loadMine = useCallback(async () => {
    if (!user) return;
    const r = await fetchReservations({ user_id: user.id, pageSize: 100, sortBy: 'date_start', sortOrder: 'desc' });
    setMyReservations(r.data);
  }, [user]);

  useEffect(() => { loadWeek(); }, [loadWeek]);
  useEffect(() => { if (tab === 'mine') loadMine(); }, [tab, loadMine]);

  // ── Calendar helpers ──────────────────────────────────────────────────────
  function isBusy(instructorId: number, day: Date, hour: number): 'busy'|'booked'|'free' {
    const slotStart = new Date(day); slotStart.setHours(hour, 0, 0, 0);
    const slotEnd   = addHours(slotStart, 1);

    // Check manual schedule blocks
    const blocks = scheduleMap[instructorId] ?? [];
    const blocked = blocks.some(e =>
      e.activity_type !== 'INSTRUCTION' &&
      overlaps(new Date(e.date_start), new Date(e.date_end), slotStart, slotEnd)
    );
    if (blocked) return 'busy';

    // Check existing reservations
    const booked = reservations.some(r =>
      r.instructor_id === instructorId &&
      r.status !== 'CANCELED' &&
      overlaps(new Date(r.date_start), new Date(r.date_end), slotStart, slotEnd)
    );
    if (booked) return 'booked';

    return 'free';
  }

  function openBooking(day: Date, hour: number, instructorId: number | null) {
    const start = new Date(day); start.setHours(hour, 0, 0, 0);
    setBookingSlot({ start: start.toISOString(), instructorId });
  }

  async function handleBook(data: import('../types/reservation').ReservationFormData) {
    await createReservation(data);
    setBookingSlot(null);
    await loadWeek();
    if (tab === 'mine') await loadMine();
  }

  async function handleCancel() {
    if (!cancelTarget) return;
    await updateReservation(cancelTarget.id, { status: 'CANCELED' });
    setCancelTarget(null);
    await loadWeek();
    await loadMine();
  }

  const displayedInstructors = selectedInstructor
    ? instructors.filter(i => i.id === selectedInstructor)
    : instructors;

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
        <button className="btn btn-primary" onClick={() => openBooking(new Date(), new Date().getHours(), null)}>
          + Reserve a Slot
        </button>
      </div>

      {/* Tabs */}
      <div className="res-tabs">
        <button className={`res-tab${tab==='book'?' res-tab--active':''}`} onClick={() => setTab('book')}>
          📅 Instructor Availability
        </button>
        <button className={`res-tab${tab==='mine'?' res-tab--active':''}`} onClick={() => setTab('mine')}>
          🎓 My Reservations
        </button>
      </div>

      {/* ── AVAILABILITY CALENDAR ── */}
      {tab === 'book' && (
        <>
          {/* Instructor selector */}
          <div className="instructor-pills">
            <button
              className={`instructor-pill${selectedInstructor === null ? ' instructor-pill--active' : ''}`}
              onClick={() => setSelectedInstructor(null)}
            >
              All Instructors
            </button>
            {instructors.map(i => (
              <button
                key={i.id}
                className={`instructor-pill${selectedInstructor === i.id ? ' instructor-pill--active' : ''}`}
                onClick={() => setSelectedInstructor(i.id === selectedInstructor ? null : i.id)}
              >
                {i.first_name} {i.last_name}
              </button>
            ))}
          </div>

          {/* Legend */}
          <div className="cal-legend">
            <span className="cal-legend-item cal-legend-item--free">Available — click to book</span>
            <span className="cal-legend-item cal-legend-item--booked">Reserved</span>
            <span className="cal-legend-item cal-legend-item--busy">Unavailable</span>
          </div>

          {/* Week nav */}
          <div className="week-nav" style={{marginBottom:'0.75rem'}}>
            <button className="btn btn-secondary btn-page" onClick={() => setWeekStart(w => addDays(w,-7))}>‹</button>
            <span className="week-label">{fmtWeek(weekStart)}</span>
            <button className="btn btn-secondary btn-page" onClick={() => setWeekStart(w => addDays(w, 7))}>›</button>
            <button className="btn btn-secondary btn-today" onClick={() => setWeekStart(startOfWeek(new Date()))}>Today</button>
          </div>

          {loading ? (
            <p className="res-state">Loading availability…</p>
          ) : displayedInstructors.length === 0 ? (
            <p className="res-state">No instructors found.</p>
          ) : (
            <div className="cal-scroll">
              {displayedInstructors.map(instructor => (
                <div key={instructor.id} className="cal-instructor-block">
                  <div className="cal-instructor-name">
                    <span className="cal-avatar">
                      {instructor.first_name[0]}{instructor.last_name[0]}
                    </span>
                    {instructor.first_name} {instructor.last_name}
                    <button
                      className="btn-book-any"
                      onClick={() => openBooking(new Date(), new Date().getHours(), instructor.id)}
                    >
                      Book
                    </button>
                  </div>

                  <div className="cal-grid-wrapper">
                    {/* Header row */}
                    <div className="cal-grid" style={{gridTemplateColumns:`60px repeat(7, 1fr)`}}>
                      <div className="cal-time-header" />
                      {days.map(d => (
                        <div key={d.toISOString()} className={`cal-day-header${sameDay(d, new Date()) ? ' cal-day-header--today' : ''}`}>
                          {fmtDate(d)}
                        </div>
                      ))}

                      {/* Time rows */}
                      {HOURS.map(hour => (
                        <>
                          <div key={`t${hour}`} className="cal-time-label">{String(hour).padStart(2,'0')}:00</div>
                          {days.map(day => {
                            const status = isBusy(instructor.id, day, hour);
                            const isPast = new Date(day).setHours(hour+1) < Date.now();
                            return (
                              <div
                                key={day.toISOString()+hour}
                                className={`cal-cell cal-cell--${status}${isPast?' cal-cell--past':''}`}
                                onClick={() => !isPast && status === 'free' && openBooking(day, hour, instructor.id)}
                                title={status === 'free' && !isPast ? `Book ${instructor.first_name} on ${fmtDate(day)} at ${String(hour).padStart(2,'0')}:00` : undefined}
                              >
                                {status === 'booked' && <span className="cal-cell-label">Booked</span>}
                                {status === 'busy'   && <span className="cal-cell-label">Blocked</span>}
                              </div>
                            );
                          })}
                        </>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* No-instructor booking */}
          <div className="solo-booking">
            <div>
              <p className="solo-booking-title">✈️ Solo / Aircraft-only reservation</p>
              <p className="solo-booking-desc">Reserve a time slot and aircraft without an instructor.</p>
            </div>
            <button className="btn btn-secondary" onClick={() => openBooking(new Date(), new Date().getHours(), null)}>
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
                const durLabel = `${Math.floor(dur/60) > 0 ? Math.floor(dur/60)+'h ' : ''}${dur%60 > 0 ? dur%60+'m' : ''}`;
                return (
                  <div key={r.id} className="res-card" style={{borderLeftColor: meta.color}}>
                    <div className="res-card-top">
                      <div>
                        <span className="res-card-date">
                          {start.toLocaleDateString([],{weekday:'short',month:'short',day:'numeric',year:'numeric'})}
                        </span>
                        <span className="res-card-time"> · {fmtTime(r.date_start)} – {fmtTime(r.date_end)} ({durLabel})</span>
                      </div>
                      <span className="res-status-badge" style={{background: meta.bg, color: meta.color}}>
                        {meta.label}
                      </span>
                    </div>
                    <div className="res-card-details">
                      {r.instructor && <span>👨‍✈️ {r.instructor.first_name} {r.instructor.last_name}</span>}
                      {r.aircraft   && <span>✈️ {r.aircraft.tail_number} — {r.aircraft.make} {r.aircraft.model}</span>}
                      {!r.instructor && !r.aircraft && <span className="res-card-solo">Solo / no aircraft</span>}
                    </div>
                    {r.status === 'RESERVED' && (
                      <div className="res-card-actions">
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

      {/* Modals */}
      {bookingSlot && (
        <ReservationFormModal
          userId={user.id}
          instructors={instructors}
          aircraft={allAircraft}
          defaultStart={bookingSlot.start}
          defaultInstructorId={bookingSlot.instructorId}
          onSave={handleBook}
          onClose={() => setBookingSlot(null)}
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
