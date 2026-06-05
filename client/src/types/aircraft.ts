export type AircraftStatus = 'READY' | 'MAINTENANCE' | 'NOT_AVAILABLE';

export interface Aircraft {
  id:                   number;
  tail_number:          string;
  serial_number:        string;
  make:                 string;
  model:                string;
  year_built:           number;
  flight_hours:         number;
  fuel_capacity:        number | null;
  weight:               number | null;
  status:               AircraftStatus;
  rental_rate:          number | null;
  next_inspection_date: string | null;
  date_created:         string;
  date_updated:         string;
}

export type AircraftFormData = Omit<Aircraft, 'id' | 'date_created' | 'date_updated'>;
