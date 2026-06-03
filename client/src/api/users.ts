import type { User, UserFormData } from '../types/user';

const BASE = '/api/users';

export async function fetchUsers(): Promise<User[]> {
  const res = await fetch(BASE);
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
}

export async function fetchUser(id: number): Promise<User> {
  const res = await fetch(`${BASE}/${id}`);
  if (!res.ok) throw new Error('User not found');
  return res.json();
}

export async function createUser(data: UserFormData): Promise<User> {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? 'Failed to create user');
  }
  return res.json();
}

export async function updateUser(id: number, data: Partial<UserFormData>): Promise<User> {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? 'Failed to update user');
  }
  return res.json();
}

export async function deleteUser(id: number): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete user');
}
