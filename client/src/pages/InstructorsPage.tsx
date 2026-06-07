import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import InstructorEditModal from '../components/InstructorEditModal';
import './InstructorsPage.css';

interface InstructorRecord {
  instructor_id: number;
  regular_rate:  number;
  status:        string;
  user:          { id: number; first_name: string; last_name: string; email: string };
}

function authHeaders(): Record<string, string> {
  const t = localStorage.getItem('po_token');
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function fetchInstructors(): Promise<InstructorRecord[]> {
  try {
    const res = await fetch('/api/instructor-rates', { headers: authHeaders() });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
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

  const [records,      setRecords]      = useState<InstructorRecord[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [searchInput,  setSearchInput]  = useState('');
  const [search,       setSearch]       = useState('');
  const [debounce,     setDebounce]     = useState<ReturnType<typeof setTimeout> | null>(null);
  const [showInactive, setShowInactive] = useState(true);
  const [editing,      setEditing]      = useState<InstructorRecord | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchInstructors();
      setRecords(data);
    } finally {
      setLoading(false);
    }
  }

  function handleSearchInput(v: string) {
    setSearchInput(v);
    if (debounce) clearTimeout(debounce);
    setDebounce(setTimeout(() => setSearch(v.trim().toLowerCase()), 350));
  }

  async function handleSave(rate: number, status: string) {
    if (!editing) return;
    await putInstructorInfo(editing.instructor_id, rate, status);
    setEditing(null);
    await load();
  }

  const visible = records.filter(rec => {
    if (rec.status === 'INACTIVE' && !canEdit) return false;
    if (rec.status === 'INACTIVE' && canEdit && !showInactive) return false;
    if (search) {
      const name = `${rec.user.first_name} ${rec.user.last_name}`.toLowerCase();
      if (!name.includes(search) && !rec.user.email.toLowerCase().includes(search)) return false;
    }
    return true;
  });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Instructors</h1>
          <p className="page-subtitle">{visible.length} instructor{visible.length !== 1 ? 's' : ''}</p>
        </div>
        {canEdit && (
          <button
            className={`btn btn-secondary instr-toggle-inactive${showInactive ? ' instr-toggle-inactive--on' : ''}`}
            onClick={() => setShowInactive(v => !v)}
          >
            {showInactive ? 'Hide inactive' : 'Show inactive'}
          </button>
        )}
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
      ) : visible.length === 0 ? (
        <p style={{padding:'3rem',textAlign:'center',color:'#9ca3af'}}>No instructors found.</p>
      ) : (
        <div className="instr-grid">
          {visible.map(rec => {
            const inactive = rec.status === 'INACTIVE';
            return (
              <div
                key={rec.instructor_id}
                className={`instr-card${canEdit ? '' : ' instr-card--static'}${inactive ? ' instr-card--inactive' : ''}`}
                onClick={canEdit ? () => setEditing(rec) : undefined}
                title={canEdit ? 'Click to edit' : undefined}
              >
                <div className="instr-card-avatar">
                  {rec.user.first_name[0]}{rec.user.last_name[0]}
                </div>
                <div className="instr-card-body">
                  <div className="instr-card-name-row">
                    <p className="instr-card-name">{rec.user.first_name} {rec.user.last_name}</p>
                    {inactive && <span className="instr-status-badge">Inactive</span>}
                  </div>
                  <span className="instr-rate-badge">
                    ${rec.regular_rate.toFixed(2)}<span className="instr-rate-unit">/hr</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <InstructorEditModal
          instructor={{ id: editing.instructor_id, first_name: editing.user.first_name, last_name: editing.user.last_name }}
          rate={editing.regular_rate}
          status={editing.status}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
