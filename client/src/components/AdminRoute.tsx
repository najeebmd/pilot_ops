import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const isAdminOrStaff = user?.roles.some(r => r === 'ADMIN' || r === 'STAFF') ?? false;

  if (!isAdminOrStaff) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
