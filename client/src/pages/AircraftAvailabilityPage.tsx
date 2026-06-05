import { useCallback, useEffect, useState } from 'react';
import { fetchAircraft } from '../api/aircraft';
import { fetchReservations } from '../api/reservations';
import type { Aircraft, AircraftStatus } from '../types/aircraft';
import type { Reservation } from '../types/reservation';
import AircraftDetailModal from '../components/AircraftDetailModal';
import './AircraftAvailabilityPage.css';

// ── Helpers ───────────────────────────────────────────────────────────────────
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate()+n); return r; }
function sod(d: Date)                 { const r = new Date(d); r.setHours(0,0,0,0); return r; }
function fmtHour(h: number)           {
  const d = new Date(); d.setHours(h, 0, 0, 0);
  return d.toLocaleTimeString([], { hour: 'numeric', hour12: true });
}
function fmtFullDate(d: Date) {
  return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}
function overlaps(s1: Date, e1: Date, s2: Date, e2: Date) { return s1 < e2 && e1 > s2; }

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6 AM – 9 PM

const STATUS_META: Record<AircraftStatus, { label: string; bg: string; color: string }> = {
  READY:         { label: 'Ready',         bg: '#dcfce7', color: '#15803d' },
  MAINTENANCE:   { label: 'Maintenance',   bg: '#fef9c3', color: '#a16207' },
  NOT_AVAILABLE: { label: 'Not Available', bg: '#fee2e2', color: '#b91c1c' },
};

type CellState = 'available' | 'reserved' | 'unavailable' | 'past';

export default function AircraftAvailabilityPage() {
  const [activeDay,   setActiveDay]   = useState(() => sod(new Date()));
  const [aircraft,    setAircraft]    = useState<Aircraft[]>([]);
  const [reservations,setReservations]= useState<Reservation[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [selected,    setSelected]    = useState<Aircraft | null>(null);
  const [statusFilter,setStatusFilter]= useState<AircraftStatus | ''>('');

  // Load all aircraft once
  useEffect(() => {
    fetchAircraft({ pageSize: 100, sortBy: 'tail_number', sortOrder: 'asc' })
      .then(r => setAircraft(r.data));
  }, []);

  const loadDay = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetchReservations({
        date_from: activeDay.toISOString(),
        date_to:   addDays(activeDay, 1).toISOString(),
        pageSize:  200,
      });
      setReservations(r.data);
    } finally {
      setLoading(false);
    }
  }, [activeDay]);

  useEffect(() => { loadDay(); }, [loadDay]);

  function cellState(ac: Aircraft, hour: number): CellState {
    // Past slots
    const slotStart = new Date(activeDay); slotStart.setHours(hour,   0, 0, 0);
    const slotEnd   = new Date(activeDay); slotEnd.setHours(  hour+1, 0, 0, 0);
    if (slotEnd.getTime() < Date.now()) return 'past';

    // Aircraft itself unavailable
    if (ac.status !== 'READY') return 'unavailable';

    // Active reservation in this slot
    const booked = reservations.some(r =>
      r.aircraft_id === ac.id &&
      r.status !== 'CANCELED' &&
      overlaps(new Date(r.date_start), new Date(r.date_end), slotStart, slotEnd)
    );
    return booked ? 'reserved' : 'available';
  }

  const isToday = sod(new Date()).getTime() === activeDay.getTime();

  const displayed = statusFilter
    ? aircraft.filter(a => a.status === statusFilter)
    : aircraft;

  // Summary counts for the active day
  const summary = { available: 0, reserved: 0, unavailable: 0 };
  aircraft.forEach(ac => {
    if (ac.status !== 'READY') { summary.unavailable++; return; }
    const dayBooked = HOURS.some(h => cellState(ac, h) === 'reserved');
    if (dayBooked) summary.reserved++;
    else summary.available++;
  });

  return (
    <div className="acav-page">
      <div className="page-header">
        <div>
          <h1>Aircraft Availability</h1>
          <p className="page-subtitle">{aircraft.length} aircraft in fleet</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="acav-summary">
        {([
          { key: '',              label: 'All Aircraft',  value: aircraft.length,      color: '#6366f1', bg: '#ede9fe' },
          { key: 'READY',         label: 'Available',     value: summary.available,    color: '#15803d', bg: '#dcfce7' },
          { key: 'MAINTENANCE',   label: 'In Maintenance',value: summary.reserved,     color: '#a16207', bg: '#fef9c3' },
          { key: 'NOT_AVAILABLE', label: 'Not Available', value: summary.unavailable,  color: '#b91c1c', bg: '#fee2e2' },
        ] as const).map(s => (
          <button
            key={s.key}
            className={`acav-summary-card${statusFilter === s.key ? ' acav-summary-card--active' : ''}`}
            style={{ '--sc': s.color, '--sc-bg': s.bg } as React.CSSProperties}
            onClick={() => setStatusFilter(statusFilter === s.key ? '' : s.key as any)}
          >
            <span className="acav-summary-value">{s.value}</span>
            <span className="acav-summary-label">{s.label}</span>
          </button>
        ))}
      </div>

      {/* Day nav */}
      <div className="day-nav">
        <button className="btn btn-secondary btn-page" onClick={() => setActiveDay(d => addDays(d,-1))}>‹</button>
        <span className={`day-nav-label${isToday ? ' day-nav-label--today' : ''}`}>
          {fmtFullDate(activeDay)}
        </span>
        <button className="btn btn-secondary btn-page" onClick={() => setActiveDay(d => addDays(d, 1))}>›</button>
        {!isToday && (
          <button className="btn btn-secondary btn-today" onClick={() => setActiveDay(sod(new Date()))}>Today</button>
        )}
      </div>

      {/* Legend */}
      <div className="cal-legend">
        <span className="cal-legend-item cal-legend-item--available">Available</span>
        <span className="cal-legend-item cal-legend-item--reserved">Reserved</span>
        <span className="cal-legend-item cal-legend-item--unavailable">Unavailable / Maintenance</span>
        <span className="cal-legend-item cal-legend-item--past">Past</span>
      </div>

      {/* Table */}
      {loading ? (
        <p className="acav-state">Loading…</p>
      ) : displayed.length === 0 ? (
        <p className="acav-state">No aircraft found.</p>
      ) : (
        <div className="acav-table-wrapper">
          <table className="acav-table">
            <thead>
              <tr>
                <th className="acav-th-aircraft">Aircraft</th>
                <th className="acav-th-status">Status</th>
                {HOURS.map(h => (
                  <th key={h} className="acav-th-hour">{fmtHour(h)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayed.map(ac => {
                const meta = STATUS_META[ac.status];
                return (
                  <tr
                    key={ac.id}
                    className="acav-row"
                    onClick={() => setSelected(ac)}
                    title="Click to view aircraft details"
                  >
                    {/* Aircraft info */}
                    <td className="acav-td-aircraft">
                      <div className="acav-aircraft-info">
                        <span className="acav-tail">{ac.tail_number}</span>
                        <span className="acav-make-model">{ac.make} {ac.model}</span>
                      </div>
                    </td>

                    {/* Status badge */}
                    <td className="acav-td-status">
                      <span className="acav-status-badge" style={{ background: meta.bg, color: meta.color }}>
                        {meta.label}
                      </span>
                    </td>

                    {/* Hour cells */}
                    {HOURS.map(hour => {
                      const state = cellState(ac, hour);
                      return (
                        <td
                          key={hour}
                          className={`acav-cell acav-cell--${state}`}
                          onClick={e => e.stopPropagation()} // cells don't open modal
                        >
                          {state === 'reserved'    && <span className="acav-dot acav-dot--reserved" />}
                          {state === 'unavailable' && <span className="acav-dot acav-dot--unavailable" />}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <AircraftDetailModal aircraft={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
