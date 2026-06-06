import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import type { User, UserFormData } from '../types/user';
import { fetchUsers, createUser, updateUser, deleteUser } from '../api/users';
import UserFormModal from '../components/UserFormModal';
import UserViewDrawer from '../components/UserViewDrawer';
import ConfirmDialog from '../components/ConfirmDialog';
import './UsersPage.css';

type SortKey = 'first_name' | 'last_name' | 'email' | 'phone' | 'city' | 'country' | 'date_created';
type SortOrder = 'asc' | 'desc';

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];

interface Col { key: SortKey; label: string; }

const COLS: Col[] = [
  { key: 'first_name', label: 'First Name' },
  { key: 'last_name',  label: 'Last Name' },
  { key: 'email',      label: 'Email' },
];

const ROLE_COLOURS: Record<string, string> = {
  STUDENT:    '#dbeafe|#1d4ed8',
  INSTRUCTOR: '#dcfce7|#15803d',
  ADMIN:      '#fce7f3|#be185d',
  STAFF:      '#fef9c3|#a16207',
  GUEST:      '#f3f4f6|#374151',
  OTHER:      '#ede9fe|#6d28d9',
};

function RolePill({ name }: { name: string }) {
  const [bg, color] = (ROLE_COLOURS[name] ?? '#f3f4f6|#374151').split('|');
  return (
    <span className="role-pill" style={{ background: bg, color }}>
      {name}
    </span>
  );
}

export default function UsersPage() {
  const { user: authUser } = useAuth();
  const isAdminOrStaff = authUser?.roles.some(r => r === 'ADMIN' || r === 'STAFF') ?? false;
  const [users, setUsers]     = useState<User[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);

  const [page, setPage]           = useState(1);
  const [pageSize, setPageSize]   = useState(10);
  const [sortBy, setSortBy]       = useState<SortKey>('date_created');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch]           = useState('');  // debounced value sent to API
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [viewUser, setViewUser]         = useState<User | null>(null);
  const [editUser, setEditUser]         = useState<User | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  // Debounce: update `search` 350ms after the user stops typing
  function handleSearchInput(value: string) {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(value.trim());
      setPage(1);
    }, 350);
  }

  useEffect(() => { load(); }, [page, pageSize, sortBy, sortOrder, search]);

  async function load() {
    setLoading(true);
    try {
      const result = await fetchUsers({ page, pageSize, sortBy, sortOrder, search: search || undefined });
      setUsers(result.data);
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

  async function handleSave(data: UserFormData & { _username?: string; _password?: string }) {
    if (editUser) {
      await updateUser(editUser.id, data);
    } else {
      const created = await createUser(data);
      // Create login credentials if username/password were provided
      if (data._username && data._password) {
        const token = localStorage.getItem('po_token');
        await fetch(`/api/users/${created.id}/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ username: data._username, password: data._password }),
        });
      }
    }
    setEditUser(undefined);
    setPage(1);
    await load();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteUser(deleteTarget.id);
    setDeleteTarget(null);
    if (viewUser?.id === deleteTarget.id) setViewUser(null);
    const newTotal  = total - 1;
    const maxPage   = Math.max(1, Math.ceil(newTotal / pageSize));
    setPage((p) => Math.min(p, maxPage));
    await load();
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function SortIcon({ col }: { col: SortKey }) {
    if (col !== sortBy) return <span className="sort-icon sort-icon--idle">↕</span>;
    return <span className="sort-icon sort-icon--active">{sortOrder === 'asc' ? '↑' : '↓'}</span>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Users</h1>
          <p className="page-subtitle">{total} total</p>
        </div>
        <button className="btn btn-primary" onClick={() => setEditUser(null)}>+ Add User</button>
      </div>

      {/* Search bar */}
      <div className="users-search-bar">
        <input
          className="search-input"
          type="text"
          placeholder="Search by first name, last name, or both…"
          value={searchInput}
          onChange={e => handleSearchInput(e.target.value)}
        />
        {searchInput && (
          <button
            className="search-clear-btn"
            onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }}
            title="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      <div className="table-wrapper">
        <table className="users-table">
          <thead>
            <tr>
              {COLS.map((col) => (
                <th key={col.key} className="th-sortable" onClick={() => handleSort(col.key)}>
                  {col.label} <SortIcon col={col.key} />
                </th>
              ))}
              <th>Roles</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={COLS.length + 2} className="td-state">Loading…</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={COLS.length + 2} className="td-state">No users found.</td></tr>
            ) : users.map((user) => (
              <tr key={user.id} className="table-row" onClick={() => setViewUser(user)}>
                <td className="td-name">{user.first_name}</td>
                <td className="td-name">{user.last_name}</td>
                <td>{user.email}</td>
                <td>
                  <div className="role-pills">
                    {user.roles.length > 0
                      ? user.roles.map((r) => <RolePill key={r.id} name={r.role.name} />)
                      : <span className="td-empty">—</span>}
                  </div>
                </td>
                <td className="td-actions" onClick={(e) => e.stopPropagation()}>
                  <button className="btn-icon-sm" title="Edit"   onClick={() => setEditUser(user)}>✏️</button>
                  <button className="btn-icon-sm" title="Delete" onClick={() => setDeleteTarget(user)}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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

      {editUser !== undefined && (
        <UserFormModal user={editUser} canResetPassword={isAdminOrStaff} onSave={handleSave} onClose={() => setEditUser(undefined)} />
      )}

      {viewUser && (
        <UserViewDrawer
          user={viewUser}
          onClose={() => setViewUser(null)}
          onEdit={() => { setEditUser(viewUser); setViewUser(null); }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          message={`Delete ${deleteTarget.first_name} ${deleteTarget.last_name}? This cannot be undone.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
