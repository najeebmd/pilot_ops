import { useEffect, useState } from 'react';
import { fetchUsers } from '../api/users';
import type { User } from '../types/user';
import { useAuth } from '../context/AuthContext';
import InstructorEditModal from '../components/InstructorEditModal';
import './InstructorsPage.css';

interface InstructorInfo { rate: number | null; status: string }
interface RateMap { [instructor_id: number]: InstructorInfo }

function authHeaders(): Record<string, string> {
  const t = localStorage.getItem('po_token');
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function fetchRates(): Promise<RateMap> {
  try {
    const res = await fetch('/api/instructor-rates', { headers: authHeaders() });
    if (!res.ok) return {};
    const data: { instructor_id: number; regular_rate: number; status: string }[] = await res.json();
    return Object.fromEntries(data.map(r => [r.instructor_id, { rate: r.regular_rate, status: r.status }]));
  } catch {
    return {};
  }
}

async function putInstructorInfo(instructorId: number, rate: number, status: string): Promise<void> {
  const res = await fetch(`/api/instructor-rates/${instructorId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ regular_rate: rate, status }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Failed to save');
  }
}

export default function InstructorsPage() {
  const { user }   = useAuth();
  const canEdit    = ['ADMIN', 'STAFF'].some(r => user?.roles.includes(r));

  const [instructors, setInstructors] = useState<User[]>([]);
  const [rates,       setRates]       = useState<RateMap>({});
  const [total,       setTotal]       = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [debounce,    setDebounce]    = useState<ReturnType<typeof setTimeout>|null>(null);
  const [editing,     setEditing]     = useState<User | null>(null);

  useEffect(() => { load(); }, [search]);

  async function load() {
    setLoading(true);
    try {
      const [usersResult, rateMap] = await Promise.all([
        fetchUsers({ role: 'INSTRUCTOR', pageSize: 100, sortBy: 'first_name', sortOrder: 'asc', search: search || undefined }),
        fetchRates(),
      ]);
      setInstructors(usersResult.data);
      setTotal(usersResult.total);
      setRates(rateMap);
    } finally {
      setLoading(false);
    }
  }

  function handleSearchInput(v: string) {
    setSearchInput(v);
    if (debounce) clearTimeout(debounce);
    setDebounce(setTimeout(() => setSearch(v.trim()), 350));
  }

  async function handleSave(rate: number, status: string) {
    if (!editing) return;
    await putInstructorInfo(editing.id, rate, status);
    setEditing(null);
    await load();
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Instructors</h1>
          <p className="page-subtitle">{total} instructor{total !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="users-search-bar">
        <input
          className="search-input"
          placeholder="Search by name or email…"
          value={searchInput}
          onChange={e => handleSearchInput(e.target.value)}
        />
        {searchInput && (
          <button className="search-clear-btn" onClick={() => { setSearchInput(''); setSearch(''); }}>✕</button>
        )}
      </div>

      {loading ? (
        <p style={{padding:'3rem',textAlign:'center',color:'#9ca3af'}}>Loading…</p>
      ) : instructors.length === 0 ? (
        <p style={{padding:'3rem',textAlign:'center',color:'#9ca3af'}}>No instructors found.</p>
      ) : (
        <div className="instr-grid">
          {instructors.map(instr => {
            const info     = rates[instr.id];
            const inactive = info?.status === 'INACTIVE';
            return (
              <div
                key={instr.id}
                className={`instr-card${canEdit ? '' : ' instr-card--static'}${inactive ? ' instr-card--inactive' : ''}`}
                onClick={canEdit ? () => setEditing(instr) : undefined}
                title={canEdit ? 'Click to edit' : undefined}
              >
                <div className="instr-card-avatar">
                  {instr.first_name[0]}{instr.last_name[0]}
                </div>
                <div className="instr-card-body">
                  <div className="instr-card-name-row">
                    <p className="instr-card-name">{instr.first_name} {instr.last_name}</p>
                    {inactive && <span className="instr-status-badge">Inactive</span>}
                  </div>
                  {info?.rate != null && (
                    <span className="instr-rate-badge">
                      ${info.rate.toFixed(2)}<span className="instr-rate-unit">/hr</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <InstructorEditModal
          instructor={editing}
          rate={rates[editing.id]?.rate ?? null}
          status={rates[editing.id]?.status ?? 'ACTIVE'}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
