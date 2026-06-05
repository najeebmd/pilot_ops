export type ActivityType = 'INSTRUCTION' | 'OTHER' | 'NOT_AVAILABLE';

export interface ScheduleEntry {
  id:            number;
  instructor_id: number;
  date_start:    string;
  date_end:      string;
  activity_type: ActivityType;
  date_created:  string;
  date_updated:  string;
  instructor: {
    id:         number;
    first_name: string;
    last_name:  string;
    email:      string;
  };
}

export interface ScheduleFormData {
  instructor_id: number;
  date_start:    string;
  date_end:      string;
  activity_type: ActivityType;
}
