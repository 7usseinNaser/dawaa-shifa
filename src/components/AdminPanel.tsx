import { lazy, Suspense, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, ShieldX, Loader as Loader2, Building2, Pill, CircleCheck as CheckCircle, Circle as XCircle, Download, LogOut, Plus, Pencil, Trash2, X, Star, Users, Activity, RotateCcw, Ban, TriangleAlert as AlertTriangle, Radio, FileText, History, Filter, Search, Flag, Package, OctagonAlert as AlertOctagon, ExternalLink, Upload, ScrollText, Snowflake, Send, Flame, Megaphone, Database, Gift, Bug, Clock, Eye, ChevronLeft, Calendar, MessageCircle, MapPin, Phone, Lightbulb } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useLang } from '@/lib/i18n';
import { formatOpenHours } from '@/lib/timeUtils';
import {
  supabase,
  type Pharmacy, type Facility, type Medicine, type Review, type Department,
  type Profile, type EntityVersion, type AdminAlert,
  type MedExchangeRequest, type DataReport, type BatchRecall,
  type AuditLog, type FacilityWarning, type SearchLog, type EmergencyBroadcast,
  type MedicineDonation, type BugReport, type BugReportChat,
  type Suggestion, type Conversation, type ConversationMessage,
} from '@/lib/supabase';
import { showToast } from '@/components/ui/Toast';
const BulkImport = lazy(() => import('@/components/BulkImport').then(m => ({ default: m.BulkImport })));

type Tab = 'pending' | 'pharmacies' | 'facilities' | 'medicines' | 'reviews' | 'users' | 'trash' | 'alerts' | 'exchange' | 'reports' | 'recalls' | 'audit' | 'warnings' | 'heatmap' | 'broadcasts' | 'donations' | 'bugs' | 'suggestions' | 'conversations';

function sanitize(str: string): string {
  return String(str || '').replace(/[<>]/g, '').trim().slice(0, 500);
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadJSON(data: unknown, filename: string) {
  downloadFile(JSON.stringify(data, null, 2), filename, 'application/json');
}

function downloadCSV(rows: Record<string, unknown>[], filename: string) {
  if (rows.length === 0) { downloadFile('', filename, 'text/csv'); return; }
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [headers.map(escape).join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n');
  downloadFile('\uFEFF' + csv, filename, 'text/csv;charset=utf-8');
}

function sqlVal(v: unknown): string {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return `'${String(v).replace(/'/g, "''")}'`;
}

function downloadSQLDump(data: Record<string, Record<string, unknown>[]>, filename: string) {
  let sql = `-- دواء وشفاء (Dawaa & Shifa) SQL Dump\n-- Generated: ${new Date().toISOString()}\n\n`;
  for (const [table, rows] of Object.entries(data)) {
    sql += `-- Table: ${table} (${rows.length} rows)\n`;
    for (const row of rows) {
      const cols = Object.keys(row);
      const vals = cols.map((c) => sqlVal(row[c]));
      sql += `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${vals.join(', ')});\n`;
    }
    sql += '\n';
  }
  downloadFile(sql, filename, 'application/sql');
}

function downloadHTML(title: string, rows: Record<string, unknown>[], filename: string) {
  if (rows.length === 0) { downloadFile('<p>No data</p>', filename, 'text/html'); return; }
  const headers = Object.keys(rows[0]);
  const ths = headers.map((h) => `<th style="padding:8px;border:1px solid #ddd;background:#1a6b4f;color:#fff;text-align:right">${h}</th>`).join('');
  const trs = rows.map((r) => `<tr>${headers.map((h) => `<td style="padding:8px;border:1px solid #ddd;text-align:right">${String(r[h] ?? '')}</td>`).join('')}</tr>`).join('');
  const html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>${title}</title>
    <style>body{font-family:Arial,sans-serif;margin:20px}h1{color:#1a6b4f}table{border-collapse:collapse;width:100%}</style></head>
    <body><h1>دواء وشفاء — ${title}</h1><p>تاريخ التصدير: ${new Date().toLocaleString('ar-EG')}</p><table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table></body></html>`;
  downloadFile(html, filename, 'text/html');
}

export default function AdminPanel() {
  const { user, profile, signOut } = useAuth();
  const { lang } = useLang();
  const isRTL = lang === 'ar';
  const isAdmin = profile?.role === 'admin';

  const [tab, setTab] = useState<Tab>('pending');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [departments, setDepartments] = useState<Record<string, Department[]>>({});
  const [users, setUsers] = useState<Profile[]>([]);
  const [versions, setVersions] = useState<EntityVersion[]>([]);
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [exchangeReqs, setExchangeReqs] = useState<MedExchangeRequest[]>([]);
  const [dataReports, setDataReports] = useState<DataReport[]>([]);
  const [recalls, setRecalls] = useState<BatchRecall[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [editing, setEditing] = useState<{ type: string; data: Record<string, unknown> } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showAlertForm, setShowAlertForm] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState<string | null>(null);
  const [showRecallForm, setShowRecallForm] = useState(false);
  const [showImport, setShowImport] = useState<'pharmacies' | 'facilities' | 'medicines' | null>(null);
  const [showWarningForm, setShowWarningForm] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [warnings, setWarnings] = useState<FacilityWarning[]>([]);
  const [searchLogs, setSearchLogs] = useState<SearchLog[]>([]);
  const [broadcasts, setBroadcasts] = useState<EmergencyBroadcast[]>([]);
  const [showBroadcastForm, setShowBroadcastForm] = useState(false);
  const [donations, setDonations] = useState<MedicineDonation[]>([]);
  const [bugReports, setBugReports] = useState<BugReport[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [roleConfirm, setRoleConfirm] = useState<{ id: string; name: string; newRole: string; oldRole: string } | null>(null);
  const [freezeModal, setFreezeModal] = useState<{ id: string; name: string; current: boolean } | null>(null);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [selectedReport, setSelectedReport] = useState<DataReport | null>(null);
  const [selectedReviewTarget, setSelectedReviewTarget] = useState<{ type: 'facility' | 'pharmacy'; id: string; name: string } | null>(null);
  const [rollbackConfirm, setRollbackConfirm] = useState<AuditLog | null>(null);
  const [freezeReason, setFreezeReason] = useState('');
  const [chatBugReport, setChatBugReport] = useState<BugReport | null>(null);
  const [activeAdminConv, setActiveAdminConv] = useState<Conversation | null>(null);
  const [rejectPending, setRejectPending] = useState<{ table: string; id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [auditDetail, setAuditDetail] = useState<AuditLog | null>(null);

  // Filters
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [medicinePharmFilter, setMedicinePharmFilter] = useState<string>('all');
  const [suggestionRoleFilter, setSuggestionRoleFilter] = useState<string>('all');
  const [suggestionDateFilter, setSuggestionDateFilter] = useState<string>('all');

  const [stats, setStats] = useState({ totalPharmacies: 0, totalFacilities: 0, verified: 0, pending: 0, totalUsers: 0, totalMedicines: 0, totalReviews: 0, trashed: 0, restricted: 0, pendingExchange: 0, openReports: 0, activeRecalls: 0 });

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ph, fac, med, rev, usr, ver, alr, exch, reps, rcl, aud, wrn, slog, bcast, dept, don] = await Promise.all([
        supabase.from('pharmacies').select('id,owner_id,name,area,address,phone,open_hours,is_open,status,verified,approval_status,rejection_reason,deleted_at,lat,lng,rating,reviews_count,power_status,last_updated_at,created_at,is_reference,facility_id'),
        supabase.from('facilities').select('id,owner_id,name,type,area,address,phone,overall_status,verified,approval_status,rejection_reason,deleted_at,lat,lng,is_free,pricing_type,max_capacity,facility_capacity,power_status,occupancy_rate,last_updated_at,created_at'),
        supabase.from('medicines').select('id,pharmacy_id,medicine_name,generic_name,price,quantity,expiry_date,deleted_at,is_restricted,alternative_medicine_id,is_incomplete,category,price_usd,is_available,restriction_note,last_updated,created_at'),
        supabase.from('reviews').select('id,target_type,target_id,target_name,user_id,user_name,rating,text,anon,ts,reply,created_at'),
        supabase.from('profiles').select('id,display_name,email,phone,role,unique_id,banned,frozen,freeze_reason,deleted_at,created_at'),
        supabase.from('entity_versions').select('id,entity_type,entity_id,version_data,snapshot,created_by,created_at').order('created_at', { ascending: false }).limit(50),
        supabase.from('admin_alerts').select('id,severity,message,created_at').order('created_at', { ascending: false }).limit(50),
        supabase.from('med_exchange_requests').select('id,medicine_name,generic_name,pharmacy_id,pharmacy_name,requester_id,requester_name,request_type,quantity,price,expiry_date,storage_conditions,notes,status,admin_notes,created_at,reviewed_at,reviewed_by').order('created_at', { ascending: false }).limit(200),
        supabase.from('data_reports').select('id,reporter_id,reporter_name,target_type,target_id,target_name,issue_type,message,status,created_at').order('created_at', { ascending: false }).limit(200),
        supabase.from('batch_recalls').select('id,medicine_name,batch_number,reason,status,created_at').order('created_at', { ascending: false }).limit(200),
        supabase.from('audit_logs').select('id,actor_id,actor_name,action,entity_type,entity_id,details,before_state,after_state,created_at').order('created_at', { ascending: false }).limit(100),
        supabase.from('facility_warnings').select('id,target_type,target_id,message,severity,created_at').order('created_at', { ascending: false }).limit(50),
        supabase.from('search_logs').select('id,user_id,query,search_type,area,created_at').order('created_at', { ascending: false }).limit(500),
        supabase.from('emergency_broadcasts').select('id,title,message,expires_at,created_at').order('created_at', { ascending: false }).limit(50),
        supabase.from('departments').select('id,facility_id,name,doctor_name,status,waiting_count,estimated_clear_time,avg_service_time_minutes,department_capacity,current_queue_count,open_time,close_time,last_updated'),
        supabase.from('medicine_donations').select('id,donor_id,donor_name,donor_phone,medicine_name,generic_name,quantity,expiry_date,condition,area,notes,status,rejection_reason,recipient_pharmacy_id,recipient_facility_id,distributed_at,created_at,updated_at').order('created_at', { ascending: false }).limit(200),
      ]);
      const phData = (ph.data || []) as Pharmacy[];
      const facData = (fac.data || []) as Facility[];
      const medData = (med.data || []) as Medicine[];
      const revData = (rev.data || []) as Review[];
      const usrData = (usr.data || []) as Profile[];
      const verData = (ver.data || []) as EntityVersion[];
      const alrData = (alr.data || []) as AdminAlert[];
      setPharmacies(phData);
      setFacilities(facData);
      setMedicines(medData);
      setReviews(revData);
      setUsers(usrData);
      setVersions(verData);
      setAlerts(alrData);
      const exchData = (exch.data || []) as MedExchangeRequest[];
      const repsData = (reps.data || []) as DataReport[];
      const rclData = (rcl.data || []) as BatchRecall[];
      setExchangeReqs(exchData);
      setDataReports(repsData);
      setRecalls(rclData);
      setAuditLogs((aud.data || []) as AuditLog[]);
      setWarnings((wrn.data || []) as FacilityWarning[]);
      setSearchLogs((slog.data || []) as SearchLog[]);
      setBroadcasts((bcast.data || []) as EmergencyBroadcast[]);
      setDonations((don.data || []) as MedicineDonation[]);
      const bugs = await supabase.from('bug_reports').select('id,reporter_id,reporter_name,bug_type,category,description,status,resolved_at,admin_notes,created_at').order('created_at', { ascending: false }).limit(200);
      setBugReports((bugs.data || []) as BugReport[]);
      const sugs = await supabase.from('suggestions').select('id,user_id,user_name,user_role,entity_name,title,description,status,admin_notes,created_at').order('created_at', { ascending: false }).limit(200);
      setSuggestions((sugs.data || []) as Suggestion[]);
      const convs = await supabase.from('conversations').select('id,report_id,user_id,admin_id,subject,status,created_at,closed_at,closed_by,entity_name').order('created_at', { ascending: false }).limit(200);
      setConversations((convs.data || []) as Conversation[]);
      const deptData = (dept.data || []) as Department[];
      const deptMap: Record<string, Department[]> = {};
      for (const d of deptData) {
        if (!deptMap[d.facility_id]) deptMap[d.facility_id] = [];
        deptMap[d.facility_id].push(d);
      }
      setDepartments(deptMap);
      const trashedCount =
        phData.filter((p) => p.deleted_at).length +
        facData.filter((f) => f.deleted_at).length +
        medData.filter((m) => m.deleted_at).length;
      setStats({
        totalPharmacies: phData.filter((p) => !p.deleted_at).length,
        totalFacilities: facData.filter((f) => !f.deleted_at).length,
        verified: phData.filter((p) => p.verified && !p.deleted_at).length + facData.filter((f) => f.verified && !f.deleted_at).length,
        pending: phData.filter((p) => !p.verified && !p.deleted_at).length + facData.filter((f) => !f.verified && !f.deleted_at).length,
        totalUsers: usrData.filter((u) => !u.deleted_at).length,
        totalMedicines: medData.filter((m) => !m.deleted_at).length,
        totalReviews: revData.length,
        trashed: trashedCount,
        restricted: medData.filter((m) => m.is_restricted && !m.deleted_at).length,
        pendingExchange: exchData.filter((e) => e.status === 'pending').length,
        openReports: repsData.filter((r) => r.status === 'open').length,
        activeRecalls: rclData.filter((r) => r.status === 'active').length,
      });
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) loadAll();
  }, [isAdmin, loadAll]);

  async function logAction(action: string, item: string, beforeState?: Record<string, unknown> | null, afterState?: Record<string, unknown> | null, extraDetails?: Record<string, unknown>) {
    if (!user) return;
    const actorName = profile?.display_name || user.email || 'admin';
    const actionLabel = action.replace(/_/g, ' ');
    const description = `${actorName} ${actionLabel}: ${item}${extraDetails?.reason ? ` — ${String(extraDetails.reason)}` : ''}`;
    await supabase.from('audit_logs').insert({
      actor_id: user.id,
      actor_name: actorName,
      action: sanitize(action),
      entity_type: action.split('_').pop() || '',
      entity_id: sanitize(item),
      details: { item: sanitize(item), description: sanitize(description), ...extraDetails },
      before_state: beforeState ?? null,
      after_state: afterState ?? null,
    });
  }

  // ---- Soft delete ----
  async function softDelete(table: string, id: string, name: string) {
    if (!confirm(isRTL ? `نقل "${name}" إلى سلة المهملات؟` : `Move "${name}" to trash?`)) return;
    setActionLoading(id);
    try {
      const { error } = await supabase.from(table).update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      await logAction(`soft_delete_${table}`, name);
      showToast(isRTL ? `تم نقل: ${name} إلى سلة المهملات` : `Moved: ${name} to trash`);
      loadAll();
    } catch {
      showToast(isRTL ? 'فشل الحذف' : 'Delete failed', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  async function restoreItem(table: string, id: string, name: string) {
    setActionLoading(id);
    try {
      const { error } = await supabase.from(table).update({ deleted_at: null }).eq('id', id);
      if (error) throw error;
      await logAction(`restore_${table}`, name);
      showToast(isRTL ? `تم استعادة: ${name}` : `Restored: ${name}`);
      loadAll();
    } catch {
      showToast(isRTL ? 'فشل' : 'Failed', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  async function permanentDelete(table: string, id: string, name: string) {
    if (!confirm(isRTL ? `حذف نهائي "${name}"؟ لا يمكن التراجع.` : `PERMANENTLY delete "${name}"? Irreversible.`)) return;
    setActionLoading(id);
    try {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      await logAction(`permanent_delete_${table}`, name);
      showToast(isRTL ? `تم الحذف النهائي: ${name}` : `Permanently deleted: ${name}`);
      loadAll();
    } catch {
      showToast(isRTL ? 'فشل الحذف' : 'Delete failed', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  // ---- Save (with version snapshot via trigger) ----
  async function saveItem(table: string, data: Record<string, unknown>, id?: string) {
    setActionLoading(id || 'new');
    try {
      const clean: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(data)) {
        if (k === 'id' || k === 'created_at' || k === 'deleted_at') continue;
        if (typeof v === 'string') clean[k] = sanitize(v);
        else clean[k] = v;
      }
      let res;
      if (id) {
        res = await supabase.from(table).update(clean).eq('id', id).select('id').single();
        await logAction(`update_${table}`, String(clean.name || clean.medicine_name || id));
      } else {
        res = await supabase.from(table).insert(clean).select('id').single();
        await logAction(`insert_${table}`, String(clean.name || clean.medicine_name || 'new'));
      }
      if (res.error) throw res.error;
      showToast(isRTL ? 'تم الحفظ بنجاح' : 'Saved successfully');
      setShowForm(false);
      setEditing(null);
      loadAll();
    } catch (err) {
      showToast(isRTL ? 'فشل الحفظ' : 'Save failed', 'error');
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  }

  async function toggleVerify(table: string, id: string, current: boolean, name: string) {
    setActionLoading(id);
    try {
      const { error } = await supabase.from(table).update({ verified: !current }).eq('id', id);
      if (error) throw error;
      await logAction(!current ? `verify_${table}` : `unverify_${table}`, name);
      showToast(isRTL ? (!current ? `تم توثيق: ${name}` : `تم إلغاء توثيق: ${name}`) : (!current ? `Verified: ${name}` : `Unverified: ${name}`));
      loadAll();
    } catch {
      showToast(isRTL ? 'فشل' : 'Failed', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  async function toggleRestrict(id: string, current: boolean, name: string) {
    setActionLoading(id);
    try {
      const { error } = await supabase.from('medicines').update({ is_restricted: !current }).eq('id', id);
      if (error) throw error;
      await logAction(!current ? `restrict_medicine` : `unrestrict_medicine`, name);
      showToast(isRTL ? (!current ? `تم تقييد: ${name}` : `تم إلغاء تقييد: ${name}`) : (!current ? `Restricted: ${name}` : `Unrestricted: ${name}`));
      loadAll();
    } catch {
      showToast(isRTL ? 'فشل' : 'Failed', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  async function toggleBan(id: string, current: boolean, name: string) {
    setActionLoading(id);
    try {
      const { error } = await supabase.from('profiles').update({ banned: !current }).eq('id', id);
      if (error) throw error;
      await logAction(!current ? `ban_user` : `unban_user`, name);
      showToast(isRTL ? (!current ? `تم حظر: ${name}` : `تم إلغاء حظر: ${name}`) : (!current ? `Banned: ${name}` : `Unbanned: ${name}`));
      loadAll();
    } catch {
      showToast(isRTL ? 'فشل' : 'Failed', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  async function toggleFreeze(id: string, current: boolean, name: string) {
    if (!current) {
      setFreezeModal({ id, name, current });
      return;
    }
    setActionLoading(id);
    try {
      const { error } = await supabase.from('profiles').update({ frozen: false, freeze_reason: null }).eq('id', id);
      if (error) throw error;
      await logAction('unfreeze_account', name, null, null, { reason: isRTL ? 'إلغاء التجميد' : 'Unfrozen' });
      showToast(isRTL ? `تم إلغاء تجميد: ${name}` : `Unfrozen: ${name}`);
      loadAll();
    } catch {
      showToast(isRTL ? 'فشل' : 'Failed', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  async function confirmFreeze() {
    if (!freezeModal) return;
    setActionLoading(freezeModal.id);
    try {
      const { error } = await supabase.from('profiles').update({ frozen: true, freeze_reason: sanitize(freezeReason) || null }).eq('id', freezeModal.id);
      if (error) throw error;
      await logAction('freeze_account', freezeModal.name, null, null, { reason: sanitize(freezeReason) || (isRTL ? 'بدون سبب محدد' : 'No reason specified') });
      showToast(isRTL ? `تم تجميد حساب: ${freezeModal.name}` : `Frozen: ${freezeModal.name}`);
      setFreezeModal(null);
      setFreezeReason('');
      loadAll();
    } catch {
      showToast(isRTL ? 'فشل' : 'Failed', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  async function sendWarning(data: { target_type: string; target_id: string; message: string; severity: string; duration_type?: string; duration_hours?: number; expires_at?: string | null }) {
    setActionLoading('warning');
    try {
      const { error } = await supabase.from('facility_warnings').insert({
        target_type: sanitize(data.target_type),
        target_id: sanitize(data.target_id),
        message: sanitize(data.message),
        severity: sanitize(data.severity),
        duration_type: sanitize(data.duration_type || 'permanent'),
        duration_hours: data.duration_hours ?? null,
        expires_at: data.expires_at ?? null,
        created_by: user?.id,
      });
      if (error) throw error;
      await logAction('warn_facility', data.message.slice(0, 50));
      showToast(isRTL ? 'تم إرسال الإنذار' : 'Warning sent');
      setShowWarningForm(false);
      loadAll();
    } catch {
      showToast(isRTL ? 'فشل الإرسال' : 'Send failed', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  async function deleteWarning(id: string) {
    setActionLoading(id);
    try {
      const { error } = await supabase.from('facility_warnings').delete().eq('id', id);
      if (error) throw error;
      showToast(isRTL ? 'تم حذف الإنذار' : 'Warning deleted');
      loadAll();
    } catch {
      showToast(isRTL ? 'فشل' : 'Failed', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  async function restoreVersion(versionId: string, entityTable: string, entityId: string, name: string) {
    setActionLoading(versionId);
    try {
      const ver = versions.find((v) => v.id === versionId);
      if (!ver) throw new Error('Version not found');
      const snapshot = ver.snapshot as Record<string, unknown>;
      const { id, created_at, deleted_at, ...rest } = snapshot as Record<string, unknown>;
      void id; void created_at; void deleted_at;
      const clean: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(rest)) {
        if (typeof v === 'string') clean[k] = sanitize(v);
        else clean[k] = v;
      }
      const { error } = await supabase.from(entityTable).update(clean).eq('id', entityId);
      if (error) throw error;
      await logAction(`restore_version_${entityTable}`, name);
      showToast(isRTL ? `تم استرجاع نسخة سابقة: ${name}` : `Restored previous version: ${name}`);
      setShowVersionHistory(null);
      loadAll();
    } catch {
      showToast(isRTL ? 'فشل الاسترجاع' : 'Restore failed', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  async function sendAlert(data: { target_type: string; target_id: string; area: string; message: string; severity: string; expires_at?: string | null; max_views_per_user?: number | null }) {
    setActionLoading('alert');
    try {
      const { error } = await supabase.from('admin_alerts').insert({
        target_type: sanitize(data.target_type),
        target_id: sanitize(data.target_id),
        area: data.area ? sanitize(data.area) : null,
        message: sanitize(data.message),
        severity: sanitize(data.severity),
        created_by: user?.id,
      });
      if (error) throw error;
      // Also create a public notification visible to all authenticated users
      const notifType = data.severity === 'emergency' ? 'emergency' : data.severity === 'warning' ? 'warning' : 'info';
      await supabase.from('notifications').insert({
        title: isRTL ? 'تنبيه من الإدارة' : 'Admin Alert',
        content: sanitize(data.message),
        type: notifType,
        expires_at: data.expires_at ?? null,
        max_views_per_user: data.max_views_per_user ?? null,
        is_active: true,
        created_by: user?.id,
      });
      await logAction('send_alert', data.message.slice(0, 50));
      showToast(isRTL ? 'تم إرسال التنبيه' : 'Alert sent');
      setShowAlertForm(false);
      loadAll();
    } catch {
      showToast(isRTL ? 'فشل الإرسال' : 'Send failed', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  async function deleteAlert(id: string) {
    setActionLoading(id);
    try {
      const { error } = await supabase.from('admin_alerts').delete().eq('id', id);
      if (error) throw error;
      showToast(isRTL ? 'تم حذف التنبيه' : 'Alert deleted');
      loadAll();
    } catch {
      showToast(isRTL ? 'فشل' : 'Failed', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  async function reviewExchange(id: string, status: 'approved' | 'rejected', notes: string) {
    setActionLoading(id);
    try {
      const { error } = await supabase.from('med_exchange_requests').update({ status, admin_notes: sanitize(notes), reviewed_at: new Date().toISOString(), reviewed_by: user?.id }).eq('id', id);
      if (error) throw error;
      await logAction(`exchange_${status}`, id);
      showToast(isRTL ? (status === 'approved' ? 'تمت الموافقة على الطلب' : 'تم رفض الطلب') : (status === 'approved' ? 'Request approved' : 'Request rejected'));
      loadAll();
    } catch {
      showToast(isRTL ? 'فشل' : 'Failed', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  async function resolveReport(id: string, status: 'open' | 'reviewing' | 'resolved' | 'dismissed') {
    setActionLoading(id);
    try {
      const updates: Record<string, unknown> = { status };
      if (status === 'resolved' || status === 'dismissed') updates.resolved_at = new Date().toISOString();
      const { error } = await supabase.from('data_reports').update(updates).eq('id', id);
      if (error) throw error;
      await logAction(`report_${status}`, id);
      showToast(isRTL ? (status === 'resolved' ? 'تم حل البلاغ' : status === 'reviewing' ? 'جارٍ مراجعة البلاغ' : 'تم رفض البلاغ') : (status === 'resolved' ? 'Report resolved' : status === 'reviewing' ? 'Report under review' : 'Report dismissed'));
      loadAll();
    } catch {
      showToast(isRTL ? 'فشل' : 'Failed', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  async function resolveRecall(id: string) {
    setActionLoading(id);
    try {
      const { error } = await supabase.from('batch_recalls').update({ status: 'resolved' }).eq('id', id);
      if (error) throw error;
      await logAction('recall_resolved', id);
      showToast(isRTL ? 'تم حل سحب التشغيلة' : 'Recall resolved');
      loadAll();
    } catch {
      showToast(isRTL ? 'فشل' : 'Failed', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  async function createRecall(data: { medicine_name: string; batch_number: string; reason: string; severity: string }) {
    setActionLoading('recall-new');
    try {
      const { error } = await supabase.from('batch_recalls').insert({ medicine_name: sanitize(data.medicine_name), batch_number: sanitize(data.batch_number), reason: sanitize(data.reason), severity: sanitize(data.severity), created_by: user?.id });
      if (error) throw error;
      await logAction('create_recall', data.medicine_name);
      showToast(isRTL ? 'تم إنشاء سحب التشغيلة' : 'Recall created');
      setShowRecallForm(false);
      loadAll();
    } catch {
      showToast(isRTL ? 'فشل' : 'Failed', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  async function approveEntity(table: 'pharmacies' | 'facilities', id: string, name: string) {
    setActionLoading(id);
    try {
      const { error } = await supabase.from(table).update({ approval_status: 'approved', verified: true, rejection_reason: null }).eq('id', id);
      if (error) throw error;
      await logAction(`approve_${table}`, name);
      showToast(isRTL ? `تمت الموافقة على: ${name}` : `Approved: ${name}`);
      loadAll();
    } catch {
      showToast(isRTL ? 'فشل' : 'Failed', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  async function rejectEntity(table: 'pharmacies' | 'facilities', id: string, name: string, reason: string) {
    setActionLoading(id);
    try {
      const { error } = await supabase.from(table).update({ approval_status: 'rejected', verified: false, rejection_reason: sanitize(reason) }).eq('id', id);
      if (error) throw error;
      await logAction(`reject_${table}`, name, null, { reason: sanitize(reason) });
      const { data: entity } = await supabase.from(table).select('owner_id').eq('id', id).maybeSingle();
      if (entity?.owner_id) {
        await supabase.from('notifications').insert({ user_id: entity.owner_id, title: isRTL ? `تم رفض: ${name}` : `Rejected: ${name}`, body: isRTL ? `سبب الرفض: ${reason}` : `Rejection reason: ${reason}`, type: 'rejection' });
      }
      showToast(isRTL ? `تم رفض: ${name}` : `Rejected: ${name}`);
      loadAll();
    } catch {
      showToast(isRTL ? 'فشل' : 'Failed', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  async function reviewDonation(id: string, status: 'approved' | 'rejected', reason?: string) {
    setActionLoading(id);
    try {
      const update: Record<string, unknown> = { status };
      if (status === 'rejected' && reason) update.rejection_reason = sanitize(reason);
      const { error } = await supabase.from('medicine_donations').update(update).eq('id', id);
      if (error) throw error;
      await logAction(`donation_${status}`, id);
      showToast(isRTL ? (status === 'approved' ? 'تم قبول التبرع' : 'تم رفض التبرع') : (status === 'approved' ? 'Donation approved' : 'Donation rejected'));
      loadAll();
    } catch {
      showToast(isRTL ? 'فشل' : 'Failed', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  async function distributeDonation(id: string, pharmacyId?: string, facilityId?: string) {
    setActionLoading(id);
    try {
      const update: Record<string, unknown> = { status: 'distributed', distributed_at: new Date().toISOString() };
      if (pharmacyId) update.recipient_pharmacy_id = pharmacyId;
      if (facilityId) update.recipient_facility_id = facilityId;
      const { error } = await supabase.from('medicine_donations').update(update).eq('id', id);
      if (error) throw error;
      await logAction('donation_distributed', id);
      showToast(isRTL ? 'تم تسجيل التوزيع' : 'Distribution recorded');
      loadAll();
    } catch {
      showToast(isRTL ? 'فشل' : 'Failed', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  function changeRole(id: string, name: string, newRole: string) {
    const oldRole = users.find((u) => u.id === id)?.role || 'citizen';
    setRoleConfirm({ id, name, newRole, oldRole });
  }

  async function rollbackAudit(log: AuditLog) {
    setActionLoading(log.id);
    try {
      if (log.action === 'change_role' && log.before_state?.role) {
        const entityId = log.entity_id;
        const { error } = await supabase.from('profiles').update({ role: log.before_state.role }).eq('id', entityId);
        if (error) throw error;
      } else if (log.action.startsWith('ban_user') && log.before_state?.banned !== undefined) {
        const { error } = await supabase.from('profiles').update({ banned: log.before_state.banned }).eq('id', log.entity_id);
        if (error) throw error;
      } else if (log.action.startsWith('freeze_account') && log.before_state?.frozen !== undefined) {
        const { error } = await supabase.from('profiles').update({ frozen: log.before_state.frozen, freeze_reason: log.before_state.freeze_reason || null }).eq('id', log.entity_id);
        if (error) throw error;
      } else if (log.action.startsWith('verify_') || log.action.startsWith('unverify_')) {
        const table = log.action.includes('pharmac') ? 'pharmacies' : log.action.includes('facilit') ? 'facilities' : 'profiles';
        const verified = log.action.startsWith('verify_');
        const { error } = await supabase.from(table).update({ verified }).eq('id', log.entity_id);
        if (error) throw error;
      } else if (log.action.startsWith('restrict_medicine') && log.before_state?.is_restricted !== undefined) {
        const { error } = await supabase.from('medicines').update({ is_restricted: log.before_state.is_restricted }).eq('id', log.entity_id);
        if (error) throw error;
      } else {
        showToast(isRTL ? 'لا يمكن التراجع عن هذا الإجراء' : 'Cannot rollback this action', 'error');
        return;
      }
      await logAction(`rollback_${log.action}`, log.entity_id, log.after_state, log.before_state);
      showToast(isRTL ? 'تم التراجع عن الإجراء' : 'Action rolled back');
      setRollbackConfirm(null);
      loadAll();
    } catch {
      showToast(isRTL ? 'فشل التراجع' : 'Rollback failed', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  async function resolveBugReport(id: string, status: 'resolved' | 'dismissed') {
    setActionLoading(id);
    try {
      const { error } = await supabase.from('bug_reports').update({ status, resolved_at: status === 'resolved' ? new Date().toISOString() : null }).eq('id', id);
      if (error) throw error;
      await logAction(`bug_${status}`, id);
      showToast(isRTL ? (status === 'resolved' ? 'تم حل البلاغ' : 'تم رفض البلاغ') : (status === 'resolved' ? 'Bug resolved' : 'Bug dismissed'));
      loadAll();
    } catch {
      showToast(isRTL ? 'فشل' : 'Failed', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  async function updateSuggestionStatus(id: string, status: 'reviewing' | 'implemented' | 'rejected') {
    setActionLoading(id);
    try {
      const { error } = await supabase.from('suggestions').update({ status }).eq('id', id);
      if (error) throw error;
      await logAction(`suggestion_${status}`, id);
      showToast(isRTL ? 'تم تحديث حالة الاقتراح' : 'Suggestion status updated');
      loadAll();
    } catch {
      showToast(isRTL ? 'فشل' : 'Failed', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  async function closeConversation(id: string) {
    setActionLoading(id);
    try {
      const { error } = await supabase.from('conversations').update({ status: 'closed', closed_at: new Date().toISOString(), closed_by: user?.id || null }).eq('id', id);
      if (error) throw error;
      await logAction('conversation_closed', id);
      showToast(isRTL ? 'تم إغلاق المحادثة' : 'Conversation closed');
      setActiveAdminConv(null);
      loadAll();
    } catch {
      showToast(isRTL ? 'فشل' : 'Failed', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  async function confirmRoleChange() {
    if (!roleConfirm) return;
    setActionLoading(roleConfirm.id);
    try {
      const { error } = await supabase.from('profiles').update({ role: roleConfirm.newRole }).eq('id', roleConfirm.id);
      if (error) throw error;
      await logAction('change_role', `${roleConfirm.name} → ${roleConfirm.newRole}`,
        { role: roleConfirm.oldRole }, { role: roleConfirm.newRole });
      showToast(isRTL ? `تم تغيير دور: ${roleConfirm.name}` : `Role changed: ${roleConfirm.name}`);
      setRoleConfirm(null);
      loadAll();
    } catch {
      showToast(isRTL ? 'فشل' : 'Failed', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  // ---- Export ----
  function exportData(format: 'json' | 'csv' | 'html') {
    const ts = Date.now();
    if (tab === 'pharmacies') {
      const rows = pharmacies.filter((p) => !p.deleted_at).map((p) => ({ id: p.id, name: p.name, area: p.area, phone: p.phone, status: p.status, verified: p.verified }));
      if (format === 'json') downloadJSON(rows, `pharmacies-${ts}.json`);
      else if (format === 'csv') downloadCSV(rows, `pharmacies-${ts}.csv`);
      else downloadHTML('الصيدليات', rows, `pharmacies-${ts}.html`);
    } else if (tab === 'facilities') {
      const rows = facilities.filter((f) => !f.deleted_at).map((f) => ({ id: f.id, name: f.name, type: f.type, area: f.area, status: f.overall_status, occupancy: f.occupancy_rate, verified: f.verified }));
      if (format === 'json') downloadJSON(rows, `facilities-${ts}.json`);
      else if (format === 'csv') downloadCSV(rows, `facilities-${ts}.csv`);
      else downloadHTML('المرافق', rows, `facilities-${ts}.html`);
    } else if (tab === 'medicines') {
      const rows = medicines.filter((m) => !m.deleted_at).map((m) => ({ id: m.id, name: m.medicine_name, generic: m.generic_name, price: m.price, quantity: m.quantity, category: m.category, restricted: m.is_restricted }));
      if (format === 'json') downloadJSON(rows, `medicines-${ts}.json`);
      else if (format === 'csv') downloadCSV(rows, `medicines-${ts}.csv`);
      else downloadHTML('الأدوية', rows, `medicines-${ts}.html`);
    } else if (tab === 'users') {
      const rows = users.filter((u) => !u.deleted_at).map((u) => ({ id: u.id, name: u.display_name, role: u.role, phone: u.phone, verified: u.verified, banned: u.banned }));
      if (format === 'json') downloadJSON(rows, `users-${ts}.json`);
      else if (format === 'csv') downloadCSV(rows, `users-${ts}.csv`);
      else downloadHTML('المستخدمون', rows, `users-${ts}.html`);
    } else {
      const all = { pharmacies, facilities, medicines, users, reviews };
      downloadJSON(all, `backup-${ts}.json`);
    }
    showToast(isRTL ? `تم التصدير (${format.toUpperCase()})` : `Exported (${format.toUpperCase()})`);
  }

  async function handleLogout() {
    await signOut();
    showToast(isRTL ? 'تم تسجيل الخروج' : 'Logged out');
  }

  const tabs: { key: Tab; label: string; icon: typeof Pill; count?: number }[] = [
    { key: 'pending', label: isRTL ? 'المعلّقة' : 'Pending', icon: XCircle, count: stats.pending },
    { key: 'pharmacies', label: isRTL ? 'الصيدليات' : 'Pharmacies', icon: Pill, count: stats.totalPharmacies },
    { key: 'facilities', label: isRTL ? 'المرافق' : 'Facilities', icon: Building2, count: stats.totalFacilities },
    { key: 'medicines', label: isRTL ? 'الأدوية' : 'Medicines', icon: Activity, count: stats.totalMedicines },
    { key: 'reviews', label: isRTL ? 'التقييمات' : 'Reviews', icon: Star, count: stats.totalReviews },
    { key: 'users', label: isRTL ? 'المستخدمون' : 'Users', icon: Users, count: stats.totalUsers },
    { key: 'trash', label: isRTL ? 'سلة المهملات' : 'Trash', icon: Trash2, count: stats.trashed },
    { key: 'alerts', label: isRTL ? 'التنبيهات' : 'Alerts', icon: Radio, count: alerts.length },
    { key: 'exchange', label: isRTL ? 'تبادل الأدوية' : 'Med-Exchange', icon: Package, count: stats.pendingExchange },
    { key: 'reports', label: isRTL ? 'بلاغات' : 'Reports', icon: Flag, count: stats.openReports },
    { key: 'recalls', label: isRTL ? 'سحب التشغيلات' : 'Recalls', icon: AlertOctagon, count: stats.activeRecalls },
    { key: 'warnings', label: isRTL ? 'إنذارات' : 'Warnings', icon: AlertTriangle, count: warnings.length },
    { key: 'audit', label: isRTL ? 'سجل التدقيق' : 'Audit Logs', icon: ScrollText, count: auditLogs.length },
    { key: 'heatmap', label: isRTL ? 'الخريطة الحرارية' : 'Heatmap', icon: Flame },
    { key: 'broadcasts', label: isRTL ? 'بث طارئ' : 'Broadcasts', icon: Megaphone, count: broadcasts.length },
    { key: 'donations', label: isRTL ? 'طلبات التبرع' : 'Donations', icon: Gift, count: donations.filter((d) => d.status === 'pending').length },
    { key: 'bugs', label: isRTL ? 'أخطاء تقنية' : 'Bug Reports', icon: Bug, count: bugReports.filter((b) => b.status === 'open').length },
    { key: 'suggestions', label: isRTL ? 'اقتراحات' : 'Suggestions', icon: Lightbulb, count: suggestions.filter((s) => s.status === 'open').length },
    { key: 'conversations', label: isRTL ? 'محادثات' : 'Conversations', icon: MessageCircle, count: conversations.filter((c) => c.status === 'active').length },
  ];

  const showExportButtons = ['pharmacies', 'facilities', 'medicines', 'users', 'reviews'].includes(tab);

  // ---- Search filter helper ----
  function filterBySearch<T>(items: T[], fields: string[]): T[] {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter((item) => {
      const obj = item as unknown as Record<string, unknown>;
      return fields.some((f) => String(obj[f] || '').toLowerCase().includes(q));
    });
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-dark)] p-6">
        <div className="glass-card p-8 text-center max-w-md">
          <ShieldX className="w-12 h-12 mx-auto mb-4 text-status-emergency" />
          <h2 className="font-cairo font-bold text-lg mb-2">{isRTL ? 'صلاحية مرفوضة' : 'Access Denied'}</h2>
          <p className="text-sm font-tajawal text-[var(--text-muted)]">{isRTL ? 'هذه الصفحة مخصصة لمسؤولي النظام فقط.' : 'This page is for system administrators only.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-dark)] text-[var(--text-main)] p-4 sm:p-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-blue/15 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-brand-blue-light" />
            </div>
            <div>
              <h1 className="font-cairo font-black text-xl">{isRTL ? 'لوحة الإدارة' : 'Admin Panel'}</h1>
              <p className="text-xs text-[var(--text-muted)] font-tajawal">{user?.email}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {showExportButtons && (
              <>
                <button onClick={() => exportData('json')} className="px-3 py-2 rounded-xl glass text-xs font-bold flex items-center gap-1 hover:bg-brand-green/15 transition-colors">
                  <Download className="w-3.5 h-3.5" /> JSON
                </button>
                <button onClick={() => exportData('csv')} className="px-3 py-2 rounded-xl glass text-xs font-bold flex items-center gap-1 hover:bg-brand-green/15 transition-colors">
                  <FileText className="w-3.5 h-3.5" /> CSV
                </button>
                <button onClick={() => exportData('html')} className="px-3 py-2 rounded-xl glass text-xs font-bold flex items-center gap-1 hover:bg-brand-green/15 transition-colors">
                  <FileText className="w-3.5 h-3.5" /> PDF
                </button>
              </>
            )}
            <button onClick={() => downloadSQLDump({ pharmacies: pharmacies as unknown as Record<string, unknown>[], facilities: facilities as unknown as Record<string, unknown>[], medicines: medicines as unknown as Record<string, unknown>[], reviews: reviews as unknown as Record<string, unknown>[] }, `dawaa-shifaa-dump-${Date.now()}.sql`)} className="px-3 py-2 rounded-xl bg-brand-green/15 text-brand-green-light text-xs font-bold flex items-center gap-1 hover:bg-brand-green/25 transition-colors">
              <Database className="w-3.5 h-3.5" /> {isRTL ? 'تصدير SQL' : 'SQL Dump'}
            </button>
            <button onClick={handleLogout} className="px-4 py-2 rounded-xl bg-status-emergency/15 text-status-emergency text-xs font-bold flex items-center gap-1.5 hover:bg-status-emergency/25 transition-colors">
              <LogOut className="w-4 h-4" />{isRTL ? 'تسجيل الخروج' : 'Logout'}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[
            { label: isRTL ? 'صيدلية' : 'Pharmacies', value: stats.totalPharmacies, icon: Pill, color: 'text-brand-green-light' },
            { label: isRTL ? 'مرفق' : 'Facilities', value: stats.totalFacilities, icon: Building2, color: 'text-brand-blue-light' },
            { label: isRTL ? 'موثّق' : 'Verified', value: stats.verified, icon: CheckCircle, color: 'text-status-open' },
            { label: isRTL ? 'معلّق' : 'Pending', value: stats.pending, icon: XCircle, color: 'text-status-busy' },
            { label: isRTL ? 'مستخدم' : 'Users', value: stats.totalUsers, icon: Users, color: 'text-brand-blue-light' },
            { label: isRTL ? 'مقيّد' : 'Restricted', value: stats.restricted, icon: Ban, color: 'text-status-emergency' },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.06 } }} className="glass-card p-3 text-center">
              <s.icon className={`w-4 h-4 mx-auto mb-1 ${s.color}`} />
              <div className="font-inter font-black text-xl">{s.value}</div>
              <div className="text-[10px] text-[var(--text-muted)] font-tajawal">{s.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Search bar */}
        {['pharmacies', 'facilities', 'medicines', 'reviews', 'users', 'exchange', 'reports', 'recalls'].includes(tab) && (
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isRTL ? 'بحث سريع...' : 'Quick search...'}
              className="w-full glass-card pr-10 pl-4 py-2.5 text-sm font-tajawal focus:outline-none focus:border-brand-green transition-colors"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1.5 flex-wrap">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`px-3 py-2 rounded-xl text-xs font-tajawal font-bold flex items-center gap-1.5 transition-colors ${tab === t.key ? 'bg-brand-green text-white' : 'glass text-[var(--text-soft)]'}`}>
              <t.icon className="w-3.5 h-3.5" />{t.label}
              {t.count !== undefined && t.count > 0 && <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${tab === t.key ? 'bg-white/20' : 'bg-[var(--border-subtle)]'}`}>{t.count}</span>}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="glass-card p-5">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-brand-green-light" /></div>
          ) : (
            <>
              {tab === 'pending' && (
                <PendingList pharmacies={pharmacies} facilities={facilities} medicines={medicines} departments={departments} onApprove={(t, id, name) => approveEntity(t as 'pharmacies' | 'facilities', id, name)} onReject={(t, id, name) => setRejectPending({ table: t, id, name })} actionLoading={actionLoading} isRTL={isRTL} />
              )}

              {tab === 'pharmacies' && (
                <>
                <div className="flex justify-end mb-2">
                  <button onClick={() => setShowImport('pharmacies')} className="btn-secondary text-xs flex items-center gap-1.5"><Upload className="w-3.5 h-3.5" />{isRTL ? 'استيراد مجمّع' : 'Bulk Import'}</button>
                </div>
                <EntityList title={isRTL ? 'الصيدليات' : 'Pharmacies'} items={filterBySearch(pharmacies.filter((p) => !p.deleted_at), ['name', 'area', 'phone']).map((p) => ({ id: p.id, name: p.name, sub: `${p.area} · ${p.phone}`, verified: p.verified }))}
                  onAdd={() => { setEditing({ type: 'pharmacy', data: {} }); setShowForm(true); }}
                  onEdit={(id) => { const p = pharmacies.find((x) => x.id === id); if (p) { setEditing({ type: 'pharmacy', data: p as unknown as Record<string, unknown> }); setShowForm(true); } }}
                  onDelete={(id) => { const p = pharmacies.find((x) => x.id === id); if (p) softDelete('pharmacies', id, p.name); }}
                  onToggleVerify={(id) => { const p = pharmacies.find((x) => x.id === id); if (p) toggleVerify('pharmacies', id, p.verified, p.name); }}
                  onSendAlert={(id) => { const p = pharmacies.find((x) => x.id === id); if (p) { setEditing({ type: 'alert', data: { target_type: 'pharmacy', target_id: id, target_name: p.name } }); setShowAlertForm(true); } }}
                  actionLoading={actionLoading} isRTL={isRTL} />
                </>
              )}

              {tab === 'facilities' && (
                <>
                <div className="flex justify-end mb-2">
                  <button onClick={() => setShowImport('facilities')} className="btn-secondary text-xs flex items-center gap-1.5"><Upload className="w-3.5 h-3.5" />{isRTL ? 'استيراد مجمّع' : 'Bulk Import'}</button>
                </div>
                <EntityList title={isRTL ? 'المرافق الطبية' : 'Medical Facilities'} items={filterBySearch(facilities.filter((f) => !f.deleted_at), ['name', 'area', 'type', 'address']).map((f) => ({ id: f.id, name: f.name, sub: `${f.area} · ${f.type} · ${f.occupancy_rate}%`, verified: f.verified }))}
                  onAdd={() => { setEditing({ type: 'facility', data: {} }); setShowForm(true); }}
                  onEdit={(id) => { const f = facilities.find((x) => x.id === id); if (f) { setEditing({ type: 'facility', data: f as unknown as Record<string, unknown> }); setShowForm(true); } }}
                  onDelete={(id) => { const f = facilities.find((x) => x.id === id); if (f) softDelete('facilities', id, f.name); }}
                  onToggleVerify={(id) => { const f = facilities.find((x) => x.id === id); if (f) toggleVerify('facilities', id, f.verified, f.name); }}
                  onSendAlert={(id) => { const f = facilities.find((x) => x.id === id); if (f) { setEditing({ type: 'alert', data: { target_type: 'facility', target_id: id, target_name: f.name } }); setShowAlertForm(true); } }}
                  onVersionHistory={(id) => setShowVersionHistory(id)}
                  actionLoading={actionLoading} isRTL={isRTL} />
                </>
              )}

              {tab === 'medicines' && (
                <>
                <div className="flex justify-end mb-2">
                  <button onClick={() => setShowImport('medicines')} className="btn-secondary text-xs flex items-center gap-1.5"><Upload className="w-3.5 h-3.5" />{isRTL ? 'استيراد مجمّع' : 'Bulk Import'}</button>
                </div>
                <MedicinesList medicines={medicines} pharmacies={pharmacies} pharmFilter={medicinePharmFilter} setPharmFilter={setMedicinePharmFilter}
                  onAdd={() => { setEditing({ type: 'medicine', data: {} }); setShowForm(true); }}
                  onEdit={(id) => { const m = medicines.find((x) => x.id === id); if (m) { setEditing({ type: 'medicine', data: m as unknown as Record<string, unknown> }); setShowForm(true); } }}
                  onDelete={(id) => { const m = medicines.find((x) => x.id === id); if (m) softDelete('medicines', id, m.medicine_name); }}
                  onToggleRestrict={(id) => { const m = medicines.find((x) => x.id === id); if (m) toggleRestrict(id, m.is_restricted, m.medicine_name); }}
                  onVersionHistory={(id) => setShowVersionHistory(id)}
                  actionLoading={actionLoading} isRTL={isRTL} />
                </>
              )}

              {tab === 'reviews' && (
                <ReviewsList reviews={filterBySearch(reviews, ['user_name', 'target_name', 'text'])} pharmacies={pharmacies} facilities={facilities} users={users} auditLogs={auditLogs} dataReports={dataReports} onDelete={(id) => permanentDelete('reviews', id, id.slice(0, 8))} onTargetClick={(type, id, name) => setSelectedReviewTarget({ type, id, name })} onUserClick={(u) => setSelectedUser(u)} actionLoading={actionLoading} isRTL={isRTL} />
              )}

              {tab === 'users' && (
                <UsersList users={users} roleFilter={userRoleFilter} setRoleFilter={setUserRoleFilter}
                  onToggleVerify={(id, cur, name) => toggleVerify('profiles', id, cur, name)}
                  onToggleBan={(id, cur, name) => toggleBan(id, cur, name)}
                  onToggleFreeze={(id, cur, name) => toggleFreeze(id, cur, name)}
                  onRoleChange={(id, role, name) => changeRole(id, name, role)}
                  onSoftDelete={(id, name) => softDelete('profiles', id, name)}
                  onUserClick={(u) => setSelectedUser(u)}
                  actionLoading={actionLoading} isRTL={isRTL} />
              )}

              {tab === 'trash' && (
                <TrashList pharmacies={pharmacies} facilities={facilities} medicines={medicines}
                  onRestore={restoreItem} onPermanentDelete={permanentDelete} actionLoading={actionLoading} isRTL={isRTL} />
              )}

              {tab === 'alerts' && (
                <AlertsList alerts={alerts} onNew={() => { setEditing({ type: 'alert', data: {} }); setShowAlertForm(true); }} onDelete={deleteAlert} actionLoading={actionLoading} isRTL={isRTL} />
              )}

              {tab === 'exchange' && (
                <ExchangeList requests={filterBySearch(exchangeReqs, ['medicine_name', 'generic_name', 'pharmacy_name', 'requester_name'])} pharmacies={pharmacies} onApprove={(id) => reviewExchange(id, 'approved', '')} onReject={(id, notes) => reviewExchange(id, 'rejected', notes)} actionLoading={actionLoading} isRTL={isRTL} />
              )}

              {tab === 'reports' && (
                <ReportsList reports={filterBySearch(dataReports, ['target_name', 'reporter_name', 'message'])} onResolve={(id) => resolveReport(id, 'resolved')} onReview={(id) => resolveReport(id, 'reviewing')} onDismiss={(id) => resolveReport(id, 'dismissed')} onReportClick={(r) => setSelectedReport(r)} onDelete={(id) => permanentDelete('data_reports', id, id.slice(0, 8))} actionLoading={actionLoading} isRTL={isRTL} />
              )}

              {tab === 'recalls' && (
                <RecallsList recalls={filterBySearch(recalls, ['medicine_name', 'batch_number', 'reason'])} onNew={() => setShowRecallForm(true)} onResolve={(id) => resolveRecall(id)} onDelete={(id) => permanentDelete('batch_recalls', id, id.slice(0, 8))} actionLoading={actionLoading} isRTL={isRTL} />
              )}

              {tab === 'warnings' && (
                <WarningsList warnings={warnings} facilities={facilities} pharmacies={pharmacies} onNew={() => { setEditing({ type: 'warning', data: {} }); setShowWarningForm(true); }} onDelete={deleteWarning} actionLoading={actionLoading} isRTL={isRTL} />
              )}

              {tab === 'audit' && (
                <AuditLogsList logs={filterBySearch(auditLogs, ['actor_name', 'action', 'entity_type', 'entity_id'])} onRollback={(log) => setRollbackConfirm(log)} onLogClick={(log) => setAuditDetail(log)} actionLoading={actionLoading} isRTL={isRTL} />
              )}

              {tab === 'heatmap' && (
                <HeatmapTab logs={searchLogs} isRTL={isRTL} />
              )}

              {tab === 'broadcasts' && (
                <BroadcastsTab broadcasts={broadcasts} onNew={() => setShowBroadcastForm(true)} onDelete={async (id) => { setActionLoading(id); try { const { error } = await supabase.from('emergency_broadcasts').delete().eq('id', id); if (error) throw error; await logAction('delete_broadcast', id.slice(0, 8)); showToast(isRTL ? 'تم حذف البث' : 'Broadcast deleted'); loadAll(); } catch { showToast(isRTL ? 'فشل' : 'Failed', 'error'); } finally { setActionLoading(null); } }} actionLoading={actionLoading} isRTL={isRTL} />
              )}

              {tab === 'donations' && (
                <DonationsList donations={filterBySearch(donations, ['donor_name', 'medicine_name', 'generic_name', 'area'])} pharmacies={pharmacies} facilities={facilities} onApprove={(id) => reviewDonation(id, 'approved')} onReject={(id, reason) => reviewDonation(id, 'rejected', reason)} onDistribute={distributeDonation} actionLoading={actionLoading} isRTL={isRTL} />
              )}
              {tab === 'bugs' && (
                <BugReportsList reports={bugReports} onResolve={(id) => resolveBugReport(id, 'resolved')} onDismiss={(id) => resolveBugReport(id, 'dismissed')} onDelete={(id) => permanentDelete('bug_reports', id, id.slice(0, 8))} onChat={(r) => setChatBugReport(r)} actionLoading={actionLoading} isRTL={isRTL} />
              )}
              {tab === 'suggestions' && (
                <SuggestionsList suggestions={suggestions} roleFilter={suggestionRoleFilter} setRoleFilter={setSuggestionRoleFilter} dateFilter={suggestionDateFilter} setDateFilter={setSuggestionDateFilter} onStatusChange={updateSuggestionStatus} onDelete={(id) => permanentDelete('suggestions', id, id.slice(0, 8))} actionLoading={actionLoading} isRTL={isRTL} />
              )}
              {tab === 'conversations' && (
                <AdminConversationsList conversations={conversations} onOpen={(c) => setActiveAdminConv(c)} onClose={async (id) => { await closeConversation(id); }} actionLoading={actionLoading} isRTL={isRTL} />
              )}
            </>
          )}
        </div>
      </div>

      {/* Edit/Add Form Modal */}
      <AnimatePresence>
        {showForm && editing && (
          <EditForm editing={editing} pharmacies={pharmacies} onClose={() => { setShowForm(false); setEditing(null); }} onSave={(data, id) => { const table = editing.type === 'pharmacy' ? 'pharmacies' : editing.type === 'facility' ? 'facilities' : 'medicines'; saveItem(table, data, id); }} actionLoading={actionLoading !== null} isRTL={isRTL} />
        )}
      </AnimatePresence>

      {/* Alert Form Modal */}
      <AnimatePresence>
        {showAlertForm && editing?.type === 'alert' && (
          <AlertForm editing={editing} facilities={facilities} pharmacies={pharmacies} onClose={() => { setShowAlertForm(false); setEditing(null); }} onSend={sendAlert} actionLoading={actionLoading !== null} isRTL={isRTL} />
        )}
      </AnimatePresence>

      {/* Version History Modal */}
      <AnimatePresence>
        {showVersionHistory && (
          <VersionHistory entityId={showVersionHistory} versions={versions} onRestore={restoreVersion} onClose={() => setShowVersionHistory(null)} actionLoading={actionLoading} isRTL={isRTL} />
        )}
      </AnimatePresence>

      {/* Recall Form Modal */}
      <AnimatePresence>
        {showRecallForm && (
          <RecallForm onClose={() => setShowRecallForm(false)} onSave={createRecall} actionLoading={actionLoading !== null} isRTL={isRTL} />
        )}
      </AnimatePresence>

      {/* Bulk Import Modal */}
      <AnimatePresence>
        {showImport && (
          <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"><Loader2 className="w-8 h-8 animate-spin text-brand-green" /></div>}>
            <BulkImport entityType={showImport} onClose={() => setShowImport(null)} onDone={loadAll} isRTL={isRTL} />
          </Suspense>
        )}
      </AnimatePresence>

      {/* Warning Form Modal */}
      <AnimatePresence>
        {showWarningForm && editing?.type === 'warning' && (
          <WarningForm editing={editing} facilities={facilities} pharmacies={pharmacies} onClose={() => { setShowWarningForm(false); setEditing(null); }} onSend={sendWarning} actionLoading={actionLoading !== null} isRTL={isRTL} />
        )}
      </AnimatePresence>

      {/* Broadcast Form Modal */}
      <AnimatePresence>
        {showBroadcastForm && (
          <BroadcastForm onClose={() => setShowBroadcastForm(false)} onSend={async (data) => { setActionLoading('new-broadcast'); try { const expiresAt = data.duration_type === 'permanent' ? null : data.expires_at ? data.expires_at : data.duration_hours ? new Date(Date.now() + data.duration_hours * 3600000).toISOString() : new Date(Date.now() + 24 * 3600000).toISOString(); const { error } = await supabase.from('emergency_broadcasts').insert({ title: data.title, message: data.message, area: data.area, severity: data.severity, expires_at: expiresAt, created_by: user?.id }); if (error) throw error; await logAction('create_broadcast', data.title); showToast(isRTL ? 'تم إرسال البث الطارئ' : 'Emergency broadcast sent'); setShowBroadcastForm(false); loadAll(); } catch { showToast(isRTL ? 'فشل' : 'Failed', 'error'); } finally { setActionLoading(null); } }} actionLoading={actionLoading === 'new-broadcast'} isRTL={isRTL} />
        )}
      </AnimatePresence>

      {/* Role Change Confirmation Modal */}
      {roleConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setRoleConfirm(null)}>
          <div className="glass-card p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-cairo font-bold text-base mb-3">{isRTL ? 'تأكيد تغيير الدور' : 'Confirm Role Change'}</h3>
            <p className="text-sm font-tajawal text-[var(--text-soft)] mb-4">{isRTL ? `سيتم تغيير دور "${roleConfirm.name}" إلى "${roleConfirm.newRole}". هذا الإجراء مسجّل.` : `Change "${roleConfirm.name}" role to "${roleConfirm.newRole}"? This action is logged.`}</p>
            <div className="flex gap-2">
              <button onClick={() => setRoleConfirm(null)} className="btn-secondary flex-1 text-sm">{isRTL ? 'إلغاء' : 'Cancel'}</button>
              <button onClick={confirmRoleChange} disabled={actionLoading === roleConfirm.id} className="btn-primary flex-1 text-sm disabled:opacity-50">{isRTL ? 'تأكيد' : 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Freeze Reason Modal */}
      {freezeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => { setFreezeModal(null); setFreezeReason(''); }}>
          <div className="glass-card p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-cairo font-bold text-base mb-3">{isRTL ? 'تجميد الحساب' : 'Freeze Account'}</h3>
            <p className="text-sm font-tajawal text-[var(--text-soft)] mb-3">{isRTL ? `سيتم تجميد حساب "${freezeModal.name}". أدخل السبب:` : `Freezing "${freezeModal.name}". Enter reason:`}</p>
            <textarea value={freezeReason} onChange={(e) => setFreezeReason(e.target.value)} rows={3} className="w-full glass rounded-xl p-3 text-sm font-tajawal focus:outline-none focus:border-brand-green resize-none" placeholder={isRTL ? 'سبب التجميد...' : 'Freeze reason...'} />
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setFreezeModal(null); setFreezeReason(''); }} className="btn-secondary flex-1 text-sm">{isRTL ? 'إلغاء' : 'Cancel'}</button>
              <button onClick={confirmFreeze} disabled={actionLoading === freezeModal.id} className="btn-primary flex-1 text-sm disabled:opacity-50">{isRTL ? 'تأكيد التجميد' : 'Confirm Freeze'}</button>
            </div>
          </div>
        </div>
      )}

      {/* User Detail Modal */}
      {selectedUser && (
        <UserDetailModal user={selectedUser} auditLogs={auditLogs} dataReports={dataReports} reviews={reviews} onClose={() => setSelectedUser(null)} isRTL={isRTL} />
      )}

      {/* Report Detail Modal */}
      {selectedReport && (
        <ReportDetailModal report={selectedReport} onReview={(id) => { resolveReport(id, 'reviewing'); setSelectedReport(null); }} onResolve={(id) => { resolveReport(id, 'resolved'); setSelectedReport(null); }} onDismiss={(id) => { resolveReport(id, 'dismissed'); setSelectedReport(null); }} actionLoading={actionLoading} isRTL={isRTL} />
      )}

      {/* Review Target Detail Modal */}
      {selectedReviewTarget && (
        <ReviewTargetModal target={selectedReviewTarget} reviews={reviews.filter((r) => r.target_id === selectedReviewTarget.id)} onClose={() => setSelectedReviewTarget(null)} isRTL={isRTL} />
      )}

      {/* Rollback Confirmation Modal */}
      {rollbackConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setRollbackConfirm(null)}>
          <div className="glass-card p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-cairo font-bold text-base mb-3 flex items-center gap-2"><RotateCcw className="w-5 h-5 text-amber-400" />{isRTL ? 'تراجع عن الإجراء' : 'Rollback Action'}</h3>
            <p className="text-sm font-tajawal text-[var(--text-soft)] mb-1">{isRTL ? 'سيتم عكس هذا الإجراء:' : 'This will reverse the following action:'}</p>
            <p className="text-sm font-cairo font-bold mb-4">{rollbackConfirm.action.replace(/_/g, ' ')} — {rollbackConfirm.entity_id}</p>
            {rollbackConfirm.before_state && (
              <div className="text-xs font-tajawal text-[var(--text-muted)] mb-4 glass rounded-xl p-2">
                {isRTL ? 'سيتم الاستعادة إلى:' : 'Will restore to:'} {Object.entries(rollbackConfirm.before_state).map(([k, v]) => `${k}=${String(v)}`).join(', ')}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => setRollbackConfirm(null)} className="btn-secondary flex-1 text-sm">{isRTL ? 'إلغاء' : 'Cancel'}</button>
              <button onClick={() => rollbackAudit(rollbackConfirm)} disabled={actionLoading === rollbackConfirm.id} className="flex-1 text-sm py-2.5 rounded-xl bg-amber-500/20 text-amber-400 font-bold hover:bg-amber-500/30 transition-colors disabled:opacity-50">{isRTL ? 'تأكيد التراجع' : 'Confirm Rollback'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Modal for Bug Reports */}
      {chatBugReport && (
        <BugReportChatModal report={chatBugReport} adminName={profile?.display_name || 'Admin'} adminId={user?.id || null} isRTL={isRTL} onClose={() => setChatBugReport(null)} />
      )}

      {/* Chat Modal for Conversations */}
      {activeAdminConv && (
        <AdminConversationChat conv={activeAdminConv} adminName={profile?.display_name || 'Admin'} adminId={user?.id || null} isRTL={isRTL} onClose={() => setActiveAdminConv(null)} onCloseConv={(id) => closeConversation(id)} actionLoading={actionLoading} />
      )}

      {/* Rejection Reason Modal */}
      {rejectPending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setRejectPending(null)}>
          <div className="glass-card p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-cairo font-bold text-base mb-3 flex items-center gap-2"><XCircle className="w-5 h-5 text-status-emergency" />{isRTL ? 'سبب الرفض' : 'Rejection Reason'}</h3>
            <p className="text-sm font-tajawal text-[var(--text-soft)] mb-2">{isRTL ? `سيتم رفض: ${rejectPending.name}` : `Rejecting: ${rejectPending.name}`}</p>
            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} className="w-full glass rounded-xl p-3 text-sm font-tajawal focus:outline-none focus:border-status-emergency resize-none" placeholder={isRTL ? 'أدخل سبب الرفض...' : 'Enter rejection reason...'} />
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setRejectPending(null); setRejectReason(''); }} className="btn-secondary flex-1 text-sm">{isRTL ? 'إلغاء' : 'Cancel'}</button>
              <button onClick={() => { rejectEntity(rejectPending.table as 'pharmacies' | 'facilities', rejectPending.id, rejectPending.name, rejectReason || (isRTL ? 'معلومات غير صحيحة' : 'Inaccurate information')); setRejectPending(null); setRejectReason(''); }} disabled={!rejectReason.trim()} className="flex-1 text-sm py-2.5 rounded-xl bg-status-emergency/20 text-status-emergency font-bold hover:bg-status-emergency/30 transition-colors disabled:opacity-50">{isRTL ? 'تأكيد الرفض' : 'Confirm Reject'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Log Detail Modal */}
      {auditDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setAuditDetail(null)}>
          <div className="glass-card p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-cairo font-bold text-base flex items-center gap-2"><History className="w-5 h-5 text-brand-blue-light" />{isRTL ? 'تفاصيل سجل التدقيق' : 'Audit Log Details'}</h3>
              <button onClick={() => setAuditDetail(null)} className="p-1.5 rounded-lg glass"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2"><span className="text-xs text-[var(--text-muted)] w-24">{isRTL ? 'المنفذ' : 'Performer'}:</span><span className="text-sm font-cairo font-bold">{auditDetail.actor_name}</span></div>
              <div className="flex items-center gap-2"><span className="text-xs text-[var(--text-muted)] w-24">{isRTL ? 'الإجراء' : 'Action'}:</span><span className="text-sm">{auditDetail.action.replace(/_/g, ' ')}</span></div>
              {Boolean(auditDetail.details?.description) && (
                <div className="glass rounded-xl p-2.5 mt-2">
                  <span className="text-xs font-tajawal text-[var(--text-soft)]">{String(auditDetail.details.description)}</span>                </div>
              )}
              <div className="flex items-center gap-2"><span className="text-xs text-[var(--text-muted)] w-24">{isRTL ? 'الجهة' : 'Target'}:</span><span className="text-sm font-cairo">{auditDetail.entity_type} — {auditDetail.entity_id}</span></div>
              <div className="flex items-center gap-2"><span className="text-xs text-[var(--text-muted)] w-24">{isRTL ? 'الوقت' : 'Timestamp'}:</span><span className="text-sm font-tajawal">{new Date(auditDetail.created_at).toLocaleString(isRTL ? 'ar-EG' : 'en-US')}</span></div>
              {auditDetail.before_state && (
                <div>
                  <span className="text-xs text-[var(--text-muted)] block mb-1">{isRTL ? 'الحالة قبل' : 'Before State'}:</span>
                  <pre className="text-xs font-tajawal text-[var(--text-soft)] glass rounded-xl p-2 overflow-x-auto">{JSON.stringify(auditDetail.before_state, null, 2)}</pre>
                </div>
              )}
              {auditDetail.after_state && (
                <div>
                  <span className="text-xs text-[var(--text-muted)] block mb-1">{isRTL ? 'الحالة بعد' : 'After State'}:</span>
                  <pre className="text-xs font-tajawal text-[var(--text-soft)] glass rounded-xl p-2 overflow-x-auto">{JSON.stringify(auditDetail.after_state, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ Bug Report Chat Modal ============
function BugReportChatModal({ report, adminName, adminId, isRTL, onClose }: {
  report: BugReport; adminName: string; adminId: string | null; isRTL: boolean; onClose: () => void;
}) {
  const [messages, setMessages] = useState<BugReportChat[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('bug_report_chats').select('id,bug_report_id,sender_id,sender_role,message,created_at').eq('bug_report_id', report.id).order('created_at', { ascending: true });
      setMessages((data as BugReportChat[]) || []);
      setLoading(false);
    })();
  }, [report.id]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const send = async () => {
    if (!input.trim() || !adminId) return;
    const msg = input.trim();
    setInput('');
    const tempMsg: BugReportChat = { id: 'temp', bug_report_id: report.id, sender_id: adminId, sender_name: adminName, sender_role: 'admin', message: msg, created_at: new Date().toISOString() };
    setMessages((p) => [...p, tempMsg]);
    const { data } = await supabase.from('bug_report_chats').insert({ bug_report_id: report.id, sender_id: adminId, sender_name: adminName, sender_role: 'admin', message: msg }).select().single();
    if (data) setMessages((p) => p.map((m) => m.id === 'temp' ? data as BugReportChat : m));
    if (report.reporter_id) {
      await supabase.from('notifications').insert({ user_id: report.reporter_id, title: isRTL ? 'رسالة جديدة من الإدارة' : 'New message from Admin', body: msg, type: 'chat' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="glass-card p-0 w-full max-w-md h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-brand-blue-light" />
            <div>
              <h3 className="font-cairo font-bold text-sm">{isRTL ? 'محادثة مع صاحب البلاغ' : 'Chat with Reporter'}</h3>
              <p className="text-[10px] text-[var(--text-muted)] font-tajawal">{report.reporter_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg glass"><X className="w-4 h-4" /></button>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin text-brand-blue-light" /></div>
          ) : messages.length === 0 ? (
            <p className="text-center text-sm font-tajawal text-[var(--text-muted)] mt-8">{isRTL ? 'ابدأ المحادثة...' : 'Start the conversation...'}</p>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`flex ${m.sender_role === 'admin' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-xl p-2.5 ${m.sender_role === 'admin' ? 'bg-brand-blue/20 text-[var(--text-bright)]' : 'glass text-[var(--text-soft)]'}`}>
                  <p className="text-xs font-tajawal">{m.message}</p>
                  <p className="text-[9px] text-[var(--text-muted)] mt-0.5">{new Date(m.created_at).toLocaleTimeString(isRTL ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="p-3 border-t border-[var(--border-subtle)] flex gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} className="flex-1 glass rounded-xl px-3 py-2 text-sm font-tajawal focus:outline-none focus:border-brand-blue" placeholder={isRTL ? 'اكتب رسالة...' : 'Type a message...'} />
          <button onClick={send} disabled={!input.trim()} className="btn-primary px-4 py-2 disabled:opacity-50"><Send className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
}

// ============ User Detail Modal ============
function UserDetailModal({ user, auditLogs, dataReports, reviews, onClose, isRTL }: {
  user: Profile; auditLogs: AuditLog[]; dataReports: DataReport[]; reviews: Review[];
  onClose: () => void; isRTL: boolean;
}) {
  const [freshUser, setFreshUser] = useState<Profile>(user);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from('profiles').select('id,display_name,email,phone,role,unique_id').eq('id', user.id).maybeSingle();
      if (!cancelled && data) setFreshUser(data as Profile);
    })();
    return () => { cancelled = true; };
  }, [user.id]);

  const u = freshUser;
  const userAuditLogs = auditLogs.filter((l) => l.actor_id === u.id || l.entity_id === u.id || l.entity_id === u.display_name);
  const reportsByUser = dataReports.filter((r) => r.reporter_id === u.id);
  const reportsAgainstUser = dataReports.filter((r) => r.target_id === u.id);
  const reviewsByUser = reviews.filter((r) => r.user_id === u.id);
  const roleLabels: Record<string, string> = { citizen: isRTL ? 'مواطن' : 'Citizen', pharmacist: isRTL ? 'صيدلي' : 'Pharmacist', facility_owner: isRTL ? 'صاحب مرفق' : 'Facility Owner', admin: isRTL ? 'أدمن' : 'Admin' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="glass-card p-5 w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-cairo font-bold text-base flex items-center gap-2"><Users className="w-5 h-5 text-brand-blue-light" />{isRTL ? 'تفاصيل المستخدم' : 'User Details'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg glass"><X className="w-4 h-4" /></button>
        </div>
        {/* Account info */}
        <div className="space-y-1.5 mb-4">
          <div className="flex items-center gap-2"><span className="text-xs text-[var(--text-muted)] w-20">{isRTL ? 'الاسم' : 'Name'}:</span><span className="font-cairo font-bold text-sm">{u.display_name}</span></div>
          <div className="flex items-center gap-2"><span className="text-xs text-[var(--text-muted)] w-20">{isRTL ? 'الدور' : 'Role'}:</span><span className="text-sm">{roleLabels[u.role] || u.role}</span></div>
          <div className="flex items-center gap-2"><span className="text-xs text-[var(--text-muted)] w-20">{isRTL ? 'البريد الإلكتروني' : 'Email'}:</span><span className="text-sm font-tajawal">{u.email || '—'}</span></div>
          <div className="flex items-center gap-2"><span className="text-xs text-[var(--text-muted)] w-20">{isRTL ? 'الهاتف' : 'Phone'}:</span><span className="text-sm font-tajawal">{u.phone || '—'}</span></div>
          <div className="flex items-center gap-2"><span className="text-xs text-[var(--text-muted)] w-20">{isRTL ? 'التسجيل' : 'Joined'}:</span><span className="text-sm font-tajawal">{u.created_at ? new Date(u.created_at).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US') : '—'}</span></div>
          {(!u.phone || !u.email) && (
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-[10px] text-amber-400 font-tajawal">{isRTL ? 'بيانات ناقصة - يرجى التحديث' : 'Missing data - please update'}</span>
              <button onClick={() => supabase.from('notifications').insert({ user_id: u.id, title: isRTL ? 'استكمال البيانات' : 'Complete your profile', body: isRTL ? 'يرجى استكمال بيانات الهاتف والبريد الإلكتروني' : 'Please complete your phone and email information', type: 'profile' }).then(() => showToast(isRTL ? 'تم إرسال إشعار للمستخدم' : 'Notification sent'))} className="text-[10px] text-brand-blue-light hover:underline font-tajawal">{isRTL ? 'إرسال إشعار' : 'Notify user'}</button>
            </div>
          )}
          <div className="flex items-center gap-2"><span className="text-xs text-[var(--text-muted)] w-20">{isRTL ? 'الحالة' : 'Status'}:</span>
            <div className="flex gap-1.5">
              {u.verified && <span className="text-[10px] px-2 py-0.5 rounded-full bg-status-open/20 text-status-open font-bold">{isRTL ? 'موثّق' : 'Verified'}</span>}
              {u.banned && <span className="text-[10px] px-2 py-0.5 rounded-full bg-status-emergency/20 text-status-emergency font-bold">{isRTL ? 'محظور' : 'Banned'}</span>}
              {u.frozen && <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-blue/20 text-brand-blue-light font-bold">{isRTL ? 'مجمّد' : 'Frozen'}</span>}
              {!u.verified && !u.banned && !u.frozen && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--border-subtle)] text-[var(--text-muted)] font-bold">{isRTL ? 'نشط' : 'Active'}</span>}
            </div>
          </div>
        </div>
        {/* Role history (from audit logs) */}
        {userAuditLogs.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-cairo font-bold mb-2 flex items-center gap-1.5"><History className="w-3.5 h-3.5 text-brand-blue-light" />{isRTL ? 'سجل النشاط' : 'Activity Log'}</h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {userAuditLogs.slice(0, 10).map((l) => (
                <div key={l.id} className="text-[10px] font-tajawal text-[var(--text-muted)] flex items-center gap-1.5">
                  <Activity className="w-2.5 h-2.5 shrink-0" />
                  <span className="font-bold text-[var(--text-soft)]">{l.actor_name}</span>
                  <span>{l.action.replace(/_/g, ' ')}</span>
                  <span className="truncate">{l.entity_id}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Reports filed by user */}
        {reportsByUser.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-cairo font-bold mb-2 flex items-center gap-1.5"><Flag className="w-3.5 h-3.5 text-amber-400" />{isRTL ? `بلاغات قدّمها (${reportsByUser.length})` : `Reports Filed (${reportsByUser.length})`}</h4>
            <div className="space-y-1">
              {reportsByUser.slice(0, 5).map((r) => (
                <div key={r.id} className="text-[10px] font-tajawal text-[var(--text-muted)]">• {r.target_name} ({r.status})</div>
              ))}
            </div>
          </div>
        )}
        {/* Reports against user */}
        {reportsAgainstUser.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-cairo font-bold mb-2 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-status-emergency" />{isRTL ? `بلاغات ضده (${reportsAgainstUser.length})` : `Reports Against (${reportsAgainstUser.length})`}</h4>
            <div className="space-y-1">
              {reportsAgainstUser.slice(0, 5).map((r) => (
                <div key={r.id} className="text-[10px] font-tajawal text-[var(--text-muted)]">• {r.message || r.issue_type} ({r.status})</div>
              ))}
            </div>
          </div>
        )}
        {/* Reviews given */}
        {reviewsByUser.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-cairo font-bold mb-2 flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-amber-400" />{isRTL ? `تقييمات قدّمها (${reviewsByUser.length})` : `Ratings Given (${reviewsByUser.length})`}</h4>
            <div className="space-y-1">
              {reviewsByUser.slice(0, 5).map((r) => (
                <div key={r.id} className="text-[10px] font-tajawal text-[var(--text-muted)] flex items-center gap-1.5">
                  <span className="text-amber-400 font-bold">{r.rating}★</span>
                  <span>{r.target_name}</span>
                  {r.text && <span className="truncate">— {r.text}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ Report Detail Modal ============
function ReportDetailModal({ report, onReview, onResolve, onDismiss, actionLoading, isRTL }: {
  report: DataReport;
  onReview: (id: string) => void; onResolve: (id: string) => void; onDismiss: (id: string) => void;
  actionLoading: string | null; isRTL: boolean;
}) {
  const issueLabels: Record<string, string> = { wrong_status: isRTL ? 'حالة خاطئة' : 'Wrong Status', wrong_availability: isRTL ? 'توفر خاطئ' : 'Wrong Availability', wrong_info: isRTL ? 'معلومات خاطئة' : 'Wrong Info', other: isRTL ? 'أخرى' : 'Other' };
  const statusCls: Record<string, string> = { open: 'bg-amber-500/20 text-amber-400', reviewing: 'bg-brand-blue/20 text-brand-blue-light', resolved: 'bg-status-open/20 text-status-open', dismissed: 'bg-[var(--border-subtle)] text-[var(--text-muted)]' };
  const statusLabel: Record<string, string> = { open: isRTL ? 'مفتوح' : 'Open', reviewing: isRTL ? 'قيد المراجعة' : 'Reviewing', resolved: isRTL ? 'تم الحل' : 'Resolved', dismissed: isRTL ? 'مرفوض' : 'Dismissed' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => {}}>
      <div className="glass-card p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-cairo font-bold text-base flex items-center gap-2"><Flag className="w-5 h-5 text-amber-400" />{isRTL ? 'تفاصيل البلاغ' : 'Report Details'}</h3>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${statusCls[report.status] || statusCls.open}`}>{statusLabel[report.status] || report.status}</span>
        </div>
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2"><span className="text-xs text-[var(--text-muted)] w-24">{isRTL ? 'المرسل' : 'Reporter'}:</span><span className="text-sm font-cairo font-bold">{report.reporter_name || '—'}</span></div>
          <div className="flex items-center gap-2"><span className="text-xs text-[var(--text-muted)] w-24">{isRTL ? 'الهدف' : 'Target'}:</span><span className="text-sm font-cairo font-bold">{report.target_name || report.target_id}</span></div>
          <div className="flex items-center gap-2"><span className="text-xs text-[var(--text-muted)] w-24">{isRTL ? 'النوع' : 'Type'}:</span><span className="text-sm">{report.target_type}</span></div>
          <div className="flex items-center gap-2"><span className="text-xs text-[var(--text-muted)] w-24">{isRTL ? 'المشكلة' : 'Issue'}:</span><span className="text-sm">{issueLabels[report.issue_type] || report.issue_type}</span></div>
          <div className="flex items-center gap-2"><span className="text-xs text-[var(--text-muted)] w-24">{isRTL ? 'التاريخ' : 'Date'}:</span><span className="text-sm font-tajawal">{new Date(report.created_at).toLocaleString(isRTL ? 'ar-EG' : 'en-US')}</span></div>
          {report.message && (
            <div className="pt-2">
              <span className="text-xs text-[var(--text-muted)] block mb-1">{isRTL ? 'الرسالة' : 'Message'}:</span>
              <p className="text-sm font-tajawal text-[var(--text-soft)] glass rounded-xl p-3">{report.message}</p>
            </div>
          )}
        </div>
        {report.status !== 'resolved' && report.status !== 'dismissed' && (
          <div className="flex gap-2 flex-wrap">
            {report.status === 'open' && <button onClick={() => onReview(report.id)} disabled={actionLoading === report.id} className="btn-secondary text-xs flex-1 flex items-center justify-center gap-1.5 disabled:opacity-50"><Eye className="w-3.5 h-3.5" />{isRTL ? 'مراجعة' : 'Review'}</button>}
            <button onClick={() => onResolve(report.id)} disabled={actionLoading === report.id} className="btn-primary text-xs flex-1 flex items-center justify-center gap-1.5 disabled:opacity-50"><CheckCircle className="w-3.5 h-3.5" />{isRTL ? 'حل' : 'Resolve'}</button>
            <button onClick={() => onDismiss(report.id)} disabled={actionLoading === report.id} className="px-3 py-1.5 rounded-lg bg-[var(--border-subtle)] text-[var(--text-soft)] text-xs font-bold disabled:opacity-50">{isRTL ? 'إغلاق' : 'Dismiss'}</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ Review Target Modal ============
function ReviewTargetModal({ target, reviews, onClose, isRTL }: {
  target: { type: 'facility' | 'pharmacy'; id: string; name: string };
  reviews: Review[]; onClose: () => void; isRTL: boolean;
}) {
  const avg = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="glass-card p-5 w-full max-w-md max-h-[70vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-cairo font-bold text-base flex items-center gap-2">
            {target.type === 'facility' ? <Building2 className="w-5 h-5 text-brand-blue-light" /> : <Pill className="w-5 h-5 text-brand-green-light" />}
            {target.name}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg glass"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex items-center gap-2 mb-4">
          <span className="font-inter font-bold text-2xl text-amber-400">{avg.toFixed(1)}</span>
          <div className="flex">{[1, 2, 3, 4, 5].map((n) => (<Star key={n} className={`w-4 h-4 ${n <= Math.round(avg) ? 'text-amber-400 fill-amber-400' : 'text-[var(--border-subtle)]'}`} />))}</div>
          <span className="text-xs text-[var(--text-muted)] font-tajawal">({reviews.length} {isRTL ? 'تقييم' : 'reviews'})</span>
        </div>
        <div className="space-y-2">
          {reviews.length === 0 ? (<p className="text-center text-sm font-tajawal text-[var(--text-muted)] py-4">{isRTL ? 'لا توجد تقييمات' : 'No reviews'}</p>) : (
            reviews.map((r) => (
              <div key={r.id} className="glass rounded-xl p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-cairo font-bold text-sm">{r.anon ? (isRTL ? 'مجهول' : 'Anonymous') : r.user_name}</span>
                  <div className="flex">{[1, 2, 3, 4, 5].map((n) => (<Star key={n} className={`w-3 h-3 ${n <= r.rating ? 'text-amber-400 fill-amber-400' : 'text-[var(--border-subtle)]'}`} />))}</div>
                </div>
                {r.text && <p className="text-xs font-tajawal text-[var(--text-soft)]">{r.text}</p>}
                <p className="text-[10px] text-[var(--text-muted)] mt-1">{new Date(r.ts).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US')}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ============ Bug Reports List ============
function BugReportsList({ reports, onResolve, onDismiss, onDelete, onChat, actionLoading, isRTL }: {
  reports: BugReport[];
  onResolve: (id: string) => void; onDismiss: (id: string) => void; onDelete: (id: string) => void; onChat: (r: BugReport) => void;
  actionLoading: string | null; isRTL: boolean;
}) {
  const categoryLabels: Record<string, string> = { ui: isRTL ? 'واجهة' : 'UI', data: isRTL ? 'بيانات' : 'Data', auth: isRTL ? 'مصادقة' : 'Auth', performance: isRTL ? 'أداء' : 'Performance', other: isRTL ? 'أخرى' : 'Other' };
  const statusCls: Record<string, string> = { open: 'bg-amber-500/20 text-amber-400', reviewing: 'bg-brand-blue/20 text-brand-blue-light', resolved: 'bg-status-open/20 text-status-open', dismissed: 'bg-[var(--border-subtle)] text-[var(--text-muted)]' };
  const statusLabel: Record<string, string> = { open: isRTL ? 'مفتوح' : 'Open', reviewing: isRTL ? 'قيد المراجعة' : 'Reviewing', resolved: isRTL ? 'تم الحل' : 'Resolved', dismissed: isRTL ? 'مرفوض' : 'Dismissed' };
  if (reports.length === 0) return (<div className="text-center py-8"><Bug className="w-10 h-10 mx-auto mb-3 text-[var(--text-muted)]" /><p className="font-tajawal text-[var(--text-muted)]">{isRTL ? 'لا توجد بلاغات تقنية' : 'No bug reports'}</p></div>);
  return (
    <div className="space-y-3">
      <h2 className="font-cairo font-bold text-base flex items-center gap-2"><Bug className="w-5 h-5 text-amber-400" />{isRTL ? 'بلاغات تقنية' : 'Bug Reports'} ({reports.length})</h2>
      <div className="space-y-2 max-h-[50vh] overflow-y-auto">
        {reports.map((r) => (
          <div key={r.id} className="glass-card p-3">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Bug className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <div className="font-cairo font-bold text-sm">{categoryLabels[r.category] || r.category}</div>
                  <div className="text-xs text-[var(--text-muted)] font-tajawal">{isRTL ? 'المرسل' : 'Reporter'}: {r.reporter_name || '—'}</div>
                </div>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${statusCls[r.status] || statusCls.open}`}>{statusLabel[r.status] || r.status}</span>
            </div>
            <p className="text-xs font-tajawal text-[var(--text-soft)] mb-2">{r.description}</p>
            <p className="text-[10px] text-[var(--text-muted)] mb-2">{new Date(r.created_at).toLocaleString(isRTL ? 'ar-EG' : 'en-US')}</p>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => onChat(r)} className="px-3 py-1.5 rounded-lg bg-brand-blue/15 text-brand-blue-light text-xs font-bold flex items-center gap-1.5 hover:bg-brand-blue/25 transition-colors"><MessageCircle className="w-3.5 h-3.5" />{isRTL ? 'محادثة' : 'Chat'}</button>
              {r.status === 'open' && (
                <>
                  <button onClick={() => onResolve(r.id)} disabled={actionLoading === r.id} className="btn-primary text-xs flex-1 flex items-center justify-center gap-1.5 disabled:opacity-50">{actionLoading === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}{isRTL ? 'حل' : 'Resolve'}</button>
                  <button onClick={() => onDismiss(r.id)} disabled={actionLoading === r.id} className="px-3 py-1.5 rounded-lg bg-[var(--border-subtle)] text-[var(--text-soft)] text-xs font-bold disabled:opacity-50">{isRTL ? 'إغلاق' : 'Dismiss'}</button>
                  <button onClick={() => onDelete(r.id)} disabled={actionLoading === r.id} className="p-2 rounded-lg bg-status-emergency/15 text-status-emergency disabled:opacity-50"><Trash2 className="w-3.5 h-3.5" /></button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
function DonationsList({ donations, pharmacies, facilities, onApprove, onReject, onDistribute, actionLoading, isRTL }: {
  donations: MedicineDonation[];
  pharmacies: Pharmacy[];
  facilities: Facility[];
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  onDistribute: (id: string, pharmacyId?: string, facilityId?: string) => void;
  actionLoading: string | null;
  isRTL: boolean;
}) {
  const [rejectModal, setRejectModal] = useState<MedicineDonation | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [distributeModal, setDistributeModal] = useState<MedicineDonation | null>(null);
  const [selectedPharmacy, setSelectedPharmacy] = useState('');
  const [selectedFacility, setSelectedFacility] = useState('');
  const statusColors: Record<string, string> = { pending: 'bg-amber-500/20 text-amber-400', approved: 'bg-status-open/20 text-status-open', rejected: 'bg-status-emergency/20 text-status-emergency', distributed: 'bg-brand-blue/20 text-brand-blue-light' };
  const statusLabels: Record<string, string> = { pending: isRTL ? 'قيد المراجعة' : 'Pending', approved: isRTL ? 'مقبول' : 'Approved', rejected: isRTL ? 'مرفوض' : 'Rejected', distributed: isRTL ? 'تم التوزيع' : 'Distributed' };
  if (donations.length === 0) return (<div className="text-center py-8"><Gift className="w-10 h-10 mx-auto mb-3 text-[var(--text-muted)]" /><p className="font-tajawal text-[var(--text-muted)]">{isRTL ? 'لا توجد طلبات تبرع' : 'No donation requests'}</p></div>);
  return (<div className="space-y-3">
    {donations.map((d) => (
      <div key={d.id} className="glass-card p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-green/20 flex items-center justify-center shrink-0"><Gift className="w-5 h-5 text-brand-green-light" /></div>
            <div>
              <div className="font-cairo font-bold text-sm">{d.medicine_name}</div>
              <div className="text-xs text-[var(--text-muted)] font-tajawal">{d.generic_name} · {isRTL ? 'الكمية' : 'Qty'}: {d.quantity}</div>
              <div className="text-xs text-[var(--text-muted)] font-tajawal mt-0.5">{isRTL ? 'المتبرع' : 'Donor'}: {d.donor_name} · {d.donor_phone || '—'}</div>
              {d.area && <div className="text-xs text-[var(--text-muted)] font-tajawal">{isRTL ? 'المنطقة' : 'Area'}: {d.area}</div>}
              {d.notes && <div className="text-xs text-[var(--text-muted)] font-tajawal mt-0.5">{d.notes}</div>}
              {d.rejection_reason && <div className="text-xs text-status-emergency font-tajawal mt-1">{isRTL ? 'سبب الرفض' : 'Rejection'}: {d.rejection_reason}</div>}
            </div>
          </div>
          <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${statusColors[d.status]}`}>{statusLabels[d.status]}</span>
        </div>
        {d.status === 'pending' && (<div className="flex gap-2">
          <button onClick={() => onApprove(d.id)} disabled={actionLoading === d.id} className="btn-primary flex-1 text-xs py-2 disabled:opacity-50">{isRTL ? 'قبول' : 'Approve'}</button>
          <button onClick={() => { setRejectModal(d); setRejectReason(''); }} disabled={actionLoading === d.id} className="flex-1 text-xs py-2 rounded-xl bg-status-emergency/15 text-status-emergency font-bold hover:bg-status-emergency/25 transition-colors disabled:opacity-50">{isRTL ? 'رفض' : 'Reject'}</button>
        </div>)}
        {d.status === 'approved' && (<button onClick={() => { setDistributeModal(d); setSelectedPharmacy(''); setSelectedFacility(''); }} disabled={actionLoading === d.id} className="btn-secondary w-full text-xs py-2 disabled:opacity-50">{isRTL ? 'تسجيل التوزيع' : 'Record Distribution'}</button>)}
      </div>
    ))}
    {rejectModal && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setRejectModal(null)}><div className="glass-card p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}><h3 className="font-cairo font-bold text-base mb-3">{isRTL ? 'سبب الرفض' : 'Rejection Reason'}</h3><textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} className="w-full glass rounded-xl p-3 text-sm font-tajawal focus:outline-none focus:border-brand-green resize-none" placeholder={isRTL ? 'مثال: معلومات غير صحيحة' : 'e.g. Inaccurate information'} /><div className="flex gap-2 mt-4"><button onClick={() => setRejectModal(null)} className="btn-secondary flex-1 text-sm">{isRTL ? 'إلغاء' : 'Cancel'}</button><button onClick={() => { onReject(rejectModal.id, rejectReason); setRejectModal(null); }} disabled={!rejectReason.trim()} className="btn-primary flex-1 text-sm disabled:opacity-50">{isRTL ? 'تأكيد الرفض' : 'Confirm Reject'}</button></div></div></div>)}
    {distributeModal && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setDistributeModal(null)}><div className="glass-card p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}><h3 className="font-cairo font-bold text-base mb-3">{isRTL ? 'تسجيل التوزيع' : 'Record Distribution'}</h3><p className="text-xs text-[var(--text-muted)] font-tajawal mb-3">{isRTL ? 'اختر الصيدلية أو المرفق الذي تم التوزيع عليه' : 'Select the pharmacy or facility that received the donation'}</p><select value={selectedPharmacy} onChange={(e) => setSelectedPharmacy(e.target.value)} className="w-full glass rounded-xl p-2.5 text-sm font-tajawal mb-2"><option value="">{isRTL ? '— اختر صيدلية —' : '— Select pharmacy —'}</option>{pharmacies.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}</select><select value={selectedFacility} onChange={(e) => setSelectedFacility(e.target.value)} className="w-full glass rounded-xl p-2.5 text-sm font-tajawal mb-4"><option value="">{isRTL ? '— اختر مرفق —' : '— Select facility —'}</option>{facilities.map((f) => (<option key={f.id} value={f.id}>{f.name}</option>))}</select><div className="flex gap-2"><button onClick={() => setDistributeModal(null)} className="btn-secondary flex-1 text-sm">{isRTL ? 'إلغاء' : 'Cancel'}</button><button onClick={() => { onDistribute(distributeModal.id, selectedPharmacy || undefined, selectedFacility || undefined); setDistributeModal(null); }} disabled={!selectedPharmacy && !selectedFacility} className="btn-primary flex-1 text-sm disabled:opacity-50">{isRTL ? 'تأكيد' : 'Confirm'}</button></div></div></div>)}
  </div>);
}

// ============ Pending List ============
function PendingList({ pharmacies, facilities, medicines, departments, onApprove, onReject, actionLoading, isRTL }: {
  pharmacies: Pharmacy[]; facilities: Facility[]; medicines: Medicine[]; departments: Record<string, Department[]>;
  onApprove: (table: string, id: string, name: string) => void;
  onReject: (table: string, id: string, name: string) => void;
  actionLoading: string | null; isRTL: boolean;
}) {
  const [preview, setPreview] = useState<{ type: 'pharmacy' | 'facility'; data: Pharmacy | Facility } | null>(null);
  const pending = [
    ...pharmacies.filter((p) => !p.verified && !p.deleted_at).map((p) => ({ id: p.id, type: 'pharmacy' as const, name: p.name, area: p.area, phone: p.phone })),
    ...facilities.filter((f) => !f.verified && !f.deleted_at).map((f) => ({ id: f.id, type: 'facility' as const, name: f.name, area: f.area, phone: f.phone })),
  ];
  if (pending.length === 0) return (<div className="text-center py-8"><CheckCircle className="w-10 h-10 mx-auto mb-3 text-status-open" /><p className="font-tajawal text-[var(--text-muted)]">{isRTL ? 'لا توجد تسجيلات معلّقة' : 'No pending registrations'}</p></div>);
  return (
    <div className="space-y-3">
      <AnimatePresence>
        {preview && (
          <PendingPreviewModal data={preview.data} type={preview.type} medicines={medicines} departments={departments} onClose={() => setPreview(null)} onApprove={(t, id, name) => { onApprove(t, id, name); setPreview(null); }} onReject={(t, id, name) => { onReject(t, id, name); setPreview(null); }} actionLoading={actionLoading} isRTL={isRTL} />
        )}
      </AnimatePresence>
      {pending.map((item) => (
        <div key={item.id} className="glass-card p-4 flex items-center justify-between gap-3 cursor-pointer hover:border-brand-green/40 transition-colors" onClick={() => setPreview({ type: item.type, data: item.type === 'pharmacy' ? pharmacies.find((p) => p.id === item.id)! : facilities.find((f) => f.id === item.id)! })}>
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.type === 'pharmacy' ? 'bg-brand-green/20' : 'bg-brand-blue/20'}`}>
              {item.type === 'pharmacy' ? <Pill className="w-5 h-5 text-brand-green-light" /> : <Building2 className="w-5 h-5 text-brand-blue-light" />}
            </div>
            <div className="min-w-0">
              <div className="font-cairo font-bold text-sm truncate">{item.name}</div>
              <div className="text-xs text-[var(--text-muted)] font-tajawal">{item.type === 'pharmacy' ? (isRTL ? 'صيدلية' : 'Pharmacy') : (isRTL ? 'مرفق' : 'Facility')} · {item.area} · {item.phone}</div>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => onApprove(item.type === 'pharmacy' ? 'pharmacies' : 'facilities', item.id, item.name)} disabled={actionLoading === item.id} className="px-3 py-2 rounded-xl bg-status-open/15 text-status-open text-xs font-bold flex items-center gap-1 disabled:opacity-50">
              {actionLoading === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}{isRTL ? 'تأكيد' : 'Approve'}
            </button>
            <button onClick={() => onReject(item.type === 'pharmacy' ? 'pharmacies' : 'facilities', item.id, item.name)} disabled={actionLoading === item.id} className="px-3 py-2 rounded-xl bg-status-emergency/15 text-status-emergency text-xs font-bold flex items-center gap-1 disabled:opacity-50">
              <XCircle className="w-3.5 h-3.5" />{isRTL ? 'رفض' : 'Reject'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============ Entity List ============
function EntityList({ title, items, onAdd, onEdit, onDelete, onToggleVerify, onSendAlert, onVersionHistory, actionLoading, isRTL }: {
  title: string; items: { id: string; name: string; sub: string; verified: boolean }[];
  onAdd: () => void; onEdit: (id: string) => void; onDelete: (id: string) => void;
  onToggleVerify?: (id: string) => void; onSendAlert?: (id: string) => void; onVersionHistory?: (id: string) => void;
  actionLoading: string | null; isRTL: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-cairo font-bold text-base">{title} ({items.length})</h2>
        <button onClick={onAdd} className="btn-primary text-xs flex items-center gap-1.5"><Plus className="w-4 h-4" />{isRTL ? 'إضافة' : 'Add'}</button>
      </div>
      {items.length === 0 ? (<p className="text-center text-sm font-tajawal text-[var(--text-muted)] py-6">{isRTL ? 'لا توجد عناصر' : 'No items'}</p>) : (
        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {items.map((item) => (
            <div key={item.id} className="glass-card p-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {onToggleVerify && (<button onClick={() => onToggleVerify(item.id)} title={item.verified ? (isRTL ? 'موثّق' : 'Verified') : (isRTL ? 'غير موثّق' : 'Unverified')}><ShieldCheck className={`w-4 h-4 shrink-0 ${item.verified ? 'text-status-open' : 'text-[var(--text-muted)]'}`} /></button>)}
                <div className="min-w-0">
                  <div className="font-cairo font-bold text-sm truncate">{item.name}</div>
                  <div className="text-xs text-[var(--text-muted)] font-tajawal truncate">{item.sub}</div>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                {onSendAlert && (<button onClick={() => onSendAlert(item.id)} disabled={actionLoading === item.id} title={isRTL ? 'إرسال تنبيه' : 'Send Alert'} className="p-2 rounded-lg glass hover:bg-amber-500/15 transition-colors disabled:opacity-50"><AlertTriangle className="w-3.5 h-3.5 text-amber-400" /></button>)}
                {onVersionHistory && (<button onClick={() => onVersionHistory(item.id)} disabled={actionLoading === item.id} title={isRTL ? 'سجل التغييرات' : 'Version History'} className="p-2 rounded-lg glass hover:bg-brand-blue/15 transition-colors disabled:opacity-50"><History className="w-3.5 h-3.5 text-brand-blue-light" /></button>)}
                <button onClick={() => onEdit(item.id)} disabled={actionLoading === item.id} className="p-2 rounded-lg glass hover:bg-brand-blue/15 transition-colors disabled:opacity-50"><Pencil className="w-3.5 h-3.5 text-brand-blue-light" /></button>
                <button onClick={() => onDelete(item.id)} disabled={actionLoading === item.id} className="p-2 rounded-lg glass hover:bg-status-emergency/15 transition-colors disabled:opacity-50">{actionLoading === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 text-status-emergency" />}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ Medicines List ============
function MedicinesList({ medicines, pharmacies, pharmFilter, setPharmFilter, onAdd, onEdit, onDelete, onToggleRestrict, onVersionHistory, actionLoading, isRTL }: {
  medicines: Medicine[]; pharmacies: Pharmacy[]; pharmFilter: string; setPharmFilter: (v: string) => void;
  onAdd: () => void; onEdit: (id: string) => void; onDelete: (id: string) => void; onToggleRestrict: (id: string) => void; onVersionHistory?: (id: string) => void;
  actionLoading: string | null; isRTL: boolean;
}) {
  const filtered = medicines.filter((m) => !m.deleted_at && (pharmFilter === 'all' || m.pharmacy_id === pharmFilter));
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-cairo font-bold text-base">{isRTL ? 'الأدوية' : 'Medicines'} ({filtered.length})</h2>
        <div className="flex gap-2">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <select value={pharmFilter} onChange={(e) => setPharmFilter(e.target.value)} className="text-xs glass-card px-2 py-1.5 rounded-lg font-tajawal">
              <option value="all">{isRTL ? 'كل الصيدليات' : 'All pharmacies'}</option>
              {pharmacies.filter((p) => !p.deleted_at).map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
            </select>
          </div>
          <button onClick={onAdd} className="btn-primary text-xs flex items-center gap-1.5"><Plus className="w-4 h-4" />{isRTL ? 'إضافة' : 'Add'}</button>
        </div>
      </div>
      {filtered.length === 0 ? (<p className="text-center text-sm font-tajawal text-[var(--text-muted)] py-6">{isRTL ? 'لا توجد أدوية' : 'No medicines'}</p>) : (
        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {filtered.map((m) => (
            <div key={m.id} className="glass-card p-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {m.is_restricted && <Ban className="w-4 h-4 shrink-0 text-status-emergency" />}
                <div className="min-w-0">
                  <div className="font-cairo font-bold text-sm truncate">{m.medicine_name}</div>
                  <div className="text-xs text-[var(--text-muted)] font-tajawal truncate">{m.generic_name} · {m.price}₪ · {isRTL ? 'كمية' : 'qty'}: {m.quantity}{m.is_restricted ? ` · ${isRTL ? 'مقيّد' : 'restricted'}` : ''}</div>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => onToggleRestrict(m.id)} disabled={actionLoading === m.id} title={m.is_restricted ? (isRTL ? 'إلغاء تقييد' : 'Unrestrict') : (isRTL ? 'تقييد' : 'Restrict')} className="p-2 rounded-lg glass hover:bg-status-emergency/15 transition-colors disabled:opacity-50">
                  {actionLoading === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className={`w-3.5 h-3.5 ${m.is_restricted ? 'text-status-emergency' : 'text-[var(--text-muted)]'}`} />}
                </button>
                <button onClick={() => onEdit(m.id)} disabled={actionLoading === m.id} className="p-2 rounded-lg glass hover:bg-brand-blue/15 transition-colors disabled:opacity-50"><Pencil className="w-3.5 h-3.5 text-brand-blue-light" /></button>
                <button onClick={() => onDelete(m.id)} disabled={actionLoading === m.id} className="p-2 rounded-lg glass hover:bg-status-emergency/15 transition-colors disabled:opacity-50"><Trash2 className="w-3.5 h-3.5 text-status-emergency" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ Reviews List (Enhanced) ============
function ReviewsList({ reviews, pharmacies, facilities, users, auditLogs, dataReports, onDelete, onTargetClick, onUserClick, actionLoading, isRTL }: { reviews: Review[]; pharmacies: Pharmacy[]; facilities: Facility[]; users: Profile[]; auditLogs: AuditLog[]; dataReports: DataReport[]; onDelete: (id: string) => void; onTargetClick: (type: 'facility' | 'pharmacy', id: string, name: string) => void; onUserClick: (u: Profile) => void; actionLoading: string | null; isRTL: boolean; }) {
  const [typeFilter, setTypeFilter] = useState<'all' | 'pharmacy' | 'facility'>('all');
  const [starFilter, setStarFilter] = useState<number>(0);
  const filtered = reviews.filter((r) => (typeFilter === 'all' || r.target_type === typeFilter) && (starFilter === 0 || r.rating === starFilter));
  // Group reviews by target for detailed view
  const targetGroups = new Map<string, { type: 'facility' | 'pharmacy'; id: string; name: string; reviews: Review[]; avg: number }>();
  for (const r of filtered) {
    const key = `${r.target_type}_${r.target_id}`;
    if (!targetGroups.has(key)) targetGroups.set(key, { type: r.target_type, id: r.target_id, name: r.target_name, reviews: [], avg: 0 });
    targetGroups.get(key)!.reviews.push(r);
  }
  for (const g of targetGroups.values()) g.avg = g.reviews.reduce((s, r) => s + r.rating, 0) / g.reviews.length;
  const sortedGroups = Array.from(targetGroups.values()).sort((a, b) => b.avg - a.avg);
  return (
    <div className="space-y-4">
      <h2 className="font-cairo font-bold text-base">{isRTL ? 'التقييمات' : 'Reviews'} ({filtered.length})</h2>
      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        {([{ k: 'all', l: isRTL ? 'الكل' : 'All' }, { k: 'pharmacy', l: isRTL ? 'صيدليات' : 'Pharmacies' }, { k: 'facility', l: isRTL ? 'مرافق' : 'Facilities' }] as const).map((f) => (
          <button key={f.k} onClick={() => setTypeFilter(f.k)} className={`px-3 py-1.5 rounded-full text-xs font-tajawal font-bold transition-colors ${typeFilter === f.k ? 'bg-brand-green text-white' : 'glass text-[var(--text-soft)]'}`}>{f.l}</button>
        ))}
        <span className="text-xs text-[var(--text-muted)] mx-1">·</span>
        {[0, 1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => setStarFilter(n)} className={`px-2.5 py-1.5 rounded-full text-xs font-bold transition-colors ${starFilter === n ? 'bg-amber-500 text-white' : 'glass text-[var(--text-soft)]'}`}>{n === 0 ? (isRTL ? 'الكل' : 'All') : `${n}★`}</button>
        ))}
      </div>
      {/* Grouped by target with clickable names */}
      {sortedGroups.length === 0 ? (<p className="text-center text-sm font-tajawal text-[var(--text-muted)] py-6">{isRTL ? 'لا توجد تقييمات' : 'No reviews'}</p>) : (
        <div className="space-y-3 max-h-[50vh] overflow-y-auto">
          {sortedGroups.map((g) => (
            <div key={`${g.type}_${g.id}`} className="glass-card p-3">
              <div className="flex items-center justify-between mb-2 cursor-pointer hover:text-brand-blue-light transition-colors" onClick={() => onTargetClick(g.type, g.id, g.name)}>
                <div className="flex items-center gap-2">
                  {g.type === 'facility' ? <Building2 className="w-4 h-4 text-brand-blue-light" /> : <Pill className="w-4 h-4 text-brand-green-light" />}
                  <span className="font-cairo font-bold text-sm">{g.name}</span>
                </div>
                <span className="font-inter font-bold text-sm text-amber-400">{g.avg.toFixed(1)}★ ({g.reviews.length})</span>
              </div>
              <div className="space-y-1.5">
                {g.reviews.map((r) => (
                  <div key={r.id} className="flex items-start justify-between gap-2 ps-6">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        {r.anon ? (
                        <span className="text-xs font-cairo font-bold">{isRTL ? 'مجهول' : 'Anonymous'}</span>
                      ) : (
                        <button
                          onClick={() => {
                            const u = users.find((x) => x.id === r.user_id || x.display_name === r.user_name);
                            if (u) onUserClick(u);
                          }}
                          className="text-xs font-cairo font-bold hover:text-brand-blue-light transition-colors cursor-pointer"
                        >
                          {r.user_name}
                        </button>
                      )}
                        <div className="flex">{[1, 2, 3, 4, 5].map((n) => (<Star key={n} className={`w-2.5 h-2.5 ${n <= r.rating ? 'text-amber-400 fill-amber-400' : 'text-[var(--border-subtle)]'}`} />))}</div>
                      </div>
                      {r.text && <p className="text-[10px] font-tajawal text-[var(--text-soft)] truncate">{r.text}</p>}
                      {(() => {
                        const u = users.find((x) => x.id === r.user_id || x.display_name === r.user_name);
                        if (!u || r.anon) return null;
                        const userReviews = reviews.filter((rv) => (rv.user_id === u.id || rv.user_name === u.display_name) && !rv.anon);
                        const userReports = dataReports.filter((dr) => dr.reporter_id === u.id);
                        return (
                          <div className="text-[9px] text-[var(--text-muted)] font-tajawal mt-0.5">
                            {u.email && <span>{u.email}</span>}
                            {u.phone && <span> · {u.phone}</span>}
                            <span> · {isRTL ? 'تقييمات' : 'Reviews'}: {userReviews.length}</span>
                            <span> · {isRTL ? 'بلاغات' : 'Reports'}: {userReports.length}</span>
                          </div>
                        );
                      })()}
                    </div>
                    <button onClick={() => onDelete(r.id)} disabled={actionLoading === r.id} className="p-1 rounded-lg glass hover:bg-status-emergency/15 transition-colors disabled:opacity-50 shrink-0">{actionLoading === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3 text-status-emergency" />}</button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ Users List ============
function UsersList({ users, roleFilter, setRoleFilter, onToggleVerify, onToggleBan, onToggleFreeze, onRoleChange, onSoftDelete, onUserClick, actionLoading, isRTL }: {
  users: Profile[]; roleFilter: string; setRoleFilter: (v: string) => void;
  onToggleVerify: (id: string, current: boolean, name: string) => void;
  onToggleBan: (id: string, current: boolean, name: string) => void;
  onToggleFreeze: (id: string, current: boolean, name: string) => void;
  onRoleChange: (id: string, role: string, name: string) => void;
  onSoftDelete: (id: string, name: string) => void;
  onUserClick: (u: Profile) => void;
  actionLoading: string | null; isRTL: boolean;
}) {
  const [search, setSearch] = useState('');
  const roleLabels: Record<string, string> = { all: isRTL ? 'الكل' : 'All', citizen: isRTL ? 'مواطن' : 'Citizen', pharmacist: isRTL ? 'صيدلي' : 'Pharmacist', facility_owner: isRTL ? 'صاحب مرفق' : 'Facility Owner', admin: isRTL ? 'أدمن' : 'Admin' };
  const q = search.trim().toLowerCase();
  const filtered = users.filter((u) => {
    if (u.deleted_at) return false;
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (!q) return true;
    return (
      (u.display_name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.unique_id || '').toLowerCase().includes(q) ||
      (u.phone || '').toLowerCase().includes(q)
    );
  });
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-cairo font-bold text-base">{isRTL ? 'المستخدمون' : 'Users'} ({filtered.length})</h2>
        <div className="flex gap-1.5 flex-wrap">
          {Object.entries(roleLabels).map(([key, label]) => (
            <button key={key} onClick={() => setRoleFilter(key)} className={`px-2.5 py-1 rounded-lg text-xs font-tajawal font-bold transition-colors ${roleFilter === key ? 'bg-brand-green text-white' : 'glass text-[var(--text-soft)]'}`}>{label}</button>
          ))}
        </div>
      </div>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={isRTL ? 'بحث بالاسم أو البريد أو الـ ID أو الهاتف...' : 'Search by name, email, ID, or phone...'}
        className="w-full glass rounded-xl px-4 py-2.5 text-sm font-tajawal focus:outline-none focus:border-brand-green transition-colors"
      />
      {filtered.length === 0 ? (<p className="text-center text-sm font-tajawal text-[var(--text-muted)] py-6">{isRTL ? 'لا يوجد مستخدمون' : 'No users'}</p>) : (
        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {filtered.map((u) => (
            <div key={u.id} className="glass-card p-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 cursor-pointer" onClick={() => onUserClick(u)}>
                <ShieldCheck className={`w-4 h-4 shrink-0 ${u.verified ? 'text-status-open' : 'text-[var(--text-muted)]'}`} />
                {u.banned && <Ban className="w-4 h-4 shrink-0 text-status-emergency" />}
                {u.frozen && <Snowflake className="w-4 h-4 shrink-0 text-brand-blue-light" />}
                <div className="min-w-0">
                  <div className="font-cairo font-bold text-sm truncate hover:text-brand-blue-light transition-colors">
                    {u.display_name}
                    {u.unique_id && <span className="text-[10px] text-brand-blue-light font-mono mr-1.5 px-1.5 py-0.5 rounded bg-brand-blue/10">{u.unique_id}</span>}
                  </div>
                  <div className="text-xs text-[var(--text-muted)] font-tajawal truncate">
                    {u.email && <span>{u.email}</span>}
                    {u.phone && <span> · {u.phone}</span>}
                    <span> · {u.role}</span>
                    {u.banned && <span> · {isRTL ? 'محظور' : 'banned'}</span>}
                    {u.frozen && <span> · {isRTL ? 'مجمّد' : 'frozen'}</span>}
                  </div>
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button onClick={() => onUserClick(u)} disabled={actionLoading === u.id} title={isRTL ? 'تفاصيل' : 'Details'} className="p-2 rounded-lg glass hover:bg-brand-blue/15 transition-colors disabled:opacity-50"><Eye className="w-3.5 h-3.5 text-brand-blue-light" /></button>
                <select value={u.role} onChange={(e) => onRoleChange(u.id, e.target.value, u.display_name)} disabled={actionLoading === u.id} className="text-xs glass-card px-2 py-1 rounded-lg font-tajawal">
                  <option value="citizen">{isRTL ? 'مواطن' : 'Citizen'}</option>
                  <option value="pharmacist">{isRTL ? 'صيدلي' : 'Pharmacist'}</option>
                  <option value="facility_owner">{isRTL ? 'صاحب مرفق' : 'Facility Owner'}</option>
                  <option value="admin">{isRTL ? 'أدمن' : 'Admin'}</option>
                </select>
                <button onClick={() => onToggleBan(u.id, u.banned, u.display_name)} disabled={actionLoading === u.id} title={u.banned ? (isRTL ? 'إلغاء الحظر' : 'Unban') : (isRTL ? 'حظر' : 'Ban')} className="p-2 rounded-lg glass hover:bg-status-emergency/15 transition-colors disabled:opacity-50"><Ban className={`w-3.5 h-3.5 ${u.banned ? 'text-status-emergency' : 'text-[var(--text-muted)]'}`} /></button>
                <button onClick={() => onToggleFreeze(u.id, u.frozen || false, u.display_name)} disabled={actionLoading === u.id} title={u.frozen ? (isRTL ? 'إلغاء التجميد' : 'Unfreeze') : (isRTL ? 'تجميد الحساب' : 'Freeze Account')} className="p-2 rounded-lg glass hover:bg-brand-blue/15 transition-colors disabled:opacity-50"><Snowflake className={`w-3.5 h-3.5 ${u.frozen ? 'text-brand-blue-light' : 'text-[var(--text-muted)]'}`} /></button>
                <button onClick={() => onToggleVerify(u.id, u.verified, u.display_name)} disabled={actionLoading === u.id} className="p-2 rounded-lg glass hover:bg-status-open/15 transition-colors disabled:opacity-50">{actionLoading === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5 text-status-open" />}</button>
                <button onClick={() => onSoftDelete(u.id, u.display_name)} disabled={actionLoading === u.id} className="p-2 rounded-lg glass hover:bg-status-emergency/15 transition-colors disabled:opacity-50"><Trash2 className="w-3.5 h-3.5 text-status-emergency" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ Trash List ============
function TrashList({ pharmacies, facilities, medicines, onRestore, onPermanentDelete, actionLoading, isRTL }: {
  pharmacies: Pharmacy[]; facilities: Facility[]; medicines: Medicine[];
  onRestore: (table: string, id: string, name: string) => void;
  onPermanentDelete: (table: string, id: string, name: string) => void;
  actionLoading: string | null; isRTL: boolean;
}) {
  const items = [
    ...pharmacies.filter((p) => p.deleted_at).map((p) => ({ id: p.id, table: 'pharmacies', name: p.name, sub: `${isRTL ? 'صيدلية' : 'Pharmacy'} · ${p.area}`, deletedAt: p.deleted_at! })),
    ...facilities.filter((f) => f.deleted_at).map((f) => ({ id: f.id, table: 'facilities', name: f.name, sub: `${isRTL ? 'مرفق' : 'Facility'} · ${f.area}`, deletedAt: f.deleted_at! })),
    ...medicines.filter((m) => m.deleted_at).map((m) => ({ id: m.id, table: 'medicines', name: m.medicine_name, sub: `${isRTL ? 'دواء' : 'Medicine'} · ${m.generic_name}`, deletedAt: m.deleted_at! })),
  ];
  if (items.length === 0) return (<div className="text-center py-8"><Trash2 className="w-10 h-10 mx-auto mb-3 text-[var(--text-muted)]" /><p className="font-tajawal text-[var(--text-muted)]">{isRTL ? 'سلة المهملات فارغة' : 'Trash bin is empty'}</p></div>);
  return (
    <div className="space-y-3">
      <h2 className="font-cairo font-bold text-base">{isRTL ? 'سلة المهملات' : 'Trash Bin'} ({items.length})</h2>
      <div className="space-y-2 max-h-[50vh] overflow-y-auto">
        {items.map((item) => (
          <div key={item.id} className="glass-card p-3 flex items-center justify-between gap-2 opacity-70">
            <div className="flex items-center gap-2 min-w-0">
              <Trash2 className="w-4 h-4 shrink-0 text-[var(--text-muted)]" />
              <div className="min-w-0">
                <div className="font-cairo font-bold text-sm truncate">{item.name}</div>
                <div className="text-xs text-[var(--text-muted)] font-tajawal truncate">{item.sub} · {new Date(item.deletedAt).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US')}</div>
              </div>
            </div>
            <div className="flex gap-1 shrink-0">
              <button onClick={() => onRestore(item.table, item.id, item.name)} disabled={actionLoading === item.id} className="p-2 rounded-lg glass hover:bg-status-open/15 transition-colors disabled:opacity-50" title={isRTL ? 'استعادة' : 'Restore'}>{actionLoading === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5 text-status-open" />}</button>
              <button onClick={() => onPermanentDelete(item.table, item.id, item.name)} disabled={actionLoading === item.id} className="p-2 rounded-lg glass hover:bg-status-emergency/15 transition-colors disabled:opacity-50" title={isRTL ? 'حذف نهائي' : 'Permanent Delete'}><XCircle className="w-3.5 h-3.5 text-status-emergency" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ Alerts List ============
function AlertsList({ alerts, onNew, onDelete, actionLoading, isRTL }: {
  alerts: AdminAlert[]; onNew: () => void; onDelete: (id: string) => void; actionLoading: string | null; isRTL: boolean;
}) {
  const severityColor: Record<string, string> = { info: 'text-brand-blue-light', warning: 'text-amber-400', emergency: 'text-status-emergency' };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-cairo font-bold text-base">{isRTL ? 'التنبيهات' : 'Alerts'} ({alerts.length})</h2>
        <button onClick={onNew} className="btn-primary text-xs flex items-center gap-1.5"><Radio className="w-4 h-4" />{isRTL ? 'تنبيه جديد' : 'New Alert'}</button>
      </div>
      {alerts.length === 0 ? (<p className="text-center text-sm font-tajawal text-[var(--text-muted)] py-6">{isRTL ? 'لا توجد تنبيهات' : 'No alerts'}</p>) : (
        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {alerts.map((a) => (
            <div key={a.id} className="glass-card p-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <AlertTriangle className={`w-4 h-4 shrink-0 ${severityColor[a.severity] || 'text-[var(--text-muted)]'}`} />
                <div className="min-w-0">
                  <div className="font-cairo font-bold text-sm truncate">{a.message}</div>
                  <div className="text-xs text-[var(--text-muted)] font-tajawal">{a.target_type === 'broadcast' ? (isRTL ? 'إذاعة عامة' : 'Broadcast') : a.target_type} {a.area ? `· ${a.area}` : ''} · {a.severity}</div>
                </div>
              </div>
              <button onClick={() => onDelete(a.id)} disabled={actionLoading === a.id} className="p-2 rounded-lg glass hover:bg-status-emergency/15 transition-colors disabled:opacity-50">{actionLoading === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 text-status-emergency" />}</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ Edit Form Modal ============
function EditForm({ editing, pharmacies, onClose, onSave, actionLoading, isRTL }: {
  editing: { type: string; data: Record<string, unknown> }; pharmacies: Pharmacy[];
  onClose: () => void; onSave: (data: Record<string, unknown>, id?: string) => void; actionLoading: boolean; isRTL: boolean;
}) {
  const isEdit = Boolean(editing.data.id);
  const [form, setForm] = useState<Record<string, unknown>>(editing.data);
  const set = (k: string, v: unknown) => setForm((p) => ({ ...p, [k]: v }));
  const fields: { key: string; label: string; type: 'text' | 'number' | 'select' | 'boolean'; options?: string[] }[] = [];
  if (editing.type === 'pharmacy') {
    fields.push(
      { key: 'name', label: isRTL ? 'الاسم' : 'Name', type: 'text' },
      { key: 'area', label: isRTL ? 'المنطقة' : 'Area', type: 'text' },
      { key: 'address', label: isRTL ? 'العنوان' : 'Address', type: 'text' },
      { key: 'phone', label: isRTL ? 'الهاتف' : 'Phone', type: 'text' },
      { key: 'open_hours', label: isRTL ? 'ساعات العمل' : 'Open Hours', type: 'text' },
      { key: 'lat', label: 'Lat', type: 'number' }, { key: 'lng', label: 'Lng', type: 'number' },
      { key: 'rating', label: isRTL ? 'التقييم' : 'Rating', type: 'number' },
      { key: 'status', label: isRTL ? 'الحالة' : 'Status', type: 'select', options: ['open', 'busy', 'emergency', 'closed'] },
      { key: 'power_status', label: isRTL ? 'الكهرباء' : 'Power', type: 'select', options: ['grid', 'generator', 'no_power', 'unknown'] },
      { key: 'is_open', label: isRTL ? 'مفتوح' : 'Is Open', type: 'boolean' },
      { key: 'verified', label: isRTL ? 'موثّق' : 'Verified', type: 'boolean' },
    );
  } else if (editing.type === 'facility') {
    fields.push(
      { key: 'name', label: isRTL ? 'الاسم' : 'Name', type: 'text' },
      { key: 'type', label: isRTL ? 'النوع' : 'Type', type: 'select', options: ['hospital', 'clinic', 'medical_point'] },
      { key: 'area', label: isRTL ? 'المنطقة' : 'Area', type: 'text' },
      { key: 'address', label: isRTL ? 'العنوان' : 'Address', type: 'text' },
      { key: 'phone', label: isRTL ? 'الهاتف' : 'Phone', type: 'text' },
      { key: 'lat', label: 'Lat', type: 'number' }, { key: 'lng', label: 'Lng', type: 'number' },
      { key: 'occupancy_rate', label: isRTL ? 'نسبة الإشغال' : 'Occupancy %', type: 'number' },
      { key: 'overall_status', label: isRTL ? 'الحالة' : 'Status', type: 'select', options: ['open', 'busy', 'emergency', 'closed'] },
      { key: 'power_status', label: isRTL ? 'الكهرباء' : 'Power', type: 'select', options: ['grid', 'generator', 'no_power', 'unknown'] },
      { key: 'is_free', label: isRTL ? 'مجاني' : 'Is Free', type: 'boolean' },
      { key: 'verified', label: isRTL ? 'موثّق' : 'Verified', type: 'boolean' },
    );
  } else if (editing.type === 'medicine') {
    fields.push(
      { key: 'medicine_name', label: isRTL ? 'اسم الدواء' : 'Medicine Name', type: 'text' },
      { key: 'generic_name', label: isRTL ? 'المادة الفعالة' : 'Generic Name', type: 'text' },
      { key: 'pharmacy_id', label: isRTL ? 'الصيدلية' : 'Pharmacy', type: 'select', options: pharmacies.filter((p) => !p.deleted_at).map((p) => p.id) },
      { key: 'price', label: isRTL ? 'السعر (₪)' : 'Price (₪)', type: 'number' },
      { key: 'price_usd', label: isRTL ? 'السعر ($)' : 'Price ($)', type: 'number' },
      { key: 'quantity', label: isRTL ? 'الكمية' : 'Quantity', type: 'number' },
      { key: 'category', label: isRTL ? 'الفئة' : 'Category', type: 'text' },
      { key: 'is_available', label: isRTL ? 'متوفر' : 'Available', type: 'boolean' },
      { key: 'is_restricted', label: isRTL ? 'مقيّد' : 'Restricted', type: 'boolean' },
      { key: 'restriction_note', label: isRTL ? 'ملاحظة التقييد' : 'Restriction Note', type: 'text' },
    );
  }
  function getSelectLabel(key: string, val: string): string {
    if (key === 'pharmacy_id') { const p = pharmacies.find((x) => x.id === val); return p ? p.name : val; }
    return val;
  }
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-card p-5 w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-cairo font-bold text-base">{isEdit ? (isRTL ? 'تعديل' : 'Edit') : (isRTL ? 'إضافة' : 'Add')} {editing.type === 'pharmacy' ? (isRTL ? 'صيدلية' : 'Pharmacy') : editing.type === 'facility' ? (isRTL ? 'مرفق' : 'Facility') : (isRTL ? 'دواء' : 'Medicine')}</h3>
          <button onClick={onClose} className="text-[var(--text-muted)]"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="text-xs font-tajawal font-bold text-[var(--text-muted)] block mb-1">{f.label}</label>
              {f.type === 'boolean' ? (
                <button type="button" onClick={() => set(f.key, !form[f.key])} className={`px-4 py-2 rounded-xl text-sm font-bold w-full transition-colors ${form[f.key] ? 'bg-status-open/20 text-status-open' : 'glass text-[var(--text-muted)]'}`}>{form[f.key] ? (isRTL ? 'نعم' : 'Yes') : (isRTL ? 'لا' : 'No')}</button>
              ) : f.type === 'select' ? (
                <select value={String(form[f.key] ?? '')} onChange={(e) => set(f.key, e.target.value)} className="w-full glass-card p-2.5 text-sm font-tajawal rounded-xl">
                  {!isEdit && <option value="">—</option>}
                  {f.options?.map((opt) => (<option key={opt} value={opt}>{f.key === 'pharmacy_id' ? getSelectLabel(f.key, opt) : opt}</option>))}
                </select>
              ) : (
                <input type={f.type === 'number' ? 'number' : 'text'} value={String(form[f.key] ?? '')} onChange={(e) => set(f.key, f.type === 'number' ? Number(e.target.value) : e.target.value)} className="w-full glass-card p-2.5 text-sm font-tajawal rounded-xl focus:outline-none focus:border-brand-green" />
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={() => onSave(form, isEdit ? String(form.id) : undefined)} disabled={actionLoading} className="btn-primary flex-1 text-sm flex items-center justify-center gap-1.5 disabled:opacity-50">{actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}{isRTL ? 'حفظ' : 'Save'}</button>
          <button onClick={onClose} className="btn-secondary text-sm px-4">{isRTL ? 'إلغاء' : 'Cancel'}</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============ Alert Form Modal ============
function AlertForm({ editing, facilities, pharmacies, onClose, onSend, actionLoading, isRTL }: {
  editing: { type: string; data: Record<string, unknown> }; facilities: Facility[]; pharmacies: Pharmacy[];
  onClose: () => void; onSend: (data: { target_type: string; target_id: string; area: string; message: string; severity: string; expires_at: string | null; max_views_per_user: number | null }) => void; actionLoading: boolean; isRTL: boolean;
}) {
  const isTargeted = Boolean(editing.data.target_id);
  const [targetType, setTargetType] = useState<string>(String(editing.data.target_type || 'broadcast'));
  const [targetId, setTargetId] = useState<string>(String(editing.data.target_id || 'all'));
  const [area, setArea] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [severity, setSeverity] = useState<string>('info');
  const [expiryDuration, setExpiryDuration] = useState<string>('12h');
  const [maxViews, setMaxViews] = useState<string>('unlimited');

  const areas = Array.from(new Set([...facilities.map((f) => f.area), ...pharmacies.map((p) => p.area)])).filter(Boolean);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-card p-5 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-cairo font-bold text-base">{isRTL ? 'إرسال تنبيه' : 'Send Alert'}</h3>
          <button onClick={onClose} className="text-[var(--text-muted)]"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-tajawal font-bold text-[var(--text-muted)] block mb-1">{isRTL ? 'النوع' : 'Type'}</label>
            <select value={targetType} onChange={(e) => { setTargetType(e.target.value); if (e.target.value === 'broadcast') setTargetId('all'); }} disabled={isTargeted} className="w-full glass-card p-2.5 text-sm font-tajawal rounded-xl">
              <option value="broadcast">{isRTL ? 'إذاعة عامة (للجميع)' : 'Broadcast (All)'}</option>
              <option value="facility">{isRTL ? 'لمرفق محدد' : 'Specific Facility'}</option>
              <option value="pharmacy">{isRTL ? 'لصيدلية محددة' : 'Specific Pharmacy'}</option>
            </select>
          </div>
          {targetType === 'broadcast' && (
            <div>
              <label className="text-xs font-tajawal font-bold text-[var(--text-muted)] block mb-1">{isRTL ? 'المنطقة (اختياري)' : 'Area (optional)'}</label>
              <select value={area} onChange={(e) => setArea(e.target.value)} className="w-full glass-card p-2.5 text-sm font-tajawal rounded-xl">
                <option value="">{isRTL ? 'كل المناطق' : 'All areas'}</option>
                {areas.map((a) => (<option key={a} value={a}>{a}</option>))}
              </select>
            </div>
          )}
          <div>
            <label className="text-xs font-tajawal font-bold text-[var(--text-muted)] block mb-1">{isRTL ? 'مستوى الخطورة' : 'Severity'}</label>
            <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="w-full glass-card p-2.5 text-sm font-tajawal rounded-xl">
              <option value="info">{isRTL ? 'معلومة' : 'Info'}</option>
              <option value="warning">{isRTL ? 'تحذير' : 'Warning'}</option>
              <option value="emergency">{isRTL ? 'طوارئ' : 'Emergency'}</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-tajawal font-bold text-[var(--text-muted)] block mb-1">{isRTL ? 'الرسالة' : 'Message'}</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} className="w-full glass-card p-2.5 text-sm font-tajawal rounded-xl focus:outline-none focus:border-brand-green resize-none" placeholder={isRTL ? 'اكتب رسالة التنبيه...' : 'Write alert message...'} />
          </div>
          <div>
            <label className="text-xs font-tajawal font-bold text-[var(--text-muted)] block mb-1">{isRTL ? 'مدة الصلاحية' : 'Expiry Duration'}</label>
            <select value={expiryDuration} onChange={(e) => setExpiryDuration(e.target.value)} className="w-full glass-card p-2.5 text-sm font-tajawal rounded-xl">
              <option value="1h">{isRTL ? 'ساعة واحدة' : '1 hour'}</option>
              <option value="12h">{isRTL ? '12 ساعة' : '12 hours'}</option>
              <option value="24h">{isRTL ? '24 ساعة' : '24 hours'}</option>
              <option value="48h">{isRTL ? 'يومين' : '2 days'}</option>
              <option value="none">{isRTL ? 'بدون تاريخ انتهاء' : 'No expiry'}</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-tajawal font-bold text-[var(--text-muted)] block mb-1">{isRTL ? 'حد الظهور للمستخدم' : 'Max Views Per User'}</label>
            <select value={maxViews} onChange={(e) => setMaxViews(e.target.value)} className="w-full glass-card p-2.5 text-sm font-tajawal rounded-xl">
              <option value="1">{isRTL ? 'مرة واحدة' : 'Once'}</option>
              <option value="3">{isRTL ? '3 مرات' : '3 times'}</option>
              <option value="unlimited">{isRTL ? 'غير محدود' : 'Unlimited'}</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={() => {
            let expiresAt: string | null = null;
            if (expiryDuration !== 'none') {
              const hours = parseInt(expiryDuration);
              expiresAt = new Date(Date.now() + hours * 3600000).toISOString();
            }
            const maxViewsPerUser = maxViews === 'unlimited' ? null : parseInt(maxViews);
            onSend({ target_type: targetType, target_id: isTargeted ? targetId : 'all', area, message, severity, expires_at: expiresAt, max_views_per_user: maxViewsPerUser });
          }} disabled={actionLoading || !message.trim()} className="btn-primary flex-1 text-sm flex items-center justify-center gap-1.5 disabled:opacity-50">{actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4" />}{isRTL ? 'إرسال' : 'Send'}</button>
          <button onClick={onClose} className="btn-secondary text-sm px-4">{isRTL ? 'إلغاء' : 'Cancel'}</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============ Version History Modal ============
function VersionHistory({ entityId, versions, onRestore, onClose, actionLoading, isRTL }: {
  entityId: string; versions: EntityVersion[]; onRestore: (versionId: string, entityTable: string, entityId: string, name: string) => void; onClose: () => void; actionLoading: string | null; isRTL: boolean;
}) {
  const entityVersions = versions.filter((v) => v.entity_id === entityId);
  const tableMap: Record<string, string> = { facility: 'facilities', medicine: 'medicines', pharmacy: 'pharmacies' };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-card p-5 w-full max-w-lg max-h-[70vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-cairo font-bold text-base flex items-center gap-2"><History className="w-5 h-5 text-brand-blue-light" />{isRTL ? 'سجل التغييرات' : 'Version History'}</h3>
          <button onClick={onClose} className="text-[var(--text-muted)]"><X className="w-5 h-5" /></button>
        </div>
        {entityVersions.length === 0 ? (<p className="text-center text-sm font-tajawal text-[var(--text-muted)] py-6">{isRTL ? 'لا توجد نسخ سابقة' : 'No previous versions'}</p>) : (
          <div className="space-y-2">
            {entityVersions.map((v, i) => {
              const snap = v.snapshot as Record<string, unknown>;
              const name = String(snap.name || snap.medicine_name || `v${i + 1}`);
              return (
                <div key={v.id} className="glass-card p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-cairo font-bold text-sm truncate">{name}</div>
                    <div className="text-xs text-[var(--text-muted)] font-tajawal">{new Date(v.created_at).toLocaleString(isRTL ? 'ar-EG' : 'en-US')}</div>
                  </div>
                  <button onClick={() => onRestore(v.id, tableMap[v.entity_type] || v.entity_type, entityId, name)} disabled={actionLoading === v.id} className="p-2 rounded-lg glass hover:bg-status-open/15 transition-colors disabled:opacity-50" title={isRTL ? 'استرجاع هذه النسخة' : 'Restore this version'}>
                    {actionLoading === v.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5 text-status-open" />}
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <p className="text-[10px] text-[var(--text-muted)] font-tajawal mt-3 text-center">{isRTL ? 'يتم الاحتفاظ بآخر 3 نسخ فقط' : 'Only the last 3 versions are kept'}</p>
      </motion.div>
    </motion.div>
  );
}

// ============ Exchange List (Med-Exchange Moderation) ============
function ExchangeList({ requests, pharmacies, onApprove, onReject, actionLoading, isRTL }: {
  requests: MedExchangeRequest[]; pharmacies: Pharmacy[];
  onApprove: (id: string) => void; onReject: (id: string, notes: string) => void;
  actionLoading: string | null; isRTL: boolean;
}) {
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  if (requests.length === 0) return (<div className="text-center py-8"><Package className="w-10 h-10 mx-auto mb-3 text-[var(--text-muted)]" /><p className="font-tajawal text-[var(--text-muted)]">{isRTL ? 'لا توجد طلبات تبادل' : 'No exchange requests'}</p></div>);
  return (
    <div className="space-y-3">
      <h2 className="font-cairo font-bold text-base">{isRTL ? 'تبادل وإهداء الأدوية' : 'Med-Exchange & Donation'} ({requests.length})</h2>
      <p className="text-xs text-[var(--text-muted)] font-tajawal">{isRTL ? 'مراجعة الطلبات قبل النشر للعامة' : 'Review requests before publishing to public'}</p>
      <div className="space-y-2 max-h-[50vh] overflow-y-auto">
        {requests.map((r) => (
          <div key={r.id} className="glass-card p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <Package className={`w-4 h-4 shrink-0 ${r.request_type === 'donate' ? 'text-status-open' : 'text-brand-blue-light'}`} />
                <div className="min-w-0">
                  <div className="font-cairo font-bold text-sm truncate">{r.medicine_name}</div>
                  <div className="text-xs text-[var(--text-muted)] font-tajawal truncate">
                    {r.request_type === 'donate' ? (isRTL ? 'إهداء مجاني' : 'Free donation') : (isRTL ? 'تبادل' : 'Exchange')} · {r.quantity} {isRTL ? 'وحدة' : 'units'} · {r.price === 0 ? (isRTL ? 'مجاني' : 'Free') : `${r.price}₪`}
                    {r.expiry_date && ` · ${isRTL ? 'ينتهي' : 'expires'}: ${r.expiry_date}`}
                  </div>
                </div>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${r.status === 'pending' ? 'bg-amber-500/20 text-amber-400' : r.status === 'approved' ? 'bg-status-open/20 text-status-open' : 'bg-status-emergency/20 text-status-emergency'}`}>{r.status}</span>
            </div>
            <div className="text-xs text-[var(--text-muted)] font-tajawal mb-2">
              {isRTL ? 'مقدم الطلب' : 'Requester'}: {r.requester_name || '—'} · {isRTL ? 'الصيدلية' : 'Pharmacy'}: {pharmacies.find((p) => p.id === r.pharmacy_id)?.name || r.pharmacy_name || '—'}
              {r.storage_conditions && ` · ${isRTL ? 'التخزين' : 'Storage'}: ${r.storage_conditions}`}
            </div>
            {r.notes && <p className="text-xs font-tajawal text-[var(--text-soft)] mb-2">{r.notes}</p>}
            {r.status === 'pending' && (
              <div className="flex gap-2">
                <button onClick={() => onApprove(r.id)} disabled={actionLoading === r.id} className="btn-primary text-xs flex-1 flex items-center justify-center gap-1.5 disabled:opacity-50">{actionLoading === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}{isRTL ? 'موافقة ونشر' : 'Approve & Publish'}</button>
                {rejectingId === r.id ? (
                  <div className="flex-1 flex gap-1">
                    <input value={rejectNotes} onChange={(e) => setRejectNotes(e.target.value)} placeholder={isRTL ? 'سبب الرفض...' : 'Rejection reason...'} className="flex-1 glass-card px-2 py-1.5 text-xs font-tajawal rounded-lg" />
                    <button onClick={() => { onReject(r.id, rejectNotes); setRejectingId(null); setRejectNotes(''); }} className="px-3 py-1.5 rounded-lg bg-status-emergency/20 text-status-emergency text-xs font-bold">{isRTL ? 'رفض' : 'Reject'}</button>
                  </div>
                ) : (
                  <button onClick={() => setRejectingId(r.id)} className="px-3 py-1.5 rounded-lg bg-status-emergency/15 text-status-emergency text-xs font-bold flex items-center gap-1"><XCircle className="w-3.5 h-3.5" />{isRTL ? 'رفض' : 'Reject'}</button>
                )}
              </div>
            )}
            {r.admin_notes && <p className="text-xs text-[var(--text-muted)] font-tajawal mt-2">{isRTL ? 'ملاحظات الأدمن' : 'Admin notes'}: {r.admin_notes}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ Reports List (Data Reports) ============
function ReportsList({ reports, onResolve, onReview, onDismiss, onReportClick, onDelete, actionLoading, isRTL }: {
  reports: DataReport[];
  onResolve: (id: string) => void; onReview: (id: string) => void; onDismiss: (id: string) => void; onReportClick: (r: DataReport) => void; onDelete: (id: string) => void;
  actionLoading: string | null; isRTL: boolean;
}) {
  if (reports.length === 0) return (<div className="text-center py-8"><Flag className="w-10 h-10 mx-auto mb-3 text-[var(--text-muted)]" /><p className="font-tajawal text-[var(--text-muted)]">{isRTL ? 'لا توجد بلاغات' : 'No reports'}</p></div>);
  const issueLabels: Record<string, string> = { wrong_status: isRTL ? 'حالة خاطئة' : 'Wrong Status', wrong_availability: isRTL ? 'توفر خاطئ' : 'Wrong Availability', wrong_info: isRTL ? 'معلومات خاطئة' : 'Wrong Info', other: isRTL ? 'أخرى' : 'Other' };
  const statusCls: Record<string, string> = { open: 'bg-amber-500/20 text-amber-400', reviewing: 'bg-brand-blue/20 text-brand-blue-light', resolved: 'bg-status-open/20 text-status-open', dismissed: 'bg-[var(--border-subtle)] text-[var(--text-muted)]' };
  const statusLabel: Record<string, string> = { open: isRTL ? 'مفتوح' : 'Open', reviewing: isRTL ? 'قيد المراجعة' : 'Reviewing', resolved: isRTL ? 'تم الحل' : 'Resolved', dismissed: isRTL ? 'مرفوض' : 'Dismissed' };
  return (
    <div className="space-y-3">
      <h2 className="font-cairo font-bold text-base">{isRTL ? 'بلاغات البيانات' : 'Data Reports'} ({reports.length})</h2>
      <div className="space-y-2 max-h-[50vh] overflow-y-auto">
        {reports.map((r) => (
          <div key={r.id} className="glass-card p-3 cursor-pointer hover:border-brand-blue/40 transition-colors" onClick={() => onReportClick(r)}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Flag className={`w-4 h-4 shrink-0 ${r.status === 'open' ? 'text-amber-400' : r.status === 'reviewing' ? 'text-brand-blue-light' : 'text-[var(--text-muted)]'}`} />
                <div>
                  <div className="font-cairo font-bold text-sm">{r.target_name || r.target_id}</div>
                  <div className="text-xs text-[var(--text-muted)] font-tajawal">{issueLabels[r.issue_type] || r.issue_type} · {r.target_type} · {isRTL ? 'المرسل' : 'Reporter'}: {r.reporter_name || '—'}</div>
                </div>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${statusCls[r.status] || statusCls.open}`}>{statusLabel[r.status] || r.status}</span>
            </div>
            {r.message && <p className="text-xs font-tajawal text-[var(--text-soft)] mb-2">{r.message}</p>}
            <p className="text-[10px] text-[var(--text-muted)] mb-2">{new Date(r.created_at).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US')}</p>
            {r.status !== 'resolved' && r.status !== 'dismissed' && (
              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                {r.status === 'open' && <button onClick={() => onReview(r.id)} disabled={actionLoading === r.id} className="btn-secondary text-xs flex-1 flex items-center justify-center gap-1.5 disabled:opacity-50">{actionLoading === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}{isRTL ? 'مراجعة' : 'Review'}</button>}
                <button onClick={() => onResolve(r.id)} disabled={actionLoading === r.id} className="btn-primary text-xs flex-1 flex items-center justify-center gap-1.5 disabled:opacity-50">{actionLoading === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}{isRTL ? 'حل' : 'Resolve'}</button>
                <button onClick={() => onDismiss(r.id)} disabled={actionLoading === r.id} className="px-3 py-1.5 rounded-lg bg-[var(--border-subtle)] text-[var(--text-soft)] text-xs font-bold disabled:opacity-50">{isRTL ? 'إغلاق' : 'Dismiss'}</button>
                <button onClick={() => onDelete(r.id)} disabled={actionLoading === r.id} className="p-2 rounded-lg bg-status-emergency/15 text-status-emergency disabled:opacity-50"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ Recalls List (Batch Recalls) ============
function RecallsList({ recalls, onNew, onResolve, onDelete, actionLoading, isRTL }: {
  recalls: BatchRecall[]; onNew: () => void; onResolve: (id: string) => void; onDelete: (id: string) => void;
  actionLoading: string | null; isRTL: boolean;
}) {
  const severityColor: Record<string, string> = { info: 'text-brand-blue-light', warning: 'text-amber-400', danger: 'text-status-emergency' };
  if (recalls.length === 0) return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-cairo font-bold text-base">{isRTL ? 'سحب التشغيلات' : 'Batch Recalls'} (0)</h2>
        <button onClick={onNew} className="btn-primary text-xs flex items-center gap-1.5"><Plus className="w-4 h-4" />{isRTL ? 'سحب جديد' : 'New Recall'}</button>
      </div>
      <div className="text-center py-8"><AlertOctagon className="w-10 h-10 mx-auto mb-3 text-[var(--text-muted)]" /><p className="font-tajawal text-[var(--text-muted)]">{isRTL ? 'لا توجد سحب التشغيلات' : 'No recalls'}</p></div>
    </div>
  );
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-cairo font-bold text-base">{isRTL ? 'سحب التشغيلات' : 'Batch Recalls'} ({recalls.length})</h2>
        <button onClick={onNew} className="btn-primary text-xs flex items-center gap-1.5"><Plus className="w-4 h-4" />{isRTL ? 'سحب جديد' : 'New Recall'}</button>
      </div>
      <div className="space-y-2 max-h-[50vh] overflow-y-auto">
        {recalls.map((r) => (
          <div key={r.id} className="glass-card p-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <AlertOctagon className={`w-4 h-4 shrink-0 ${severityColor[r.severity] || 'text-[var(--text-muted)]'}`} />
              <div className="min-w-0">
                <div className="font-cairo font-bold text-sm truncate">{r.medicine_name} · #{r.batch_number}</div>
                <div className="text-xs text-[var(--text-muted)] font-tajawal truncate">{r.reason} · {r.severity} · {r.status}</div>
              </div>
            </div>
            <div className="flex gap-1 shrink-0">
              {r.status === 'active' && <button onClick={() => onResolve(r.id)} disabled={actionLoading === r.id} className="p-2 rounded-lg glass hover:bg-status-open/15 transition-colors disabled:opacity-50" title={isRTL ? 'حل' : 'Resolve'}>{actionLoading === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5 text-status-open" />}</button>}
              <button onClick={() => onDelete(r.id)} disabled={actionLoading === r.id} className="p-2 rounded-lg glass hover:bg-status-emergency/15 transition-colors disabled:opacity-50"><Trash2 className="w-3.5 h-3.5 text-status-emergency" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ Recall Form Modal ============
function RecallForm({ onClose, onSave, actionLoading, isRTL }: {
  onClose: () => void; onSave: (data: { medicine_name: string; batch_number: string; reason: string; severity: string }) => void; actionLoading: boolean; isRTL: boolean;
}) {
  const [medicineName, setMedicineName] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [reason, setReason] = useState('');
  const [severity, setSeverity] = useState('warning');
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-card p-5 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-cairo font-bold text-base flex items-center gap-2"><AlertOctagon className="w-5 h-5 text-status-emergency" />{isRTL ? 'سحب تشغيلة' : 'Recall Batch'}</h3>
          <button onClick={onClose} className="text-[var(--text-muted)]"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-tajawal font-bold text-[var(--text-muted)] block mb-1">{isRTL ? 'اسم الدواء' : 'Medicine Name'}</label>
            <input value={medicineName} onChange={(e) => setMedicineName(e.target.value)} className="w-full glass-card p-2.5 text-sm font-tajawal rounded-xl focus:outline-none focus:border-brand-green" />
          </div>
          <div>
            <label className="text-xs font-tajawal font-bold text-[var(--text-muted)] block mb-1">{isRTL ? 'رقم التشغيلة' : 'Batch Number'}</label>
            <input value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} className="w-full glass-card p-2.5 text-sm font-tajawal rounded-xl focus:outline-none focus:border-brand-green" />
          </div>
          <div>
            <label className="text-xs font-tajawal font-bold text-[var(--text-muted)] block mb-1">{isRTL ? 'السبب' : 'Reason'}</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="w-full glass-card p-2.5 text-sm font-tajawal rounded-xl focus:outline-none focus:border-brand-green resize-none" />
          </div>
          <div>
            <label className="text-xs font-tajawal font-bold text-[var(--text-muted)] block mb-1">{isRTL ? 'مستوى الخطورة' : 'Severity'}</label>
            <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="w-full glass-card p-2.5 text-sm font-tajawal rounded-xl">
              <option value="info">{isRTL ? 'معلومة' : 'Info'}</option>
              <option value="warning">{isRTL ? 'تحذير' : 'Warning'}</option>
              <option value="danger">{isRTL ? 'خطر' : 'Danger'}</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={() => onSave({ medicine_name: medicineName, batch_number: batchNumber, reason, severity })} disabled={actionLoading || !medicineName.trim() || !batchNumber.trim()} className="btn-primary flex-1 text-sm flex items-center justify-center gap-1.5 disabled:opacity-50">{actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertOctagon className="w-4 h-4" />}{isRTL ? 'إنشاء' : 'Create'}</button>
          <button onClick={onClose} className="btn-secondary text-sm px-4">{isRTL ? 'إلغاء' : 'Cancel'}</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============ Audit Logs List ============
function AuditLogsList({ logs, onRollback, onLogClick, actionLoading, isRTL }: { logs: AuditLog[]; onRollback: (log: AuditLog) => void; onLogClick: (log: AuditLog) => void; actionLoading: string | null; isRTL: boolean }) {
  const actionIcons: Record<string, JSX.Element> = {
    create: <Plus className="w-3.5 h-3.5 text-status-open" />,
    update: <Pencil className="w-3.5 h-3.5 text-brand-blue-light" />,
    delete: <Trash2 className="w-3.5 h-3.5 text-status-emergency" />,
    restore: <RotateCcw className="w-3.5 h-3.5 text-status-open" />,
    freeze: <Snowflake className="w-3.5 h-3.5 text-brand-blue-light" />,
    unfreeze: <Snowflake className="w-3.5 h-3.5 text-[var(--text-muted)]" />,
    warn: <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,
    ban_user: <Ban className="w-3.5 h-3.5 text-status-emergency" />,
    unban_user: <Ban className="w-3.5 h-3.5 text-[var(--text-muted)]" />,
    change_role: <Users className="w-3.5 h-3.5 text-brand-blue-light" />,
  };
  const rollbackable = ['change_role', 'ban_user', 'unban_user', 'freeze_account', 'unfreeze_account', 'verify_pharmacy', 'verify_facility', 'unverify_pharmacy', 'unverify_facility', 'restrict_medicine'];
  const roleAr: Record<string, string> = { citizen: 'مواطن', pharmacist: 'صيدلي', facility_owner: 'صاحب مرفق', admin: 'أدمن' };
  function formatDetail(log: AuditLog): string {
    const actor = log.actor_name || (isRTL ? 'النظام' : 'System');
    const target = log.entity_id || '';
    const date = new Date(log.created_at).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US');
    const time = new Date(log.created_at).toLocaleTimeString(isRTL ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' });
    if (log.action === 'change_role' && log.before_state?.role && log.after_state?.role) {
      return isRTL
        ? `قام ${actor} بتغيير صلاحية ${target} من "${roleAr[String(log.before_state.role)] || log.before_state.role}" إلى "${roleAr[String(log.after_state.role)] || log.after_state.role}" بتاريخ ${date} الساعة ${time}`
        : `${actor} changed role of ${target} from "${log.before_state.role}" to "${log.after_state.role}" on ${date} at ${time}`;
    }
    if (log.action === 'ban_user') {
      return isRTL ? `قام ${actor} بحظر المستخدم ${target} بتاريخ ${date} الساعة ${time}` : `${actor} banned user ${target} on ${date} at ${time}`;
    }
    if (log.action === 'unban_user') {
      return isRTL ? `قام ${actor} بإلغاء حظر المستخدم ${target} بتاريخ ${date} الساعة ${time}` : `${actor} unbanned user ${target} on ${date} at ${time}`;
    }
    if (log.action === 'freeze_account') {
      return isRTL ? `قام ${actor} بتجميد حساب ${target} بتاريخ ${date} الساعة ${time}` : `${actor} froze account ${target} on ${date} at ${time}`;
    }
    if (log.action === 'unfreeze_account') {
      return isRTL ? `قام ${actor} بإلغاء تجميد حساب ${target} بتاريخ ${date} الساعة ${time}` : `${actor} unfroze account ${target} on ${date} at ${time}`;
    }
    if (log.action === 'verify_pharmacy' || log.action === 'verify_facility') {
      return isRTL ? `قام ${actor} باعتماد ${target} بتاريخ ${date} الساعة ${time}` : `${actor} verified ${target} on ${date} at ${time}`;
    }
    if (log.action === 'unverify_pharmacy' || log.action === 'unverify_facility') {
      return isRTL ? `قام ${actor} بإلغاء اعتماد ${target} بتاريخ ${date} الساعة ${time}` : `${actor} unverified ${target} on ${date} at ${time}`;
    }
    if (log.action === 'restrict_medicine') {
      return isRTL ? `قام ${actor} بتقييد الدواء ${target} بتاريخ ${date} الساعة ${time}` : `${actor} restricted medicine ${target} on ${date} at ${time}`;
    }
    if (log.action === 'soft_delete_pharmacies' || log.action === 'soft_delete_facilities' || log.action === 'soft_delete_medicines') {
      return isRTL ? `قام ${actor} بنقل ${target} إلى سلة المهملات بتاريخ ${date} الساعة ${time}` : `${actor} moved ${target} to trash on ${date} at ${time}`;
    }
    if (log.action === 'restore_pharmacies' || log.action === 'restore_facilities' || log.action === 'restore_medicines') {
      return isRTL ? `قام ${actor} باستعادة ${target} من سلة المهملات بتاريخ ${date} الساعة ${time}` : `${actor} restored ${target} from trash on ${date} at ${time}`;
    }
    if (log.action === 'approve_donation') {
      return isRTL ? `قام ${actor} بالموافقة على طلب تبرع دواء (${target}) بتاريخ ${date} الساعة ${time}` : `${actor} approved donation (${target}) on ${date} at ${time}`;
    }
    if (log.action === 'reject_donation') {
      return isRTL ? `قام ${actor} برفض طلب تبرع دواء (${target}) بتاريخ ${date} الساعة ${time}` : `${actor} rejected donation (${target}) on ${date} at ${time}`;
    }
    if (log.before_state || log.after_state) {
      const before = log.before_state ? Object.entries(log.before_state).map(([k, v]) => `${k}=${String(v)}`).join(', ') : '';
      const after = log.after_state ? Object.entries(log.after_state).map(([k, v]) => `${k}=${String(v)}`).join(', ') : '';
      return isRTL ? `قام ${actor} بتعديل ${target} — قبل: ${before} ← بعد: ${after} — بتاريخ ${date} الساعة ${time}` : `${actor} updated ${target} — Before: ${before} → After: ${after} — on ${date} at ${time}`;
    }
    return isRTL ? `قام ${actor} بإجراء "${log.action.replace(/_/g, ' ')}" على ${target} بتاريخ ${date} الساعة ${time}` : `${actor} performed "${log.action.replace(/_/g, ' ')}" on ${target} on ${date} at ${time}`;
  }
  if (logs.length === 0) return (<div className="text-center py-8"><ScrollText className="w-10 h-10 mx-auto mb-3 text-[var(--text-muted)]" /><p className="font-tajawal text-[var(--text-muted)]">{isRTL ? 'لا توجد سجلات' : 'No audit logs'}</p></div>);
  return (
    <div className="space-y-3">
      <h2 className="font-cairo font-bold text-base flex items-center gap-2"><ScrollText className="w-5 h-5 text-brand-blue-light" />{isRTL ? 'سجل التدقيق' : 'Audit Logs'} ({logs.length})</h2>
      <div className="space-y-1.5 max-h-[55vh] overflow-y-auto">
        {logs.map((log) => (
          <div key={log.id} className="glass-card p-2.5 flex items-center gap-2.5 cursor-pointer hover:bg-[var(--border-subtle)]/30 transition-colors" onClick={() => onLogClick(log)}>
            <div className="w-8 h-8 rounded-lg glass flex items-center justify-center shrink-0">{actionIcons[log.action] || <Activity className="w-3.5 h-3.5 text-[var(--text-muted)]" />}</div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-cairo font-bold">
                <span className="text-brand-blue-light">{log.actor_name}</span>
                <span className="text-[var(--text-muted)] mx-1">—</span>
                <span>{log.action.replace(/_/g, ' ')}</span>
              </div>
              <div className="text-[10px] text-[var(--text-muted)] font-tajawal truncate">
                {formatDetail(log)}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {rollbackable.includes(log.action) && (
                <button onClick={() => onRollback(log)} disabled={actionLoading === log.id} title={isRTL ? 'تراجع' : 'Rollback'} className="p-1.5 rounded-lg glass hover:bg-amber-500/15 transition-colors disabled:opacity-50">
                  {actionLoading === log.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3 text-amber-400" />}
                </button>
              )}
              <span className="text-[10px] text-[var(--text-muted)] font-tajawal">{new Date(log.created_at).toLocaleString(isRTL ? 'ar-EG' : 'en-US')}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ Warnings List ============
function WarningsList({ warnings, facilities, pharmacies, onNew, onDelete, actionLoading, isRTL }: {
  warnings: FacilityWarning[]; facilities: Facility[]; pharmacies: Pharmacy[];
  onNew: () => void; onDelete: (id: string) => void;
  actionLoading: string | null; isRTL: boolean;
}) {
  const sevColor: Record<string, string> = { info: 'text-brand-blue-light', warning: 'text-amber-400', emergency: 'text-status-emergency' };
  const getTargetName = (w: FacilityWarning) => {
    if (w.target_type === 'facility') return facilities.find((f) => f.id === w.target_id)?.name || w.target_id;
    return pharmacies.find((p) => p.id === w.target_id)?.name || w.target_id;
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-cairo font-bold text-base flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-400" />{isRTL ? 'إنذارات رسمية' : 'Official Warnings'} ({warnings.length})</h2>
        <button onClick={onNew} className="btn-primary text-xs flex items-center gap-1.5"><Send className="w-3.5 h-3.5" />{isRTL ? 'إرسال إنذار' : 'Send Warning'}</button>
      </div>
      {warnings.length === 0 ? (<div className="text-center py-8"><AlertTriangle className="w-10 h-10 mx-auto mb-3 text-[var(--text-muted)]" /><p className="font-tajawal text-[var(--text-muted)]">{isRTL ? 'لا توجد إنذارات' : 'No warnings'}</p></div>) : (
        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {warnings.map((w) => (
            <div key={w.id} className="glass-card p-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`w-4 h-4 shrink-0 ${sevColor[w.severity] || 'text-[var(--text-muted)]'}`} />
                  <div>
                    <div className="font-cairo font-bold text-sm">{getTargetName(w)}</div>
                    <div className="text-xs text-[var(--text-muted)] font-tajawal">{w.target_type} · {w.severity}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {w.acknowledged_at && <span className="text-[10px] px-2 py-0.5 rounded-full bg-status-open/20 text-status-open font-bold">{isRTL ? 'تم التأكيد' : 'Acknowledged'}</span>}
                  <button onClick={() => onDelete(w.id)} disabled={actionLoading === w.id} className="p-1.5 rounded-lg glass hover:bg-status-emergency/15 transition-colors disabled:opacity-50"><Trash2 className="w-3.5 h-3.5 text-status-emergency" /></button>
                </div>
              </div>
              <p className="text-xs font-tajawal text-[var(--text-soft)]">{w.message}</p>
              {w.duration_type && w.duration_type !== 'permanent' && (
                <div className="flex items-center gap-1 mt-1 text-[10px] text-amber-400 font-tajawal">
                  <Clock className="w-2.5 h-2.5" />
                  {w.duration_type === 'custom' && w.expires_at
                    ? `${isRTL ? 'حتى' : 'Until'} ${new Date(w.expires_at).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US')}`
                    : w.duration_type === '12h' ? (isRTL ? '12 ساعة' : '12 hours')
                    : w.duration_type === '24h' ? (isRTL ? '24 ساعة' : '24 hours')
                    : w.duration_type}
                </div>
              )}
              <p className="text-[10px] text-[var(--text-muted)] mt-1">{new Date(w.created_at).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US')}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ Warning Form Modal ============
function WarningForm({ editing, facilities, pharmacies, onClose, onSend, actionLoading, isRTL }: {
  editing: { type: string; data: Record<string, unknown> }; facilities: Facility[]; pharmacies: Pharmacy[];
  onClose: () => void; onSend: (data: { target_type: string; target_id: string; message: string; severity: string; duration_type?: string; duration_hours?: number; expires_at?: string | null }) => void;
  actionLoading: boolean; isRTL: boolean;
}) {
  const [targetType, setTargetType] = useState('facility');
  const [targetId, setTargetId] = useState('');
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState('warning');
  const [durationType, setDurationType] = useState<'12h' | '24h' | 'custom' | 'permanent'>('permanent');
  const [customDate, setCustomDate] = useState('');
  const targets = targetType === 'facility' ? facilities.filter((f) => !f.deleted_at) : pharmacies.filter((p) => !p.deleted_at);
  const handleSend = () => {
    let duration_hours: number | undefined;
    let expires_at: string | null | undefined;
    if (durationType === '12h') duration_hours = 12;
    else if (durationType === '24h') duration_hours = 24;
    else if (durationType === 'custom' && customDate) expires_at = new Date(customDate).toISOString();
    onSend({ target_type: targetType, target_id: targetId, message, severity, duration_type: durationType, duration_hours, expires_at });
  };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-card p-5 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-cairo font-bold text-base flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-400" />{isRTL ? 'إرسال إنذار رسمي' : 'Send Official Warning'}</h3>
          <button onClick={onClose} className="text-[var(--text-muted)]"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-tajawal font-bold text-[var(--text-muted)] block mb-1">{isRTL ? 'الجهة' : 'Target'}</label>
            <select value={targetType} onChange={(e) => { setTargetType(e.target.value); setTargetId(''); }} className="w-full glass-card p-2.5 text-sm font-tajawal rounded-xl">
              <option value="facility">{isRTL ? 'مرفق طبي' : 'Facility'}</option>
              <option value="pharmacy">{isRTL ? 'صيدلية' : 'Pharmacy'}</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-tajawal font-bold text-[var(--text-muted)] block mb-1">{isRTL ? 'الاسم' : 'Name'}</label>
            <select value={targetId} onChange={(e) => setTargetId(e.target.value)} className="w-full glass-card p-2.5 text-sm font-tajawal rounded-xl">
              <option value="">—</option>
              {targets.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
            </select>
          </div>
          <div>
            <label className="text-xs font-tajawal font-bold text-[var(--text-muted)] block mb-1">{isRTL ? 'مستوى الخطورة' : 'Severity'}</label>
            <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="w-full glass-card p-2.5 text-sm font-tajawal rounded-xl">
              <option value="info">{isRTL ? 'معلومة' : 'Info'}</option>
              <option value="warning">{isRTL ? 'تحذير' : 'Warning'}</option>
              <option value="emergency">{isRTL ? 'طوارئ' : 'Emergency'}</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-tajawal font-bold text-[var(--text-muted)] block mb-1">{isRTL ? 'الرسالة' : 'Message'}</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} className="w-full glass-card p-2.5 text-sm font-tajawal rounded-xl focus:outline-none focus:border-brand-green resize-none" placeholder={isRTL ? 'نص الإنذار...' : 'Warning message...'} />
          </div>
          <div>
            <label className="text-xs font-tajawal font-bold text-[var(--text-muted)] block mb-1">{isRTL ? 'مدة الإنذار' : 'Warning Duration'}</label>
            <div className="flex gap-1.5 flex-wrap">
              {([{ k: '12h', l: isRTL ? '12 ساعة' : '12 hours' }, { k: '24h', l: isRTL ? '24 ساعة' : '24 hours' }, { k: 'custom', l: isRTL ? 'مخصص' : 'Custom' }, { k: 'permanent', l: isRTL ? 'دائم' : 'Permanent' }] as const).map((d) => (
                <button key={d.k} type="button" onClick={() => setDurationType(d.k)} className={`px-3 py-1.5 rounded-lg text-xs font-tajawal font-bold transition-colors ${durationType === d.k ? 'bg-amber-500 text-white' : 'glass text-[var(--text-soft)]'}`}>{d.l}</button>
              ))}
            </div>
            {durationType === 'custom' && (
              <input type="datetime-local" value={customDate} onChange={(e) => setCustomDate(e.target.value)} className="w-full mt-2 glass-card p-2.5 text-sm font-tajawal rounded-xl focus:outline-none focus:border-amber-500" />
            )}
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={handleSend} disabled={actionLoading || !targetId || !message.trim()} className="btn-primary flex-1 text-sm flex items-center justify-center gap-1.5 disabled:opacity-50">{actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}{isRTL ? 'إرسال' : 'Send'}</button>
          <button onClick={onClose} className="btn-secondary text-sm px-4">{isRTL ? 'إلغاء' : 'Cancel'}</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============ Pending Preview Modal ============
function PendingPreviewModal({ data, type, medicines, departments, onClose, onApprove, onReject, actionLoading, isRTL }: {
  data: Pharmacy | Facility;
  type: 'pharmacy' | 'facility';
  medicines: Medicine[];
  departments: Record<string, Department[]>;
  onClose: () => void;
  onApprove: (table: string, id: string, name: string) => void;
  onReject: (table: string, id: string, name: string) => void;
  actionLoading: string | null;
  isRTL: boolean;
}) {
  const isPharmacy = type === 'pharmacy';
  const p = data as Pharmacy;
  const f = data as Facility;
  const entityMeds = isPharmacy ? medicines.filter((m) => m.pharmacy_id === p.id) : [];
  const entityDepts = !isPharmacy ? (departments[f.id] || []) : [];
  const table = isPharmacy ? 'pharmacies' : 'facilities';
  const name = isPharmacy ? p.name : f.name;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-card p-5 w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-cairo font-bold text-base flex items-center gap-2">
            {isPharmacy ? <Pill className="w-5 h-5 text-brand-green-light" /> : <Building2 className="w-5 h-5 text-brand-blue-light" />}
            {isRTL ? 'معاينة قبل الاعتماد' : 'Preview Before Approval'}
          </h3>
          <button onClick={onClose} className="text-[var(--text-muted)]"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-4">
          <div className="glass-card p-4 space-y-2">
            <div className="font-cairo font-bold text-lg">{name}</div>
            <div className="text-sm text-[var(--text-muted)] font-tajawal space-y-1">
              {isPharmacy ? (
                <>
                  <div>📍 {p.address || p.area}</div>
                  <div>⏰ {formatOpenHours(p.open_hours, isRTL)}</div>
                  <div>📞 {p.phone || '—'}</div>
                  <div>⭐ {p.rating} · {p.status}</div>
                </>
              ) : (
                <>
                  <div>📍 {f.address || f.area}</div>
                  <div>🏥 {f.type}</div>
                  <div>💰 {f.is_free ? (isRTL ? 'مجاني' : 'Free') : (isRTL ? 'مدفوع' : 'Paid')}{f.pricing_type === 'nominal' ? (isRTL ? ' (أسعار رمزية)' : ' (Nominal)') : ''}</div>
                  <div>📊 {f.overall_status}</div>
                  {f.max_capacity != null && <div>🏥 {isRTL ? `السعة القصوى: ${f.max_capacity}` : `Max Capacity: ${f.max_capacity}`}</div>}
                </>
              )}
            </div>
          </div>

          {isPharmacy && (
            <div>
              <h4 className="font-cairo font-bold text-sm mb-2">{isRTL ? `الأدوية المرفوعة (${entityMeds.length})` : `Uploaded Medicines (${entityMeds.length})`}</h4>
              {entityMeds.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] font-tajawal">{isRTL ? 'لا توجد أدوية' : 'No medicines'}</p>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {entityMeds.map((m) => (
                    <div key={m.id} className="glass-card p-2 flex items-center justify-between text-xs">
                      <span className="font-cairo font-bold">{m.medicine_name}</span>
                      <span className="text-[var(--text-muted)]">{m.generic_name} · {m.price}₪ · {m.quantity}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!isPharmacy && (
            <div>
              <h4 className="font-cairo font-bold text-sm mb-2">{isRTL ? `الأقسام (${entityDepts.length})` : `Departments (${entityDepts.length})`}</h4>
              {entityDepts.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] font-tajawal">{isRTL ? 'لا توجد أقسام' : 'No departments'}</p>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {entityDepts.map((d) => (
                    <div key={d.id} className="glass-card p-2 flex items-center justify-between text-xs">
                      <span className="font-cairo font-bold">{d.name}</span>
                      <span className="text-[var(--text-muted)]">{isRTL ? `انتظار: ${d.waiting_count}` : `Waiting: ${d.waiting_count}`}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={() => onApprove(table, data.id, name)} disabled={actionLoading === data.id} className="btn-primary flex-1 text-sm flex items-center justify-center gap-1.5 disabled:opacity-50">
            {actionLoading === data.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            {isRTL ? 'اعتماد' : 'Approve'}
          </button>
          <button onClick={() => onReject(table, data.id, name)} disabled={actionLoading === data.id} className="btn-secondary text-sm px-4 flex items-center gap-1.5 text-status-emergency disabled:opacity-50">
            <XCircle className="w-4 h-4" />
            {isRTL ? 'رفض' : 'Reject'}
          </button>
          <button onClick={onClose} className="btn-secondary text-sm px-4">{isRTL ? 'إغلاق' : 'Close'}</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============ Heatmap Tab ============
function HeatmapTab({ logs, isRTL }: { logs: SearchLog[]; isRTL: boolean }) {
  if (logs.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <Flame className="w-10 h-10 mx-auto mb-3 text-[var(--text-muted)]" />
        <p className="font-tajawal text-[var(--text-muted)] text-sm">{isRTL ? 'لا توجد بيانات بحث كافية بعد' : 'Not enough search data yet'}</p>
      </div>
    );
  }

  const queryCounts: Record<string, number> = {};
  logs.forEach((l) => { queryCounts[l.query] = (queryCounts[l.query] || 0) + 1; });
  const sorted = Object.entries(queryCounts).sort((a, b) => b[1] - a[1]).slice(0, 20);
  const maxCount = sorted[0]?.[1] || 1;

  const areaCounts: Record<string, number> = {};
  logs.forEach((l) => { if (l.area) areaCounts[l.area] = (areaCounts[l.area] || 0) + 1; });
  const sortedAreas = Object.entries(areaCounts).sort((a, b) => b[1] - a[1]);
  const maxArea = sortedAreas[0]?.[1] || 1;

  const heatColor = (count: number, max: number) => {
    const ratio = count / max;
    if (ratio > 0.75) return 'bg-status-emergency/80 text-white';
    if (ratio > 0.5) return 'bg-amber-500/70 text-white';
    if (ratio > 0.25) return 'bg-amber-400/50 text-[var(--text-soft)]';
    return 'bg-brand-green/20 text-[var(--text-soft)]';
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-cairo font-bold text-base flex items-center gap-2 mb-1">
          <Flame className="w-5 h-5 text-status-emergency" />
          {isRTL ? 'الخريطة الحرارية للبحث' : 'Search Heatmap'}
        </h3>
        <p className="text-xs font-tajawal text-[var(--text-muted)]">{isRTL ? 'الأدوية والمرافق الأكثر بحثاً' : 'Most searched medicines and facilities'}</p>
      </div>

      <div>
        <h4 className="font-cairo font-bold text-sm mb-2">{isRTL ? 'الأكثر بحثاً' : 'Top Searches'}</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {sorted.map(([query, count]) => (
            <motion.div
              key={query}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`rounded-xl p-3 ${heatColor(count, maxCount)} transition-all`}
            >
              <div className="font-cairo font-bold text-sm truncate">{query}</div>
              <div className="text-xs opacity-80">{count} {isRTL ? 'بحث' : 'searches'}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {sortedAreas.length > 0 && (
        <div>
          <h4 className="font-cairo font-bold text-sm mb-2">{isRTL ? 'التوزيع الجغرافي' : 'Geographic Distribution'}</h4>
          <div className="space-y-1.5">
            {sortedAreas.map(([area, count]) => (
              <div key={area} className="flex items-center gap-2">
                <span className="text-xs font-tajawal w-20 truncate">{area}</span>
                <div className="flex-1 h-6 rounded-full bg-[var(--border-subtle)] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(count / maxArea) * 100}%` }}
                    transition={{ duration: 0.5 }}
                    className={`h-full rounded-full ${heatColor(count, maxArea)}`}
                  />
                </div>
                <span className="text-xs font-bold w-8 text-end">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============ Broadcasts Tab ============
function BroadcastsTab({ broadcasts, onNew, onDelete, actionLoading, isRTL }: {
  broadcasts: EmergencyBroadcast[];
  onNew: () => void;
  onDelete: (id: string) => void;
  actionLoading: string | null;
  isRTL: boolean;
}) {
  const sevColors: Record<string, string> = {
    info: 'bg-brand-blue/20 text-brand-blue-light',
    warning: 'bg-amber-500/20 text-amber-400',
    emergency: 'bg-status-emergency/20 text-status-emergency',
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-cairo font-bold text-base flex items-center gap-2"><Megaphone className="w-5 h-5 text-brand-green-light" />{isRTL ? 'البث الطارئ' : 'Emergency Broadcasts'}</h3>
        <button onClick={onNew} className="btn-primary text-sm flex items-center gap-1.5"><Plus className="w-4 h-4" />{isRTL ? 'بث جديد' : 'New Broadcast'}</button>
      </div>
      {broadcasts.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <Radio className="w-10 h-10 mx-auto mb-3 text-[var(--text-muted)]" />
          <p className="font-tajawal text-[var(--text-muted)] text-sm">{isRTL ? 'لا توجد بثوث' : 'No broadcasts yet'}</p>
        </div>
      ) : (
        broadcasts.map((b) => (
          <div key={b.id} className="glass-card p-3 flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 min-w-0">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${sevColors[b.severity]}`}><Radio className="w-4 h-4" /></div>
              <div className="min-w-0">
                <div className="font-cairo font-bold text-sm truncate">{b.title}</div>
                <div className="text-xs text-[var(--text-muted)] font-tajawal line-clamp-2">{b.message}</div>
                <div className="text-[10px] text-[var(--text-muted)] mt-1">{isRTL ? 'المنطقة' : 'Area'}: {b.area === 'all' ? (isRTL ? 'الكل' : 'All') : b.area} · {new Date(b.created_at).toLocaleString()}</div>
              </div>
            </div>
            <button onClick={() => onDelete(b.id)} disabled={actionLoading === b.id} className="text-status-emergency/70 hover:text-status-emergency disabled:opacity-50 shrink-0">
              {actionLoading === b.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>
          </div>
        ))
      )}
    </div>
  );
}

// ============ Broadcast Form ============
function BroadcastForm({ onClose, onSend, actionLoading, isRTL }: {
  onClose: () => void;
  onSend: (data: { title: string; message: string; area: string; severity: 'info' | 'warning' | 'emergency'; duration_type?: string; duration_hours?: number; expires_at?: string | null }) => void;
  actionLoading: boolean;
  isRTL: boolean;
}) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [area, setArea] = useState('all');
  const [severity, setSeverity] = useState<'info' | 'warning' | 'emergency'>('warning');
  const [durationType, setDurationType] = useState<'12h' | '24h' | 'custom' | 'permanent'>('24h');
  const [customDate, setCustomDate] = useState('');

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-card p-5 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-cairo font-bold text-base flex items-center gap-2"><Megaphone className="w-5 h-5 text-status-emergency" />{isRTL ? 'بث طارئ جديد' : 'New Emergency Broadcast'}</h3>
          <button onClick={onClose} className="text-[var(--text-muted)]"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-tajawal font-bold text-[var(--text-muted)] block mb-1">{isRTL ? 'العنوان *' : 'Title *'}</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full glass-card px-3 py-2.5 text-sm font-tajawal focus:outline-none focus:border-brand-green" placeholder={isRTL ? 'عنوان الإشعار' : 'Broadcast title'} />
          </div>
          <div>
            <label className="text-xs font-tajawal font-bold text-[var(--text-muted)] block mb-1">{isRTL ? 'الرسالة *' : 'Message *'}</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} className="w-full glass-card px-3 py-2.5 text-sm font-tajawal focus:outline-none focus:border-brand-green resize-none" placeholder={isRTL ? 'نص الإشعار...' : 'Broadcast message...'} />
          </div>
          <div>
            <label className="text-xs font-tajawal font-bold text-[var(--text-muted)] block mb-1">{isRTL ? 'المنطقة المستهدفة' : 'Target Area'}</label>
            <select value={area} onChange={(e) => setArea(e.target.value)} className="w-full glass-card p-2.5 text-sm font-tajawal rounded-xl focus:outline-none focus:border-brand-green">
              <option value="all">{isRTL ? 'كل المناطق' : 'All Areas'}</option>
              <optgroup label={isRTL ? 'شمال غزة' : 'North Gaza'}>
                <option value="جباليا">جباليا</option>
                <option value="بيت لاهيا">بيت لاهيا</option>
                <option value="بيت حانون">بيت حانون</option>
              </optgroup>
              <optgroup label={isRTL ? 'غزة' : 'Gaza City'}>
                <option value="الرمال">الرمال</option>
                <option value="الزيتون">الزيتون</option>
                <option value="الشجاعية">الشجاعية</option>
                <option value="تل الهوا">تل الهوا</option>
                <option value="الشيخ رضوان">الشيخ رضوان</option>
                <option value="النصر">النصر</option>
                <option value="الدرج">الدرج</option>
              </optgroup>
              <optgroup label={isRTL ? 'الوسطى' : 'Middle Area'}>
                <option value="دير البلح">دير البلح</option>
                <option value="النصيرات">النصيرات</option>
                <option value="البريج">البريج</option>
                <option value="المغازي">المغازي</option>
                <option value="الزوايدة">الزوايدة</option>
              </optgroup>
              <optgroup label={isRTL ? 'خانيونس' : 'Khan Younis'}>
                <option value="مدينة خانيونس">مدينة خانيونس</option>
                <option value="القرارة">القرارة</option>
                <option value="عبسان">عبسان</option>
                <option value="بني سهيلا">بني سهيلا</option>
              </optgroup>
              <optgroup label={isRTL ? 'رفح' : 'Rafah'}>
                <option value="مدينة رفح">مدينة رفح</option>
                <option value="الشابورة">الشابورة</option>
                <option value="تل السلطان">تل السلطان</option>
                <option value="النصر">النصر (رفح)</option>
              </optgroup>
            </select>
          </div>
          <div>
            <label className="text-xs font-tajawal font-bold text-[var(--text-muted)] block mb-1">{isRTL ? 'مستوى الخطورة' : 'Severity'}</label>
            <div className="flex gap-2">
              {(['info', 'warning', 'emergency'] as const).map((s) => (
                <button key={s} onClick={() => setSeverity(s)} className={`flex-1 py-2 rounded-xl text-sm font-tajawal font-bold transition-colors ${severity === s ? s === 'emergency' ? 'bg-status-emergency text-white' : s === 'warning' ? 'bg-amber-500 text-white' : 'bg-brand-blue text-white' : 'glass text-[var(--text-soft)]'}`}>
                  {s === 'info' ? (isRTL ? 'معلومة' : 'Info') : s === 'warning' ? (isRTL ? 'تنبيه' : 'Warning') : (isRTL ? 'طارئ' : 'Emergency')}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-tajawal font-bold text-[var(--text-muted)] block mb-1">{isRTL ? 'مدة البث' : 'Broadcast Duration'}</label>
            <div className="flex gap-1.5 flex-wrap">
              {([{ k: '12h', l: isRTL ? '12 ساعة' : '12 hours' }, { k: '24h', l: isRTL ? '24 ساعة' : '24 hours' }, { k: 'custom', l: isRTL ? 'مخصص' : 'Custom' }, { k: 'permanent', l: isRTL ? 'دائم' : 'Permanent' }] as const).map((d) => (
                <button key={d.k} type="button" onClick={() => setDurationType(d.k)} className={`px-3 py-1.5 rounded-lg text-xs font-tajawal font-bold transition-colors ${durationType === d.k ? 'bg-status-emergency text-white' : 'glass text-[var(--text-soft)]'}`}>{d.l}</button>
              ))}
            </div>
            {durationType === 'custom' && (
              <input type="datetime-local" value={customDate} onChange={(e) => setCustomDate(e.target.value)} className="w-full mt-2 glass-card p-2.5 text-sm font-tajawal rounded-xl focus:outline-none focus:border-status-emergency" />
            )}
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={() => onSend({ title, message, area, severity, duration_type: durationType, duration_hours: durationType === '12h' ? 12 : durationType === '24h' ? 24 : undefined, expires_at: durationType === 'custom' && customDate ? new Date(customDate).toISOString() : null })} disabled={!title.trim() || !message.trim() || actionLoading} className="btn-primary flex-1 text-sm flex items-center justify-center gap-1.5 disabled:opacity-50">
            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {isRTL ? 'إرسال البث' : 'Send Broadcast'}
          </button>
          <button onClick={onClose} className="btn-secondary text-sm px-4">{isRTL ? 'إلغاء' : 'Cancel'}</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ===================== SUGGESTIONS LIST ===================== */
function SuggestionsList({ suggestions, roleFilter, setRoleFilter, dateFilter, setDateFilter, onStatusChange, onDelete, actionLoading, isRTL }: {
  suggestions: Suggestion[];
  roleFilter: string; setRoleFilter: (v: string) => void;
  dateFilter: string; setDateFilter: (v: string) => void;
  onStatusChange: (id: string, status: 'reviewing' | 'implemented' | 'rejected') => void;
  onDelete: (id: string) => void;
  actionLoading: string | null;
  isRTL: boolean;
}) {
  const roleLabels: Record<string, string> = {
    citizen: isRTL ? 'مواطن' : 'Citizen',
    pharmacist: isRTL ? 'صيدلي' : 'Pharmacist',
    facility_owner: isRTL ? 'مدير مرفق' : 'Facility Owner',
    facility_admin: isRTL ? 'مدير مرفق' : 'Facility Admin',
    admin: isRTL ? 'أدمن' : 'Admin',
  };
  const statusColors: Record<string, string> = {
    open: 'bg-status-open/20 text-status-open',
    reviewing: 'bg-amber-400/20 text-amber-400',
    implemented: 'bg-brand-blue/20 text-brand-blue-light',
    rejected: 'bg-status-emergency/20 text-status-emergency',
  };

  const now = Date.now();
  const filtered = suggestions.filter((s) => {
    if (roleFilter !== 'all' && s.user_role !== roleFilter) return false;
    if (dateFilter !== 'all') {
      const created = new Date(s.created_at).getTime();
      const days = (now - created) / (1000 * 60 * 60 * 24);
      if (dateFilter === 'today' && days > 1) return false;
      if (dateFilter === 'week' && days > 7) return false;
      if (dateFilter === 'month' && days > 30) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="glass-card p-2 text-xs font-tajawal rounded-xl">
          <option value="all">{isRTL ? 'كل المرسلين' : 'All Senders'}</option>
          <option value="citizen">{isRTL ? 'مواطن' : 'Citizen'}</option>
          <option value="pharmacist">{isRTL ? 'صيدلي' : 'Pharmacist'}</option>
          <option value="facility_owner">{isRTL ? 'مدير مرفق' : 'Facility Owner'}</option>
          <option value="facility_admin">{isRTL ? 'مدير مرفق' : 'Facility Admin'}</option>
        </select>
        <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="glass-card p-2 text-xs font-tajawal rounded-xl">
          <option value="all">{isRTL ? 'كل التواريخ' : 'All Dates'}</option>
          <option value="today">{isRTL ? 'اليوم' : 'Today'}</option>
          <option value="week">{isRTL ? 'هذا الأسبوع' : 'This Week'}</option>
          <option value="month">{isRTL ? 'هذا الشهر' : 'This Month'}</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <Lightbulb className="w-10 h-10 mx-auto mb-3 text-[var(--text-muted)]" />
          <p className="font-tajawal text-[var(--text-soft)]">{isRTL ? 'لا توجد اقتراحات' : 'No suggestions'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => (
            <div key={s.id} className="glass-card p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${statusColors[s.status] || statusColors.open}`}>
                      {s.status === 'open' ? (isRTL ? 'مفتوح' : 'Open') : s.status === 'reviewing' ? (isRTL ? 'قيد المراجعة' : 'Reviewing') : s.status === 'implemented' ? (isRTL ? 'تم التنفيذ' : 'Implemented') : (isRTL ? 'مرفوض' : 'Rejected')}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-green/10 text-brand-green-light font-bold">{roleLabels[s.user_role] || s.user_role}</span>
                    {s.entity_name && <span className="text-[10px] text-[var(--text-muted)] font-tajawal">· {s.entity_name}</span>}
                  </div>
                  <h4 className="font-cairo font-bold text-sm">{s.title || (isRTL ? '(بدون عنوان)' : '(Untitled)')}</h4>
                  <p className="text-xs font-tajawal text-[var(--text-soft)] mt-1 leading-relaxed">{s.description}</p>
                  <p className="text-[10px] text-[var(--text-muted)] font-tajawal mt-1">{s.user_name} · {new Date(s.created_at).toLocaleString(isRTL ? 'ar-EG' : 'en-US')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {s.status === 'open' && (
                  <button onClick={() => onStatusChange(s.id, 'reviewing')} disabled={actionLoading === s.id} className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-400 text-[10px] font-bold hover:bg-amber-500/25 transition-colors disabled:opacity-50">
                    {isRTL ? 'مراجعة' : 'Review'}
                  </button>
                )}
                {s.status !== 'implemented' && (
                  <button onClick={() => onStatusChange(s.id, 'implemented')} disabled={actionLoading === s.id} className="px-2.5 py-1 rounded-lg bg-brand-blue/15 text-brand-blue-light text-[10px] font-bold hover:bg-brand-blue/25 transition-colors disabled:opacity-50">
                    {isRTL ? 'تنفيذ' : 'Implement'}
                  </button>
                )}
                {s.status !== 'rejected' && (
                  <button onClick={() => onStatusChange(s.id, 'rejected')} disabled={actionLoading === s.id} className="px-2.5 py-1 rounded-lg bg-status-emergency/15 text-status-emergency text-[10px] font-bold hover:bg-status-emergency/25 transition-colors disabled:opacity-50">
                    {isRTL ? 'رفض' : 'Reject'}
                  </button>
                )}
                <button onClick={() => onDelete(s.id)} disabled={actionLoading === s.id} className="px-2.5 py-1 rounded-lg glass text-[var(--text-muted)] text-[10px] font-bold hover:text-status-emergency transition-colors disabled:opacity-50 flex items-center gap-1">
                  <Trash2 className="w-3 h-3" /> {isRTL ? 'حذف' : 'Delete'}
                </button>
                {actionLoading === s.id && <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-green-light" />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ===================== ADMIN CONVERSATIONS LIST ===================== */
function AdminConversationsList({ conversations, onOpen, onClose, actionLoading, isRTL }: {
  conversations: Conversation[];
  onOpen: (c: Conversation) => void;
  onClose: (id: string) => void;
  actionLoading: string | null;
  isRTL: boolean;
}) {
  const active = conversations.filter((c) => c.status === 'active');
  const closed = conversations.filter((c) => c.status !== 'active');

  const renderItem = (c: Conversation) => (
    <div key={c.id} className="glass-card p-3 flex items-center justify-between hover:border-brand-blue/40 transition-colors">
      <button onClick={() => onOpen(c)} className="flex-1 text-right min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${c.status === 'active' ? 'bg-status-open/20 text-status-open' : 'bg-[var(--border-subtle)] text-[var(--text-muted)]'}`}>
            {c.status === 'active' ? (isRTL ? 'مفتوحة' : 'Active') : (isRTL ? 'مغلقة' : 'Closed')}
          </span>
          {c.entity_name && <span className="text-[10px] text-brand-green-light font-bold">{c.entity_name}</span>}
        </div>
        <span className="font-cairo font-bold text-sm truncate block">{c.subject}</span>
        <p className="text-[10px] text-[var(--text-muted)] font-tajawal">{new Date(c.created_at).toLocaleString(isRTL ? 'ar-EG' : 'en-US')}</p>
      </button>
      {c.status === 'active' && (
        <button onClick={() => onClose(c.id)} disabled={actionLoading === c.id} className="px-2.5 py-1 rounded-lg glass text-[var(--text-muted)] text-[10px] font-bold hover:text-status-emergency transition-colors disabled:opacity-50 shrink-0">
          {actionLoading === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : (isRTL ? 'إغلاق' : 'Close')}
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-cairo font-bold text-sm mb-2 flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-status-open" />
          {isRTL ? 'محادثات مفتوحة' : 'Active Conversations'} ({active.length})
        </h4>
        {active.length === 0 ? (
          <p className="text-center text-sm font-tajawal text-[var(--text-muted)] py-4">{isRTL ? 'لا توجد محادثات مفتوحة' : 'No active conversations'}</p>
        ) : (
          <div className="space-y-2">{active.map(renderItem)}</div>
        )}
      </div>
      {closed.length > 0 && (
        <div>
          <h4 className="font-cairo font-bold text-sm mb-2 text-[var(--text-muted)]">{isRTL ? 'محادثات مغلقة' : 'Closed Conversations'} ({closed.length})</h4>
          <div className="space-y-2">{closed.slice(0, 10).map(renderItem)}</div>
        </div>
      )}
    </div>
  );
}

/* ===================== ADMIN CONVERSATION CHAT MODAL ===================== */
function AdminConversationChat({ conv, adminName, adminId, isRTL, onClose, onCloseConv, actionLoading }: {
  conv: Conversation;
  adminName: string;
  adminId: string | null;
  isRTL: boolean;
  onClose: () => void;
  onCloseConv: (id: string) => void;
  actionLoading: string | null;
}) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('conversation_messages')
        .select('id,conversation_id,sender_id,sender_name,sender_role,message,created_at')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: true });
      setMessages((data as ConversationMessage[]) || []);
      setLoading(false);
    })();

    const channel = supabase
      .channel(`admin_conv_${conv.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversation_messages', filter: `conversation_id=eq.${conv.id}` },
        (payload) => { setMessages((prev) => [...prev, payload.new as ConversationMessage]); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conv.id]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !adminId || sending) return;
    setSending(true);
    const msg = input.trim();
    setInput('');
    try {
      const { data } = await supabase.from('conversation_messages').insert({
        conversation_id: conv.id,
        sender_id: adminId,
        sender_name: adminName,
        sender_role: 'admin',
        message: msg,
      }).select().single();
      if (data) setMessages((prev) => [...prev, data as ConversationMessage]);
    } catch {
      showToast(isRTL ? 'فشل الإرسال' : 'Failed to send', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-card p-0 w-full max-w-md h-[75vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
          <div className="min-w-0">
            <h3 className="font-cairo font-bold text-sm flex items-center gap-2"><MessageCircle className="w-5 h-5 text-brand-blue-light" /> {conv.subject}</h3>
            {conv.entity_name && <p className="text-[10px] text-brand-green-light font-bold mt-0.5">{conv.entity_name}</p>}
          </div>
          <div className="flex items-center gap-2">
            {conv.status === 'active' && (
              <button onClick={() => onCloseConv(conv.id)} disabled={actionLoading === conv.id} className="px-2.5 py-1 rounded-lg glass text-[10px] font-bold hover:text-status-emergency transition-colors disabled:opacity-50">
                {actionLoading === conv.id ? <Loader2 className="w-3 h-3 animate-spin" /> : (isRTL ? 'إغلاق' : 'Close')}
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg glass"><X className="w-4 h-4" /></button>
          </div>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-brand-blue-light" /></div>
          ) : messages.length === 0 ? (
            <p className="text-center text-sm font-tajawal text-[var(--text-muted)] mt-8">{isRTL ? 'لا توجد رسائل' : 'No messages'}</p>
          ) : (
            messages.map((m) => {
              const isAdmin = m.sender_role === 'admin';
              return (
                <div key={m.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-xl p-2.5 ${isAdmin ? 'bg-brand-blue/20 text-[var(--text-bright)]' : 'glass text-[var(--text-soft)]'}`}>
                    {!isAdmin && <span className="text-[10px] font-bold text-brand-green-light block mb-0.5">{m.sender_name}</span>}
                    <p className="text-xs font-tajawal">{m.message}</p>
                    <p className="text-[9px] text-[var(--text-muted)] mt-0.5">{new Date(m.created_at).toLocaleTimeString(isRTL ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
        {conv.status === 'active' ? (
          <div className="p-3 border-t border-[var(--border-subtle)] flex gap-2">
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage()} className="flex-1 glass rounded-xl px-3 py-2 text-sm font-tajawal focus:outline-none focus:border-brand-blue" placeholder={isRTL ? 'اكتب رد...' : 'Type a reply...'} />
            <button onClick={sendMessage} disabled={sending || !input.trim()} className="btn-primary px-4 py-2 disabled:opacity-50"><Send className="w-4 h-4" /></button>
          </div>
        ) : (
          <div className="p-3 border-t border-[var(--border-subtle)] text-center text-xs font-tajawal text-[var(--text-muted)]">{isRTL ? 'المحادثة مغلقة' : 'Conversation is closed'}</div>
        )}
      </motion.div>
    </motion.div>
  );
}