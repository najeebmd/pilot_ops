import { useEffect, useState } from 'react';
import { fetchUsers } from '../api/users';
import type { User } from '../types/user';
import './InstructorsPage.css';

export default function InstructorsPage() {
  const [instructors, setInstructors] = useState<User[]>([]);
  const [total,       setTotal]       = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [debounce,    setDebounce]    = useState<ReturnType<typeof setTimeout>|null>(null);
  const [viewTarget,  setViewTarget]  = useState<User|null>(null);

  useEffect(() => { load(); }, [search]);

  async function load() {
    setLoading(true);
    try {
      const r = await fetchUsers({ role: 'INSTRUCTOR', pageSize: 100, sortBy: 'first_name', sortOrder: 'asc', search: search || undefined });
      setInstructors(r.data);
      setTotal(r.total);
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

      {/* Search */}
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
          {instructors.map(instr => (
            <div key={instr.id} className="instr-card" onClick={() => setViewTarget(instr === viewTarget ? null : instr)}>
              <div className="instr-card-avatar">
                {instr.first_name[0]}{instr.last_name[0]}
              </div>
              <div className="instr-card-body">
                <p className="instr-card-name">{instr.first_name} {instr.last_name}</p>
                <p className="instr-card-email">{instr.email}</p>
                {instr.phone && <p className="instr-card-phone">{instr.phone}</p>}
                <div className="instr-card-roles">
                  {instr.roles.map(r => (
                    <span key={r.id} className="instr-role-badge">{r.role.name}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail panel */}
      {viewTarget && (
        <div className="instr-detail-backdrop" onClick={() => setViewTarget(null)}>
          <div className="instr-detail" onClick={e => e.stopPropagation()}>
            <div className="instr-detail-header">
              <div>
                <p className="instr-detail-name">{viewTarget.first_name} {viewTarget.last_name}</p>
                <p className="instr-detail-email">{viewTarget.email}</p>
              </div>
              <button className="btn-icon" onClick={() => setViewTarget(null)}>✕</button>
            </div>
            <div className="instr-detail-body">
              {[
                ['Phone', viewTarget.phone],
                ['Date of Birth', viewTarget.date_of_birth
                  ? new Date(viewTarget.date_of_birth).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
                  : null],
                ['Address', [viewTarget.address_line1, viewTarget.address_line2, viewTarget.city, viewTarget.state, viewTarget.postal_code, viewTarget.country].filter(Boolean).join(', ')],
              ].map(([label, val]) => val ? (
                <div key={label as string} className="instr-detail-row">
                  <span className="instr-detail-label">{label}</span>
                  <span className="instr-detail-val">{val}</span>
                </div>
              ) : null)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
