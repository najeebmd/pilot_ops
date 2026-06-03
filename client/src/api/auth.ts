export interface AuthUser {
  id:         number;
  first_name: string;
  last_name:  string;
  email:      string;
  username:   string;
  roles:      string[];
}

export interface AuthResponse {
  token: string;
  user:  AuthUser;
}

export async function apiLogin(username: string, password: string): Promise<AuthResponse> {
  const res = await fetch('/api/auth/login', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? 'Login failed');
  return data;
}

export async function apiRegister(payload: {
  first_name: string;
  last_name:  string;
  email:      string;
  username:   string;
  password:   string;
}): Promise<AuthResponse> {
  const res = await fetch('/api/auth/register', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? 'Registration failed');
  return data;
}
