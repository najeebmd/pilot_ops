import { useEffect, useState } from 'react';
import { fetchUsers } from '../api/users';
import type { User } from '../types/user';
import './InstructorsPage.css';

interface RateMap { [instructor_id: number]: number }

function authHeaders(): Record<string, string> {
  const t = localStorage.getItem('po_token');
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function fetchRates(): Promise<RateMap> {
  try {
    const res = await fetch('/api/instructor-rates', { headers: authHeaders() });
    if (!res.ok) return {};
    const data: { instructor_id: number; regular_rate: number }[] = await res.json();
    return Object.fromEntries(data.map(r => [r.instructor_id, r.regular_rate]));
  } catch {
    return {};
  }
}

export default function InstructorsPage() {
  const [instructors, setInstructors] = useState<User[]>([]);
  const [rates,       setRates]       = useState<RateMap>({});
  const [total,       setTotal]       = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [debounce,    setDebounce]    = useState<ReturnType<typeof setTimeout>|null>(null);

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
            const rate = rates[instr.id];
            return (
              <div key={instr.id} className="instr-card instr-card--static">
                <div className="instr-card-avatar">
                  {instr.first_name[0]}{instr.last_name[0]}
                </div>
                <div className="instr-card-body">
                  <p className="instr-card-name">{instr.first_name} {instr.last_name}</p>
                  {rate != null && (
                    <span className="instr-rate-badge">
                      ${rate.toFixed(2)}<span className="instr-rate-unit">/hr</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
