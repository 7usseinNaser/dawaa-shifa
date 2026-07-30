import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const isSupabaseConfigured = Boolean(import.meta.env.VITE_SUPABASE_URL);

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type UserRole = 'citizen' | 'pharmacist' | 'facility_owner' | 'admin';

export interface Profile {
  id: string;
  role: UserRole;
  display_name: string;
  phone: string;
  verified: boolean;
  deleted_at: string | null;
  banned: boolean;
  frozen: boolean;
  freeze_reason: string | null;
}

export interface MedExchangeRequest {
  id: string;
  medicine_name: string;
  generic_name: string;
  pharmacy_id: string | null;
  pharmacy_name: string;
  requester_id: string | null;
  requester_name: string;
  request_type: 'exchange' | 'donate';
  quantity: number;
  price: number;
  expiry_date: string | null;
  storage_conditions: string;
  notes: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export interface DataReport {
  id: string;
  reporter_id: string | null;
  reporter_name: string;
  target_type: 'facility' | 'pharmacy' | 'medicine';
  target_id: string;
  target_name: string;
  issue_type: 'wrong_status' | 'wrong_availability' | 'wrong_info' | 'other';
  message: string;
  status: 'open' | 'reviewing' | 'resolved' | 'dismissed';
  created_at: string;
  resolved_at: string | null;
}

export interface BatchRecall {
  id: string;
  medicine_name: string;
 batch_number: string;
  reason: string;
  severity: 'info' | 'warning' | 'danger';
  status: 'active' | 'resolved';
  created_by: string | null;
  created_at: string;
}

export interface Pharmacy {
  id: string;
  owner_id: string | null;
  name: string;
  area: string;
  address: string;
  lat: number;
  lng: number;
  phone: string;
  open_hours: string;
  is_open: boolean;
  rating: number;
  reviews_count: number;
  status: 'open' | 'busy' | 'emergency' | 'closed';
  verified: boolean;
  power_status: 'generator' | 'no_power' | 'grid' | 'unknown';
  deleted_at: string | null;
  last_updated_at: string | null;
  approval_status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
}

export interface Medicine {
  id: string;
  pharmacy_id: string;
  medicine_name: string;
  generic_name: string;
  price: number;
  quantity: number;
  last_updated: string;
  category: string;
  price_usd: number;
  is_available: boolean;
  deleted_at: string | null;
  is_restricted: boolean;
  restriction_note: string;
  expiry_date: string | null;
  is_incomplete: boolean;
}

export interface Facility {
  id: string;
  owner_id: string | null;
  name: string;
  type: 'hospital' | 'clinic' | 'medical_point';
  is_free: boolean;
  pricing_type: 'free' | 'paid' | 'nominal';
  area: string;
  address: string;
  lat: number;
  lng: number;
  phone: string;
  overall_status: 'open' | 'busy' | 'emergency' | 'closed';
  verified: boolean;
  power_status: 'generator' | 'no_power' | 'grid' | 'unknown';
  occupancy_rate: number;
  max_capacity: number;
  deleted_at: string | null;
  last_updated_at: string | null;
  approval_status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
}

export interface Department {
  id: string;
  facility_id: string;
  name: string;
  doctor_name: string;
  status: 'open' | 'busy' | 'emergency' | 'closed';
  waiting_count: number;
  estimated_clear_time: string;
  open_time: string;
  close_time: string;
  last_updated: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'emergency' | 'open' | 'busy' | 'closed' | 'info';
  title: string;
  body: string;
  ts: string;
  unread: boolean;
}

export interface Favorite {
  id: string;
  user_id: string;
  target_id: string;
  target_type: 'pharmacy' | 'facility' | 'notify';
  target_name: string;
  created_at: string;
}

export interface Review {
  id: string;
  target_id: string;
  target_type: 'facility' | 'pharmacy';
  target_name: string;
  user_id: string;
  user_name: string;
  rating: number;
  text: string;
  anon: boolean;
  reply: string;
  ts: string;
}

export interface ActivityLogEntry {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  item: string;
  ts: string;
}

export interface EntityVersion {
  id: string;
  entity_type: 'facility' | 'medicine' | 'pharmacy';
  entity_id: string;
  snapshot: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
}

export interface AdminAlert {
  id: string;
  target_type: 'facility' | 'pharmacy' | 'broadcast';
  target_id: string;
  area: string | null;
  message: string;
  severity: 'info' | 'warning' | 'emergency';
  created_by: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  actor_name: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, unknown>;
  before_state: Record<string, unknown> | null;
  after_state: Record<string, unknown> | null;
  created_at: string;
}

export interface FacilityWarning {
  id: string;
  target_type: 'facility' | 'pharmacy';
  target_id: string;
  message: string;
  severity: 'info' | 'warning' | 'emergency';
  duration_type: '12h' | '24h' | 'custom' | 'permanent';
  duration_hours: number | null;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
  acknowledged_at: string | null;
}

export interface FamilyMember {
  id: string;
  owner_id: string;
  member_name: string;
  member_age: number;
  member_relation: 'self' | 'child' | 'parent' | 'spouse' | 'other';
  created_at: string;
}

export interface ChronicMedicine {
  id: string;
  user_id: string;
  cabinet_id: string | null;
  member_id: string | null;
  name: string;
  dosage: string;
  times: string;
  pills_left: number;
  pills_per_day: number;
  refill_date: string | null;
  notes: string;
  created_at: string;
}

export interface MedicineDonation {
  id: string;
  donor_id: string;
  donor_name: string;
  donor_phone: string;
  medicine_name: string;
  generic_name: string;
  quantity: number;
  expiry_date: string | null;
  condition: 'sealed' | 'loose';
  area: string;
  notes: string;
  status: 'pending' | 'approved' | 'rejected' | 'distributed';
  rejection_reason: string | null;
  recipient_pharmacy_id: string | null;
  recipient_facility_id: string | null;
  distributed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SearchLog {
  id: string;
  user_id: string | null;
  query: string;
  search_type: 'medicine' | 'facility';
  area: string | null;
  created_at: string;
}

export interface EmergencyBroadcast {
  id: string;
  title: string;
  message: string;
  area: string;
  severity: 'info' | 'warning' | 'emergency';
  created_by: string | null;
  created_at: string;
  expires_at: string;
}

export interface AvailabilityAlert {
  id: string;
  user_id: string;
  medicine_name: string;
  pharmacy_id: string | null;
  notified: boolean;
  created_at: string;
  notified_at: string | null;
}

export interface BugReport {
  id: string;
  reporter_id: string | null;
  reporter_name: string;
  category: string;
  description: string;
  status: 'open' | 'reviewing' | 'resolved';
  created_at: string;
  resolved_at: string | null;
  admin_notes: string | null;
}
