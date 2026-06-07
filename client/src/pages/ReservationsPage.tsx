import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchReservations, createReservation, updateReservation, deleteReservation } from '../api/reservations';
import { fetchAircraft } from '../api/aircraft';
import { fetchSchedule } from '../api/schedule';
import { fetchAircraftSchedule } from '../api/aircraftSchedule';
import type { AircraftScheduleEntry } from '../api/aircraftSchedule';
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

  const [tab,       setTab]       = useState<'book'|'fleet'|'mine'>('book');
  const [activeDay, setActiveDay] = useState(() => sod(new Date()));

  const [instructors,       setInstructors]       = useState<Instructor[]>([]);
  const [allAircraft,       setAllAircraft]       = useState<Aircraft[]>([]);
  const [aircraftSchedules, setAircraftSchedules] = useState<AircraftScheduleEntry[]>([]);

  const isAdminOrStaff = user?.roles.some(r => r === 'ADMIN' || r === 'STAFF') ?? false;
  const [scheduleMap,    setScheduleMap]    = useState<Record<number, ScheduleEntry[]>>({});
  const [reservations,   setReservations]   = useState<Reservation[]>([]);
  const [myReservations, setMyReservations] = useState<Reservation[]>([]);
  const [loading,        setLoading]        = useState(true);

  // Instructor visibility: empty Set = all visible
  const [hiddenInstructors, setHiddenInstructors] = useState<Set<number>>(new Set());

  function toggleInstructor(id: number) {
    setHiddenInstructors(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function showAllInstructors()  { setHiddenInstructors(new Set()); }
  function hideAllInstructors()  { setHiddenInstructors(new Set(instructors.map(i => i.id))); }

  // Aircraft visibility filter
  const [hiddenAircraft, setHiddenAircraft] = useState<Set<number>>(new Set());
  function toggleAircraft(id: number) {
    setHiddenAircraft(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function showAllAircraft() { setHiddenAircraft(new Set()); }
  function hideAllAircraft() { setHiddenAircraft(new Set(allAircraft.map(a => a.id))); }

  // Sorted aircraft: by make, then model, then tail number
  const sortedAircraft = [...allAircraft].sort((a, b) =>
    `${a.make} ${a.model} ${a.tail_number}`.localeCompare(`${b.make} ${b.model} ${b.tail_number}`)
  );

  const [bookingSlot,  setBookingSlot]  = useState<{start: string; instructorId: number|null; aircraftId?: number|null}|null>(null);
  const [editTarget,   setEditTarget]   = useState<Reservation|null>(null);
  const [cancelTarget, setCancelTarget] = useState<Reservation|null>(null);
  const [filterUserId, setFilterUserId] = useState<number | ''>('');

  // Date range filter for the All Reservations list (defaults to today → no upper bound)
  const todayStr = new Date().toISOString().slice(0, 10);
  const [listDateFrom, setListDateFrom] = useState(todayStr);
  const [listDateTo,   setListDateTo]   = useState('');

  // Load instructors + aircraft once
  useEffect(() => {
    const token = localStorage.getItem('po_token');
    const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

    fetch('/api/instructor-rates', { headers: authHeaders })
      .then(r => r.ok ? r.json() : [])
      .then((rates: { instructor_id: number; status: string; user: { id: number; first_name: string; last_name: string } }[]) => {
        const active = rates
          .filter(r => r.status !== 'INACTIVE')
          .map(r => ({ id: r.user.id, first_name: r.user.first_name, last_name: r.user.last_name }))
          .sort((a, b) => `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`));
        setInstructors(active);
      });
    fetchAircraft({ pageSize: 100 }).then(r => setAllAircraft(r.data));
  }, []);

  const loadDay = useCallback(async () => {
    setLoading(true);
    const dateFrom = activeDay.toISOString();
    const dateTo   = addDays(activeDay, 1).toISOString();
    try {
      const [schedResult, resResult, acSchedResult] = await Promise.all([
        fetchSchedule({ pageSize: 200, sortBy: 'date_start', sortOrder: 'asc' }),
        fetchReservations({ date_from: dateFrom, date_to: dateTo, pageSize: 200 }),
        fetchAircraftSchedule({ date_from: dateFrom, date_to: dateTo, pageSize: 500 }),
      ]);
      const map: Record<number, ScheduleEntry[]> = {};
      schedResult.data.forEach(e => {
        if (!map[e.instructor_id]) map[e.instructor_id] = [];
        map[e.instructor_id].push(e);
      });
      setScheduleMap(map);
      setReservations(resResult.data);
      setAircraftSchedules(acSchedResult.data);
    } finally {
      setLoading(false);
    }
  }, [activeDay]);

  const loadMine = useCallback(async () => {
    if (!user) return;
    const dateParams = {
      ...(listDateFrom ? { start_from: new Date(listDateFrom).toISOString() } : {}),
      ...(listDateTo   ? { start_to:   new Date(listDateTo + 'T23:59:59').toISOString() } : {}),
    };
    const params = isAdminOrStaff
      ? { pageSize: 500, sortBy: 'date_start', sortOrder: 'desc' as const, ...dateParams }
      : { user_id: user.id, pageSize: 200, sortBy: 'date_start', sortOrder: 'desc' as const, ...dateParams };
    const r = await fetchReservations(params);
    setMyReservations(r.data);
  }, [user, isAdminOrStaff, listDateFrom, listDateTo]);

  useEffect(() => { loadDay(); }, [loadDay]);
  useEffect(() => { if (tab === 'mine') loadMine(); }, [tab, loadMine, listDateFrom, listDateTo]);

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

  function openBooking(hour: number, instructorId: number | null, aircraftId?: number | null) {
    const start = new Date(activeDay); start.setHours(hour, 0, 0, 0);
    setBookingSlot({ start: start.toISOString(), instructorId, aircraftId });
  }

  // ── Fleet cell helpers ────────────────────────────────────────────────────
  function fleetCellState(ac: Aircraft, hour: number): 'available'|'reserved'|'unavailable'|'past' {
    const slotStart = new Date(activeDay); slotStart.setHours(hour,   0, 0, 0);
    const slotEnd   = new Date(activeDay); slotEnd.setHours(  hour+1, 0, 0, 0);
    if (slotEnd.getTime() < Date.now()) return 'past';
    if (ac.status !== 'READY') return 'unavailable';

    // Primary: check AircraftSchedule (covers MAINTENANCE, NOT_AVAILABLE, RESERVED blocks)
    const entry = aircraftSchedules.find(e =>
      e.aircraft_id === ac.id &&
      overlaps(new Date(e.date_start), new Date(e.date_end), slotStart, slotEnd)
    );
    if (entry) {
      return entry.activity_type === 'RESERVED' ? 'reserved' : 'unavailable';
    }

    // Fallback: check Reservation table directly (catches any reservation without a
    // linked AircraftSchedule entry, e.g. created before the auto-creation logic)
    const directBooking = reservations.find(r =>
      r.aircraft_id === ac.id &&
      r.status !== 'CANCELED' &&
      overlaps(new Date(r.date_start), new Date(r.date_end), slotStart, slotEnd)
    );
    if (directBooking) return 'reserved';

    return 'available';
  }

  function findAircraftReservation(ac: Aircraft, hour: number): Reservation | null {
    const slotStart = new Date(activeDay); slotStart.setHours(hour,   0, 0, 0);
    const slotEnd   = new Date(activeDay); slotEnd.setHours(  hour+1, 0, 0, 0);
    return reservations.find(r =>
      r.aircraft_id === ac.id &&
      r.status !== 'CANCELED' &&
      overlaps(new Date(r.date_start), new Date(r.date_end), slotStart, slotEnd)
    ) ?? null;
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

  async function handleDeleteReservation() {
    if (!editTarget) return;
    await deleteReservation(editTarget.id);
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
        <button className={`res-tab${tab==='fleet'?' res-tab--active':''}`} onClick={() => setTab('fleet')}>
          ✈️ Fleet Availability
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

          {/* Instructor filter */}
          {instructors.length > 0 && (
            <div className="instructor-filter">
              <div className="instructor-filter-header">
                <span className="instructor-filter-label">
                  Instructors
                  <span className="instructor-filter-count">
                    {instructors.length - hiddenInstructors.size} of {instructors.length} shown
                  </span>
                </span>
                <div className="instructor-filter-actions">
                  <button
                    className="btn-filter-ctrl"
                    onClick={showAllInstructors}
                    disabled={hiddenInstructors.size === 0}
                  >
                    Show All
                  </button>
                  <button
                    className="btn-filter-ctrl"
                    onClick={hideAllInstructors}
                    disabled={hiddenInstructors.size === instructors.length}
                  >
                    Hide All
                  </button>
                </div>
              </div>
              <div className="instructor-toggles">
                {instructors.map(i => {
                  const visible = !hiddenInstructors.has(i.id);
                  return (
                    <button
                      key={i.id}
                      className={`instructor-toggle${visible ? ' instructor-toggle--on' : ' instructor-toggle--off'}`}
                      onClick={() => toggleInstructor(i.id)}
                      title={visible ? `Hide ${i.first_name}` : `Show ${i.first_name}`}
                    >
                      <span className="instructor-toggle-dot" />
                      {i.first_name} {i.last_name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

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
          ) : hiddenInstructors.size === instructors.length ? (
            <p className="res-state">All instructors hidden. Use the filter above to show instructors.</p>
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
                  {instructors.filter(i => !hiddenInstructors.has(i.id)).map(instructor => (
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
                            title={canBook ? `Reserve ${instructor.first_name} at ${fmtHour(hour)}`
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
                          Reserve
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

      {/* ── FLEET AVAILABILITY ── */}
      {tab === 'fleet' && (
        <>
          <div className="day-nav">
            <button className="btn btn-secondary btn-page" onClick={() => setActiveDay(d => addDays(d,-1))}>‹</button>
            <span className={`day-nav-label${isToday?' day-nav-label--today':''}`}>{fmtFullDate(activeDay)}</span>
            <button className="btn btn-secondary btn-page" onClick={() => setActiveDay(d => addDays(d, 1))}>›</button>
            {!isToday && <button className="btn btn-secondary btn-today" onClick={() => setActiveDay(sod(new Date()))}>Today</button>}
          </div>

          {/* Aircraft filter */}
          {sortedAircraft.length > 0 && (
            <div className="instructor-filter">
              <div className="instructor-filter-header">
                <span className="instructor-filter-label">
                  Aircraft
                  <span className="instructor-filter-count">
                    {sortedAircraft.length - hiddenAircraft.size} of {sortedAircraft.length} shown
                  </span>
                </span>
                <div className="instructor-filter-actions">
                  <button className="btn-filter-ctrl" onClick={showAllAircraft} disabled={hiddenAircraft.size === 0}>Show All</button>
                  <button className="btn-filter-ctrl" onClick={hideAllAircraft} disabled={hiddenAircraft.size === sortedAircraft.length}>Hide All</button>
                </div>
              </div>
              <div className="instructor-toggles">
                {sortedAircraft.map(ac => {
                  const visible = !hiddenAircraft.has(ac.id);
                  return (
                    <button
                      key={ac.id}
                      className={`instructor-toggle${visible ? ' instructor-toggle--on' : ' instructor-toggle--off'}`}
                      onClick={() => toggleAircraft(ac.id)}
                      title={visible ? `Hide ${ac.tail_number}` : `Show ${ac.tail_number}`}
                    >
                      <span className="instructor-toggle-dot" />
                      {ac.tail_number} — {ac.make} {ac.model}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="cal-legend">
            <span className="cal-legend-item cal-legend-item--free">Available — click to book</span>
            <span className="cal-legend-item cal-legend-item--booked">Reserved</span>
            <span className="cal-legend-item cal-legend-item--busy">Unavailable / Maintenance</span>
            <span className="cal-legend-item cal-legend-item--past">Past</span>
          </div>

          {loading ? (
            <p className="res-state">Loading…</p>
          ) : sortedAircraft.length === 0 ? (
            <p className="res-state">No aircraft found.</p>
          ) : hiddenAircraft.size === sortedAircraft.length ? (
            <p className="res-state">All aircraft hidden. Use the filter above to show aircraft.</p>
          ) : (
            <div className="big-table-wrapper" style={{marginBottom:'1.5rem'}}>
              <table className="avail-table">
                <thead>
                  <tr>
                    <th className="avail-th-instructor">Aircraft</th>
                    {HOURS.map(h => (
                      <th key={h} className="avail-th-hour">{fmtHour(h)}</th>
                    ))}
                    <th className="avail-th-action"></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAircraft.filter(ac => !hiddenAircraft.has(ac.id)).map(ac => (
                    <tr key={ac.id} className="avail-row">
                      <td className="avail-td-instructor">
                        <div className="avail-aircraft-info">
                          <span className="avail-instructor-name">{ac.tail_number}</span>
                          <span className="avail-aircraft-sub">{ac.make} {ac.model}</span>
                        </div>
                      </td>

                      {HOURS.map(hour => {
                        const state = fleetCellState(ac, hour);
                        const isPast    = state === 'past';
                        const canBook   = state === 'available';
                        const canEdit   = state === 'reserved' && isAdminOrStaff;
                        const isClickable = canBook || canEdit;
                        const cls = [
                          `avail-cell`,
                          isPast         ? 'avail-cell--past'
                            : state === 'available'   ? 'avail-cell--free'
                            : state === 'reserved'    ? 'avail-cell--booked'
                            : 'avail-cell--busy',
                          canEdit ? 'avail-cell--editable' : '',
                        ].join(' ').trim();

                        function handleFleetCell() {
                          if (canBook) { openBooking(hour, null, ac.id); return; }
                          if (canEdit) {
                            const res = findAircraftReservation(ac, hour);
                            if (res) setEditTarget(res);
                          }
                        }

                        return (
                          <td
                            key={hour}
                            className={cls}
                            onClick={isClickable ? handleFleetCell : undefined}
                            style={isClickable ? { cursor: 'pointer' } : undefined}
                            title={
                              canBook ? `Reserve ${ac.tail_number} at ${fmtHour(hour)}`
                              : canEdit ? `Edit reservation at ${fmtHour(hour)}`
                              : state === 'reserved' ? 'Already reserved'
                              : state === 'unavailable' ? 'Unavailable / Maintenance'
                              : undefined
                            }
                          >
                            {state === 'reserved'    && !isPast && <span className="avail-cell-dot avail-cell-dot--booked" />}
                            {state === 'unavailable' && !isPast && <span className="avail-cell-dot avail-cell-dot--busy" />}
                          </td>
                        );
                      })}

                      <td className="avail-td-action">
                        <button
                          className="btn-book-quick"
                          onClick={() => openBooking(new Date().getHours(), null, ac.id)}
                        >
                          Reserve
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="solo-booking">
            <div>
              <p className="solo-booking-title">🧑‍✈️ Add an instructor to your flight</p>
              <p className="solo-booking-desc">Switch to Instructor Availability to book a slot with an instructor.</p>
            </div>
            <button className="btn btn-secondary" onClick={() => setTab('book')}>
              View Instructor Availability
            </button>
          </div>
        </>
      )}

      {/* ── MY RESERVATIONS ── */}
      {tab === 'mine' && (() => {
        const studentOptions = isAdminOrStaff
          ? [...new Map(myReservations.map(r => [r.user_id, r.user])).values()]
              .sort((a, b) => `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`))
          : [];
        const visibleReservations = filterUserId
          ? myReservations.filter(r => r.user_id === filterUserId)
          : myReservations;

        return (
        <div className="my-reservations">
          <div className="res-filters">
            <div className="res-filter-group">
              <label className="res-user-filter-label">Date from</label>
              <input
                type="date"
                className="res-date-input"
                value={listDateFrom}
                onChange={e => setListDateFrom(e.target.value)}
              />
            </div>
            <div className="res-filter-group">
              <label className="res-user-filter-label">Date to</label>
              <input
                type="date"
                className="res-date-input"
                value={listDateTo}
                min={listDateFrom || undefined}
                onChange={e => setListDateTo(e.target.value)}
              />
            </div>
            {(listDateFrom !== todayStr || listDateTo) && (
              <button
                className="res-user-filter-clear"
                onClick={() => { setListDateFrom(todayStr); setListDateTo(''); }}
              >
                ✕ Reset dates
              </button>
            )}
            {isAdminOrStaff && studentOptions.length > 0 && (
              <div className="res-filter-group res-filter-group--divider">
                <label className="res-user-filter-label">Student</label>
                <select
                  className="res-user-filter-select"
                  value={filterUserId}
                  onChange={e => setFilterUserId(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">All students</option>
                  {studentOptions.map(u => (
                    <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                  ))}
                </select>
                {filterUserId && (
                  <button className="res-user-filter-clear" onClick={() => setFilterUserId('')}>✕</button>
                )}
              </div>
            )}
          </div>
          {visibleReservations.length === 0 ? (
            <p className="res-state">{myReservations.length === 0 ? 'You have no reservations yet.' : 'No reservations match the filter.'}</p>
          ) : (
            <div className="res-list">
              {visibleReservations.map(r => {
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
        );
      })()}

      {bookingSlot && (
        <ReservationFormModal
          userId={user.id}
          instructors={instructors}
          aircraft={allAircraft}
          canSelectStudent={isAdminOrStaff}
          defaultStart={bookingSlot.start}
          defaultInstructorId={bookingSlot.instructorId}
          defaultAircraftId={bookingSlot.aircraftId}
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
          onDelete={handleDeleteReservation}
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
