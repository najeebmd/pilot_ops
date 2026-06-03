import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { AuthUser } from '../api/auth';

interface AuthState {
  user:  AuthUser | null;
  token: string | null;
}

interface AuthContextValue extends AuthState {
  signIn:  (token: string, user: AuthUser) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = 'po_token';
const USER_KEY  = 'po_user';

function loadStored(): AuthState {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const user  = localStorage.getItem(USER_KEY);
    if (token && user) return { token, user: JSON.parse(user) };
  } catch { /* ignore */ }
  return { token: null, user: null };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(loadStored);

  const signIn = useCallback((token: string, user: AuthUser) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    setState({ token, user });
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setState({ token: null, user: null });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
