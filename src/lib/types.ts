export type UserRole = 'citizen' | 'pharmacist' | 'facility_admin' | 'facility_owner' | 'admin'

export interface Profile {
  id: string
  role: UserRole
  display_name: string
  phone: string
  email: string | null
  verified: boolean
  banned: boolean
  frozen: boolean
  created_at: string
  unique_id: string | null
}

export interface Pharmacy {
  id: string
  owner_id: string
  name: string
  area: string
  address: string
  phone: string
  open_hours: string
  is_open: boolean
  verified: boolean
  is_reference: boolean
  facility_id: string | null
  lat: number | null
  lng: number | null
}

export interface Facility {
  id: string
  owner_id: string
  name: string
  type: string
  area: string
  address: string
  phone: string
  verified: boolean
}

export interface BugReport {
  id: string
  reporter_id: string | null
  reporter_name: string
  category: string
  description: string
  status: string
  created_at: string
  resolved_at: string | null
  admin_notes: string | null
}

export interface BugReportChat {
  id: string
  bug_report_id: string
  sender_id: string | null
  sender_name: string
  sender_role: string
  message: string
  created_at: string
}

export interface Suggestion {
  id: string
  user_id: string | null
  user_name: string
  user_role: string
  entity_name: string
  title: string
  description: string
  status: string
  admin_notes: string | null
  created_at: string
}

export interface Conversation {
  id: string
  report_id: string | null
  user_id: string
  admin_id: string | null
  subject: string
  status: string
  entity_name: string | null
  created_at: string
  closed_at: string | null
  closed_by: string | null
}

export interface ConversationMessage {
  id: string
  conversation_id: string
  sender_id: string
  sender_name: string
  sender_role: string
  message: string
  created_at: string
}

export interface Notification {
  id: string
  user_id: string | null
  type: string
  title: string
  body: string
  ts: string
  unread: boolean
}
