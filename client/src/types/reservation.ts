export type ReservationStatus = 'RESERVED' | 'COMPLETED' | 'CANCELED';

export interface Reservation {
  id:           number;
  user_id:      number;
  aircraft_id:  number | null;
  instructor_id:number | null;
  date_start:   string;
  date_end:     string;
  status:       ReservationStatus;
  date_created: string;
  date_updated: string;
  user:         { id: number; first_name: string; last_name: string; email: string };
  aircraft:     { id: number; tail_number: string; make: string; model: string } | null;
  instructor:   { id: number; first_name: string; last_name: string; email: string } | null;
  instructor_schedule: { id: number } | null;
}

export interface ReservationFormData {
  user_id:      number;
  aircraft_id:  number | null;
  instructor_id:number | null;
  date_start:   string;
  date_end:     string;
}
