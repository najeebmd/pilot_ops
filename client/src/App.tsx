import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import HomePage from './pages/HomePage';
import UsersPage    from './pages/UsersPage';
import SchedulePage  from './pages/SchedulePage';
import AircraftPage      from './pages/AircraftPage';
import ReservationsPage  from './pages/ReservationsPage';

function Placeholder({ title }: { title: string }) {
  return (
    <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#64748b' }}>
      <h2 style={{ fontSize: '1.5rem', color: '#0f172a', marginBottom: '0.5rem' }}>{title}</h2>
      <p>This section is coming soon.</p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/"            element={<HomePage />} />
          <Route path="/students"    element={<UsersPage />} />
          <Route path="/instructors" element={<Placeholder title="Instructors" />} />
          <Route path="/courses"     element={<Placeholder title="Courses" />} />
          <Route path="/aircraft"    element={<AircraftPage />} />
          <Route path="/schedule"    element={<SchedulePage />} />
          <Route path="/reservations" element={<ReservationsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
