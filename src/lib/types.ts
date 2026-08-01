export type UserRole = 'citizen' | 'pharmacist' | 'facility' | 'admin';

export interface Profile {
  id: string;
  role: UserRole;
  display_name: string;
  phone: string;
  email: string | null;
}

export interface Pharmacy {
  id: string;
  name: string;
  phone: string;
  lat: number;
  lng: number;
  area: string;
  address: string;
}

export interface Facility {
  id: string;
  name: string;
  type: string;
  phone: string;
  lat: number;
  lng: number;
  area: string;
  address: string;
}

export interface Medicine {
  id: string;
  pharmacy_id: string;
  medicine_name: string;
  generic_name: string;
  in_stock: boolean;
}
