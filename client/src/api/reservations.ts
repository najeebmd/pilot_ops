import type { Reservation, ReservationFormData } from '../types/reservation';

const BASE = '/api/reservations';

export interface ReservationsPage {
  data: Reservation[]; total: number; page: number; pageSize: number;
}

export async function fetchReservations(params: {
  user_id?: number; instructor_id?: number; aircraft_id?: number;
  status?: string; date_from?: string; date_to?: string;
  start_from?: string; start_to?: string;
  page?: number; pageSize?: number; sortBy?: string; sortOrder?: 'asc'|'desc';
} = {}): Promise<ReservationsPage> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v != null) qs.set(k, String(v)); });
  const res = await fetch(`${BASE}?${qs}`);
  if (!res.ok) throw new Error('Failed to fetch reservations');
  return res.json();
}

export async function createReservation(data: ReservationFormData): Promise<Reservation> {
  const res = await fetch(BASE, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Failed to create reservation');
  return json;
}

export async function updateReservation(id: number, data: Partial<ReservationFormData & { status: string }>): Promise<Reservation> {
  const res = await fetch(`${BASE}/${id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Failed to update reservation');
  return json;
}

export async function deleteReservation(id: number): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete reservation');
}
