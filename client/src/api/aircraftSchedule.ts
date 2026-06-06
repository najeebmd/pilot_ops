export interface AircraftScheduleEntry {
  id:            number;
  aircraft_id:   number;
  date_start:    string;
  date_end:      string;
  activity_type: 'MAINTENANCE' | 'NOT_AVAILABLE' | 'RESERVED' | 'OTHER';
  reservation_id: number | null;
  date_created:  string;
  date_updated:  string;
  aircraft: { id: number; tail_number: string; make: string; model: string };
}

export interface AircraftSchedulePage {
  data: AircraftScheduleEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export async function fetchAircraftSchedule(params: {
  aircraft_id?: number;
  date_from?:   string;
  date_to?:     string;
  pageSize?:    number;
} = {}): Promise<AircraftSchedulePage> {
  const qs = new URLSearchParams();
  if (params.aircraft_id) qs.set('aircraft_id', String(params.aircraft_id));
  if (params.date_from)   qs.set('date_from',   params.date_from);
  if (params.date_to)     qs.set('date_to',     params.date_to);
  if (params.pageSize)    qs.set('pageSize',     String(params.pageSize));
  const res = await fetch(`/api/aircraft-schedule?${qs}`);
  if (!res.ok) throw new Error('Failed to fetch aircraft schedule');
  return res.json();
}
