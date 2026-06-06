import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchUsers, createUser, updateUser, deleteUser } from '../api/users';
import type { User, UserFormData } from '../types/user';
import InstructorFormModal, { type InstructorFormData } from '../components/InstructorFormModal';
import ConfirmDialog from '../components/ConfirmDialog';
import './InstructorsPage.css';

function authHeaders(extra: Record<string,string> = {}) {
  const t = localStorage.getItem('po_token');
  return t ? { Authorization: `Bearer ${t}`, ...extra } : extra;
}

async function createInstructorAccount(data: InstructorFormData): Promise<User> {
  // 1. Create user
  const userPayload: Partial<UserFormData> & { first_name: string; last_name: string; email: string } = {
    first_name: data.first_name, last_name: data.last_name, email: data.email,
    phone: data.phone || undefined,
    date_of_birth: data.date_of_birth ? new Date(data.date_of_birth).toISOString() : undefined,
    address_line1: data.address_line1 || undefined,
    address_line2: data.address_line2 || undefined,
    city: data.city || undefined, state: data.state || undefined,
    country: data.country || undefined, postal_code: data.postal_code || undefined,
    role_ids: [],
  };
  const user = await createUser(userPayload as UserFormData);

  // 2. Create login
  const loginRes = await fetch(`/api/users/${user.id}/login`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ username: data.username, password: data.password }),
  });
  if (!loginRes.ok) {
    const err = await loginRes.json().catch(() => ({}));
    throw new Error(err.message ?? 'Failed to create login');
  }

  // 3. Get role IDs for INSTRUCTOR and PILOT
  const rolesRes = await fetch('/api/roles', { headers: authHeaders() });
  const rolesData = await rolesRes.json();
  const instructorRole = rolesData.find((r: any) => r.name === 'INSTRUCTOR');
  const pilotRole      = rolesData.find((r: any) => r.name === 'PILOT');

  for (const role of [instructorRole, pilotRole].filter(Boolean)) {
    await fetch(`/api/users/${user.id}/roles`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ role_id: role.id }),
    });
  }

  return user;
}

export default function InstructorsPage() {
  const { user } = useAuth();
  const isAdminOrStaff = user?.roles.some(r => r === 'ADMIN' || r === 'STAFF') ?? false;

  const [instructors, setInstructors] = useState<User[]>([]);
  const [total,       setTotal]       = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [debounce,    setDebounce]    = useState<ReturnType<typeof setTimeout>|null>(null);

  const [editTarget,   setEditTarget]   = useState<User|null|undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<User|null>(null);
  const [viewTarget,   setViewTarget]   = useState<User|null>(null);

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

  async function handleSave(data: InstructorFormData) {
    if (editTarget) {
      // Update existing user details
      const payload: Partial<UserFormData> = {
        first_name: data.first_name, last_name: data.last_name, email: data.email,
        phone: data.phone || undefined,
        date_of_birth: data.date_of_birth ? new Date(data.date_of_birth).toISOString() : undefined,
        address_line1: data.address_line1 || undefined,
        address_line2: data.address_line2 || undefined,
        city: data.city || undefined, state: data.state || undefined,
        country: data.country || undefined, postal_code: data.postal_code || undefined,
        role_ids: editTarget.roles.map(r => r.role_id),
      };
      await updateUser(editTarget.id, payload);
    } else {
      await createInstructorAccount(data);
    }
    setEditTarget(undefined);
    await load();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteUser(deleteTarget.id);
    setDeleteTarget(null);
    if (viewTarget?.id === deleteTarget.id) setViewTarget(null);
    await load();
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Instructors</h1>
          <p className="page-subtitle">{total} instructor{total !== 1 ? 's' : ''}</p>
        </div>
        {isAdminOrStaff && (
          <button className="btn btn-primary" onClick={() => setEditTarget(null)}>+ Add Instructor</button>
        )}
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
        <p className="td-state" style={{padding:'3rem',textAlign:'center',color:'#9ca3af'}}>Loading…</p>
      ) : instructors.length === 0 ? (
        <p className="td-state" style={{padding:'3rem',textAlign:'center',color:'#9ca3af'}}>No instructors found.</p>
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
              {isAdminOrStaff && (
                <div className="instr-card-actions" onClick={e => e.stopPropagation()}>
                  <button className="btn-icon-sm" title="Edit" onClick={() => setEditTarget(instr)}>✏️</button>
                  <button className="btn-icon-sm" title="Delete" onClick={() => setDeleteTarget(instr)}>🗑️</button>
                </div>
              )}
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
                ['Phone',       viewTarget.phone],
                ['Date of Birth', viewTarget.date_of_birth ? new Date(viewTarget.date_of_birth).toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'}) : null],
                ['Address',     [viewTarget.address_line1, viewTarget.address_line2, viewTarget.city, viewTarget.state, viewTarget.postal_code, viewTarget.country].filter(Boolean).join(', ')],
              ].map(([label, val]) => val ? (
                <div key={label as string} className="instr-detail-row">
                  <span className="instr-detail-label">{label}</span>
                  <span className="instr-detail-val">{val}</span>
                </div>
              ) : null)}
            </div>
            {isAdminOrStaff && (
              <div className="instr-detail-footer">
                <button className="btn btn-primary" onClick={() => { setEditTarget(viewTarget); setViewTarget(null); }}>Edit</button>
              </div>
            )}
          </div>
        </div>
      )}

      {editTarget !== undefined && (
        <InstructorFormModal
          instructor={editTarget}
          onSave={handleSave}
          onClose={() => setEditTarget(undefined)}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          message={`Delete instructor ${deleteTarget.first_name} ${deleteTarget.last_name}? This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
