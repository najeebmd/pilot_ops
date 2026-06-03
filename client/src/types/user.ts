export interface UserRole {
  id:      number;
  user_id: number;
  role_id: number;
  role: { id: number; name: string };
}

export interface User {
  id:            number;
  first_name:    string;
  last_name:     string;
  email:         string;
  phone:         string | null;
  date_of_birth: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city:          string | null;
  state:         string | null;
  country:       string | null;
  postal_code:   string | null;
  date_created:  string;
  date_updated:  string;
  roles:         UserRole[];
}

export type UserFormData = Omit<User, 'id' | 'date_created' | 'date_updated' | 'roles'> & {
  role_ids: number[];
};
