import { useEffect, useState } from 'react';
import type { User, UserFormData } from '../types/user';
import { fetchUsers, createUser, updateUser, deleteUser } from '../api/users';
import UserFormModal from '../components/UserFormModal';
import UserViewDrawer from '../components/UserViewDrawer';
import ConfirmDialog from '../components/ConfirmDialog';
import './UsersPage.css';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [viewUser, setViewUser] = useState<User | null>(null);
  const [editUser, setEditUser] = useState<User | null | undefined>(undefined); // undefined = closed, null = new
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      setUsers(await fetchUsers());
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(data: UserFormData) {
    if (editUser) {
      const updated = await updateUser(editUser.id, data);
      setUsers((u) => u.map((x) => (x.id === updated.id ? updated : x)));
    } else {
      const created = await createUser(data);
      setUsers((u) => [created, ...u]);
    }
    setEditUser(undefined);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteUser(deleteTarget.id);
    setUsers((u) => u.filter((x) => x.id !== deleteTarget.id));
    setDeleteTarget(null);
    if (viewUser?.id === deleteTarget.id) setViewUser(null);
  }

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.first_name.toLowerCase().includes(q) ||
      u.last_name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.city ?? '').toLowerCase().includes(q) ||
      (u.country ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Users</h1>
          <p className="page-subtitle">{users.length} total</p>
        </div>
        <button className="btn btn-primary" onClick={() => setEditUser(null)}>+ Add User</button>
      </div>

      <div className="toolbar">
        <input
          className="search-input"
          placeholder="Search by name, email, city, country…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="state-msg">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="state-msg">{search ? 'No results.' : 'No users yet.'}</p>
      ) : (
        <div className="table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>City</th>
                <th>Country</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.id} className="table-row" onClick={() => setViewUser(user)}>
                  <td className="td-name">{user.first_name} {user.last_name}</td>
                  <td>{user.email}</td>
                  <td>{user.phone ?? '—'}</td>
                  <td>{user.city ?? '—'}</td>
                  <td>{user.country ?? '—'}</td>
                  <td>{new Date(user.date_created).toLocaleDateString()}</td>
                  <td className="td-actions" onClick={(e) => e.stopPropagation()}>
                    <button className="btn-icon-sm" title="Edit" onClick={() => setEditUser(user)}>✏️</button>
                    <button className="btn-icon-sm" title="Delete" onClick={() => setDeleteTarget(user)}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editUser !== undefined && (
        <UserFormModal
          user={editUser}
          onSave={handleSave}
          onClose={() => setEditUser(undefined)}
        />
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
