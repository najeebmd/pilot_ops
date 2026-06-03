import type { User, UserFormData } from '../types/user';

const BASE = '/api/users';

export interface UsersPage {
  data: User[];
  total: number;
  page: number;
  pageSize: number;
}

export interface FetchUsersParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export async function fetchUsers(params: FetchUsersParams = {}): Promise<UsersPage> {
  const qs = new URLSearchParams();
  if (params.page)      qs.set('page',      String(params.page));
  if (params.pageSize)  qs.set('pageSize',  String(params.pageSize));
  if (params.sortBy)    qs.set('sortBy',    params.sortBy);
  if (params.sortOrder) qs.set('sortOrder', params.sortOrder);
  const res = await fetch(`${BASE}?${qs}`);
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
