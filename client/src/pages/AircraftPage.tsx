import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import type { Aircraft, AircraftFormData, AircraftStatus } from '../types/aircraft';
import { fetchAircraft, createAircraft, updateAircraft } from '../api/aircraft';
import AircraftFormModal from '../components/AircraftFormModal';
import './AircraftPage.css';

type SortKey = 'tail_number' | 'make' | 'model' | 'year_built' | 'flight_hours' | 'status' | 'rental_rate' | 'next_inspection_date';
type SortOrder = 'asc' | 'desc';

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];

const STATUS_META: Record<AircraftStatus, { label: string; bg: string; color: string }> = {
  READY:         { label: 'Ready',         bg: '#dcfce7', color: '#15803d' },
  MAINTENANCE:   { label: 'Maintenance',   bg: '#fef9c3', color: '#a16207' },
  NOT_AVAILABLE: { label: 'Not Available', bg: '#fee2e2', color: '#b91c1c' },
};

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '',              label: 'All' },
  { value: 'READY',         label: 'Ready' },
  { value: 'MAINTENANCE',   label: 'Maintenance' },
  { value: 'NOT_AVAILABLE', label: 'Not Available' },
];

interface Col { key: SortKey; label: string; }
const COLS: Col[] = [
  { key: 'tail_number',          label: 'Tail No.' },
  { key: 'make',                 label: 'Make' },
  { key: 'model',                label: 'Model' },
  { key: 'year_built',           label: 'Year' },
  { key: 'flight_hours',         label: 'Hours' },
  { key: 'status',               label: 'Status' },
  { key: 'rental_rate',          label: 'Rate/hr' },
  { key: 'next_inspection_date', label: 'Next Inspection' },
];

function fmt(n: number | null, prefix = '', suffix = '', decimals = 0) {
  if (n == null) return '—';
  return `${prefix}${n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;
}

export default function AircraftPage() {
  const { user } = useAuth();
  const canEdit  = user?.roles.some(r => r === 'ADMIN' || r === 'STAFF') ?? false;

  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);

  const [page, setPage]           = useState(1);
  const [pageSize, setPageSize]   = useState(10);
  const [sortBy, setSortBy]       = useState<SortKey>('tail_number');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [statusFilter, setStatusFilter] = useState('');

  const [editAircraft, setEditAircraft] = useState<Aircraft | null | undefined>(undefined);

  useEffect(() => { load(); }, [page, pageSize, sortBy, sortOrder, statusFilter]);

  async function load() {
    setLoading(true);
    try {
      const result = await fetchAircraft({ page, pageSize, sortBy, sortOrder, status: statusFilter || undefined });
      setAircraft(result.data);
      setTotal(result.total);
    } finally {
      setLoading(false);
    }
  }

  function handleSort(key: SortKey) {
    if (key === sortBy) setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(key); setSortOrder('asc'); }
    setPage(1);
  }

  async function handleSave(data: AircraftFormData) {
    if (editAircraft) {
      const updated = await updateAircraft(editAircraft.id, data);
      setAircraft((prev) => prev.map((a) => a.id === updated.id ? updated : a));
    } else {
      await createAircraft(data);
      setPage(1);
      await load();
    }
    setEditAircraft(undefined);
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function SortIcon({ col }: { col: SortKey }) {
    if (col !== sortBy) return <span className="sort-icon sort-icon--idle">↕</span>;
    return <span className="sort-icon sort-icon--active">{sortOrder === 'asc' ? '↑' : '↓'}</span>;
  }

  // Counts per status for summary cards
  const counts = { READY: 0, MAINTENANCE: 0, NOT_AVAILABLE: 0 } as Record<AircraftStatus, number>;
  aircraft.forEach((a) => counts[a.status]++);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Aircraft</h1>
          <p className="page-subtitle">{total} in fleet</p>
        </div>
        {canEdit && <button className="btn btn-primary" onClick={() => setEditAircraft(null)}>+ Add Aircraft</button>}
      </div>

      {/* Status summary cards */}
      <div className="aircraft-summary">
        {(Object.keys(STATUS_META) as AircraftStatus[]).map((s) => {
          const meta = STATUS_META[s];
          return (
            <button
              key={s}
              className={`summary-card${statusFilter === s ? ' summary-card--active' : ''}`}
              style={{ '--sc-color': meta.color, '--sc-bg': meta.bg } as React.CSSProperties}
              onClick={() => { setStatusFilter(statusFilter === s ? '' : s); setPage(1); }}
            >
              <span className="summary-card-value">{counts[s]}</span>
              <span className="summary-card-label">{meta.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filter bar */}
      <div className="aircraft-filters">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            className={`filter-tab${statusFilter === f.value ? ' filter-tab--active' : ''}`}
            onClick={() => { setStatusFilter(f.value); setPage(1); }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table className="users-table">
          <thead>
            <tr>
              {COLS.map((col) => (
                <th key={col.key} className="th-sortable" onClick={() => handleSort(col.key)}>
                  {col.label} <SortIcon col={col.key} />
                </th>
              ))}
              {canEdit && <th></th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={COLS.length + (canEdit ? 1 : 0)} className="td-state">Loading…</td></tr>
            ) : aircraft.length === 0 ? (
              <tr><td colSpan={COLS.length + (canEdit ? 1 : 0)} className="td-state">No aircraft found.</td></tr>
            ) : aircraft.map((a) => {
              const meta = STATUS_META[a.status];
              const inspectionDate = a.next_inspection_date ? new Date(a.next_inspection_date) : null;
              const inspectionSoon = inspectionDate && (inspectionDate.getTime() - Date.now()) < 30 * 24 * 60 * 60 * 1000;
              return (
                <tr key={a.id} className="table-row" onClick={canEdit ? () => setEditAircraft(a) : undefined}>
                  <td><span className="tail-number">{a.tail_number}</span></td>
                  <td>{a.make}</td>
                  <td>{a.model}</td>
                  <td>{a.year_built}</td>
                  <td>{a.flight_hours.toLocaleString(undefined, { maximumFractionDigits: 1 })} h</td>
                  <td>
                    <span className="status-badge" style={{ background: meta.bg, color: meta.color }}>
                      {meta.label}
                    </span>
                  </td>
                  <td>{fmt(a.rental_rate, '$', '/hr')}</td>
                  <td className={inspectionSoon ? 'inspection-soon' : ''}>
                    {inspectionDate
                      ? inspectionDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                      : '—'}
                    {inspectionSoon && ' ⚠'}
                  </td>
                  {canEdit && (
                    <td className="td-actions" onClick={(e) => e.stopPropagation()}>
                      <button className="btn-icon-sm" title="Edit" onClick={() => setEditAircraft(a)}>✏️</button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="pagination">
        <div className="pagination-left">
          <label className="page-size-label">
            Rows per page:
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
              {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <span className="pagination-info">
            {total === 0 ? '0' : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)}`} of {total}
          </span>
        </div>
        <div className="pagination-right">
          <button className="btn btn-secondary btn-page" onClick={() => setPage(1)}                  disabled={page === 1}>«</button>
          <button className="btn btn-secondary btn-page" onClick={() => setPage((p) => p - 1)}       disabled={page === 1}>‹</button>
          <span className="pagination-pages">Page {page} of {totalPages}</span>
          <button className="btn btn-secondary btn-page" onClick={() => setPage((p) => p + 1)}       disabled={page === totalPages}>›</button>
          <button className="btn btn-secondary btn-page" onClick={() => setPage(totalPages)}         disabled={page === totalPages}>»</button>
        </div>
      </div>

      {editAircraft !== undefined && (
        <AircraftFormModal
          aircraft={editAircraft}
          onSave={handleSave}
          onClose={() => setEditAircraft(undefined)}
        />
      )}
    </div>
  );
}
