function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = localStorage.getItem('po_token');
  return token ? { Authorization: `Bearer ${token}`, ...extra } : extra;
}

export interface ProfileData {
  first_name:    string;
  last_name:     string;
  email:         string;
  phone?:        string | null;
  date_of_birth?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?:         string | null;
  state?:        string | null;
  country?:      string | null;
  postal_code?:  string | null;
}

export async function fetchProfile(): Promise<any> {
  const res = await fetch('/api/profile', { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to fetch profile');
  return res.json();
}

export async function updateProfile(data: Partial<ProfileData>): Promise<any> {
  const res = await fetch('/api/profile', {
    method:  'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body:    JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Failed to update profile');
  return json;
}

export async function changePassword(current_password: string, new_password: string): Promise<void> {
  const res = await fetch('/api/profile/password', {
    method:  'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body:    JSON.stringify({ current_password, new_password }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Failed to change password');
}
