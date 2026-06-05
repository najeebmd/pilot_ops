import type { Aircraft, AircraftFormData } from '../types/aircraft';

const BASE = '/api/aircraft';

export interface AircraftPage {
  data:     Aircraft[];
  total:    number;
  page:     number;
  pageSize: number;
}

export interface FetchAircraftParams {
  page?:      number;
  pageSize?:  number;
  sortBy?:    string;
  sortOrder?: 'asc' | 'desc';
  status?:    string;
}

export async function fetchAircraft(params: FetchAircraftParams = {}): Promise<AircraftPage> {
  const qs = new URLSearchParams();
  if (params.page)      qs.set('page',      String(params.page));
  if (params.pageSize)  qs.set('pageSize',  String(params.pageSize));
  if (params.sortBy)    qs.set('sortBy',    params.sortBy);
  if (params.sortOrder) qs.set('sortOrder', params.sortOrder);
  if (params.status)    qs.set('status',    params.status);
  const res = await fetch(`${BASE}?${qs}`);
  if (!res.ok) throw new Error('Failed to fetch aircraft');
  return res.json();
}

export async function createAircraft(data: AircraftFormData): Promise<Aircraft> {
  const res = await fetch(BASE, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Failed to create aircraft');
  return json;
}

export async function updateAircraft(id: number, data: Partial<AircraftFormData>): Promise<Aircraft> {
  const res = await fetch(`${BASE}/${id}`, {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Failed to update aircraft');
  return json;
}
