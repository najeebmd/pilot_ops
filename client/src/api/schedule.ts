import type { ScheduleEntry, ScheduleFormData } from '../types/schedule';

const BASE = '/api/instructor-schedule';

export interface SchedulePage {
  data:     ScheduleEntry[];
  total:    number;
  page:     number;
  pageSize: number;
}

export async function fetchSchedule(params: {
  instructor_id?: number;
  page?:          number;
  pageSize?:      number;
  sortBy?:        string;
  sortOrder?:     'asc' | 'desc';
}): Promise<SchedulePage> {
  const qs = new URLSearchParams();
  if (params.instructor_id) qs.set('instructor_id', String(params.instructor_id));
  if (params.page)          qs.set('page',          String(params.page));
  if (params.pageSize)      qs.set('pageSize',      String(params.pageSize));
  if (params.sortBy)        qs.set('sortBy',        params.sortBy);
  if (params.sortOrder)     qs.set('sortOrder',     params.sortOrder);
  const res = await fetch(`${BASE}?${qs}`);
  if (!res.ok) throw new Error('Failed to fetch schedule');
  return res.json();
}

export async function createScheduleEntry(data: ScheduleFormData): Promise<ScheduleEntry> {
  const res = await fetch(BASE, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Failed to create entry');
  return json;
}

export async function updateScheduleEntry(id: number, data: Partial<ScheduleFormData>): Promise<ScheduleEntry> {
  const res = await fetch(`${BASE}/${id}`, {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Failed to update entry');
  return json;
}

export async function deleteScheduleEntry(id: number): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete entry');
}
