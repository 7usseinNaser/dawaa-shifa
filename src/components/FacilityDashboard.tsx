import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Activity, TriangleAlert as AlertTriangle, Building2, Clock, Download, Flag, Heart, Chrome as Home, Info, LayoutGrid, Lightbulb, LogOut, Minus, Moon, Pencil, Pill, Plus, Settings, Stethoscope, Sun, Trash2, Users, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useLang } from '@/lib/i18n';
import { supabase, type ActivityLogEntry, type Department, type Facility, type FacilityWarning } from '@/lib/supabase';
import { showToast, ToastContainer, useToast } from '@/components/ui/Toast';
import { OccupancyBar, StatusBadge } from '@/components/ui/DashboardParts';
import { DonationModal } from '@/components/DonationModal';
import { FacilityPharmacy } from '@/components/FacilityPharmacy';

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

type Tab = 'home' | 'departments' | 'pharmacy' | 'reports' | 'info' | 'settings';
type FacilityStatus = 'open' | 'busy' | 'emergency' | 'closed';
type FacilityType = 'hospital' | 'clinic' | 'medical_point';

interface DeptForm {
  name: string;
  doctor_name: string;
  status: FacilityStatus;
  waiting_count: string;
  estimated_clear_time: string;
  avg_service_time_minutes: string;
  department_capacity: string;
}

const emptyDeptForm: DeptForm = {
  name: '',
  doctor_name: '',
  status: 'open',
  waiting_count: '0',
  estimated_clear_time: '',
  avg_service_time_minutes: '15',
  department_capacity: '20',
};

const STATUS_OPTIONS: FacilityStatus[] = ['open', 'busy', 'emergency', 'closed'];

const TYPE_OPTIONS: { value: FacilityType; ar: string; en: string }[] = [
  { value: 'hospital', ar: 'مستشفى', en: 'Hospital' },
  { value: 'clinic', ar: 'عيادة', en: 'Clinic' },
  { value: 'medical_point', ar: 'نقطة طبية', en: 'Medical point' },
];

const FREE_OPTIONS: { value: string; ar: string; en: string }[] = [
  { value: 'free', ar: 'مجاني', en: 'Free' },
  { value: 'paid', ar: 'مدفوع', en: 'Paid' },
  { value: 'nominal', ar: 'مدفوع بأسعار رمزية', en: 'Nominal fee' },
];

export default function FacilityDashboard({ theme, onToggleTheme }: { theme: 'dark' | 'light'; onToggleTheme: () => void }) {
  const { user, profile, signOut } = useAuth();
  const { t, lang } = useLang();
  const { toasts, remove } = useToast();

  const [tab, setTab] = useState<Tab>('home');
  const [facility, setFacility] = useState<Facility | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [activity, setActivity] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);

  // Setup form (no facility yet)
  const [setupForm, setSetupForm] = useState({
    name: '',
    type: 'hospital' as FacilityType,
    area: '',
    address: '',
    phone: '',
    pricing_type: 'free' as 'free' | 'paid' | 'nominal',
    max_capacity: '',
  });

  // Info form
  const [infoForm, setInfoForm] = useState({
    name: '',
    type: 'hospital' as FacilityType,
    area: '',
    address: '',
    phone: '',
    pricing_type: 'free' as 'free' | 'paid' | 'nominal',
    max_capacity: '',
  });

  // Department modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptForm, setDeptForm] = useState<DeptForm>(emptyDeptForm);
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [myReports, setMyReports] = useState<Array<{ id: string; type: 'bug' | 'suggestion'; title: string; status: string; created_at: string; admin_notes: string | null }>>([]);

  const isRTL = lang === 'ar';

  // ---- Load facility ----
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: facData } = await supabase
        .from('facilities')
        .select('id,owner_id,name,type,area,address,phone,overall_status,verified,approval_status,rejection_reason,deleted_at,lat,lng,is_free,pricing_type,max_capacity,facility_capacity,power_status,occupancy_rate,last_updated_at,created_at')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (cancelled) return;
      if (facData) {
        const f = facData as Facility;
        setFacility(f);
        setInfoForm({
          name: f.name,
          type: f.type,
          area: f.area,
          address: f.address,
          phone: f.phone,
          pricing_type: f.pricing_type || 'free',
          max_capacity: f.max_capacity ? String(f.max_capacity) : '',
        });
        await loadDepartments(f.id);
        await loadActivity(user.id);
        await loadMyReports(user.id);
      }
      setLoading(false);

      // Real-time subscription for department changes
      const channel = supabase
        .channel('departments_realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'departments' },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              setDepartments((prev) => [...prev, payload.new as Department]);
            } else if (payload.eventType === 'UPDATE') {
              setDepartments((prev) => prev.map((d) => d.id === (payload.new as Department).id ? payload.new as Department : d));
            } else if (payload.eventType === 'DELETE') {
              setDepartments((prev) => prev.filter((d) => d.id !== (payload.old as Department).id));
            }
          }
        )
        .subscribe();

      // Periodic background refetch every 2 minutes
      const refetchInterval = setInterval(() => {
        const fid = (facData as Facility)?.id;
        if (fid) {
          loadDepartments(fid);
        }
      }, 120000);

      return () => {
        cancelled = true;
        supabase.removeChannel(channel);
        clearInterval(refetchInterval);
      };
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function loadDepartments(facilityId: string) {
    const { data } = await supabase
      .from('departments')
      .select('id,facility_id,name,doctor_name,status,waiting_count,estimated_clear_time,avg_service_time_minutes,department_capacity,current_queue_count,open_time,close_time,last_updated')
      .eq('facility_id', facilityId)
      .order('name', { ascending: true });
    if (data) setDepartments(data as Department[]);
  }

  async function loadActivity(userId: string) {
    const { data } = await supabase
      .from('activity_log')
      .select('id,user_id,user_name,action,item,ts')
      .eq('user_id', userId)
      .order('ts', { ascending: false })
      .limit(10);
    if (data) setActivity(data as ActivityLogEntry[]);
  }

  async function loadMyReports(userId: string) {
    const [bugs, sugs] = await Promise.all([
      supabase.from('bug_reports').select('id,reporter_id,description,status,admin_notes,created_at').eq('reporter_id', userId).order('created_at', { ascending: false }),
      supabase.from('suggestions').select('id,user_id,title,description,status,admin_notes,created_at').eq('user_id', userId).order('created_at', { ascending: false }),
    ]);
    const reports: Array<{ id: string; type: 'bug' | 'suggestion'; title: string; status: string; created_at: string; admin_notes: string | null }> = [];
    if (bugs.data) bugs.data.forEach((b: { id: string; description: string; status: string; admin_notes: string | null; created_at: string }) => reports.push({ id: b.id, type: 'bug', title: b.description, status: b.status, created_at: b.created_at, admin_notes: b.admin_notes }));
    if (sugs.data) sugs.data.forEach((s: { id: string; title: string; status: string; admin_notes: string | null; created_at: string }) => reports.push({ id: s.id, type: 'suggestion', title: s.title, status: s.status, created_at: s.created_at, admin_notes: s.admin_notes }));
    reports.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setMyReports(reports);
  }

  async function logActivity(action: string, item: string) {
    if (!user) return;
    await supabase.from('activity_log').insert({
      user_id: user.id,
      user_name: profile?.display_name ?? user.email ?? (isRTL ? 'إدارة مرفق' : 'Facility admin'),
      action,
      item,
    });
    if (facility) await loadActivity(user.id);
  }

  // ---- Setup: create facility ----
  async function createFacility() {
    if (!user) return;
    if (
      !setupForm.name.trim() ||
      !setupForm.area.trim() ||
      !setupForm.address.trim() ||
      !setupForm.phone.trim()
    ) {
      showToast(isRTL ? 'يرجى ملء جميع الحقول' : 'Please fill all fields', 'error');
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from('facilities')
      .insert({
        owner_id: user.id,
        name: setupForm.name.trim(),
        type: setupForm.type,
        is_free: setupForm.pricing_type === 'free',
        pricing_type: setupForm.pricing_type,
        max_capacity: parseInt(setupForm.max_capacity) || 0,
        area: setupForm.area.trim(),
        address: setupForm.address.trim(),
        phone: setupForm.phone.trim(),
        lat: 0,
        lng: 0,
        overall_status: 'open',
      })
      .select('id,owner_id,name,type,area,address,phone,overall_status,verified,approval_status,rejection_reason,deleted_at,lat,lng,is_free,pricing_type,max_capacity,facility_capacity,power_status,occupancy_rate,last_updated_at,created_at')
      .single();
    setSaving(false);
    if (error) {
      console.error('[createFacility] Supabase error:', error.code, error.message, error.details, error.hint);
      showToast(isRTL ? `فشل إنشاء المرفق: ${error.message}` : `Failed to create facility: ${error.message}`, 'error');
      return;
    }
    const f = data as Facility;
    setFacility(f);
    setInfoForm({
      name: f.name,
      type: f.type,
      area: f.area,
      address: f.address,
      phone: f.phone,
      pricing_type: f.pricing_type || 'free',
      max_capacity: f.max_capacity ? String(f.max_capacity) : '',
    });
    showToast(isRTL ? 'تم إنشاء المرفق بنجاح' : 'Facility created successfully');
    await logActivity('create_facility', f.name);
  }

  // ---- Global status update ----
  async function updateOverallStatus(status: FacilityStatus) {
    if (!facility) return;
    setStatusSaving(true);
    const { error } = await supabase
      .from('facilities')
      .update({ overall_status: status })
      .eq('id', facility.id);
    setStatusSaving(false);
    if (error) {
      console.error('[updateOverallStatus] Supabase error:', error.code, error.message, error.details, error.hint);
      showToast(isRTL ? `فشل تحديث الحالة: ${error.message}` : `Failed to update status: ${error.message}`, 'error');
      return;
    }
    setFacility({ ...facility, overall_status: status });
    showToast(
      isRTL
        ? `تم تحديث حالة المرفق إلى: ${statusLabel(status)}`
        : `Facility status updated to: ${statusLabel(status)}`
    );
    await logActivity(`status_${status}`, facility.name);
  }

  function statusLabel(s: FacilityStatus): string {
    const map: Record<FacilityStatus, { ar: string; en: string }> = {
      open: { ar: 'متاح', en: 'Available' },
      busy: { ar: 'مزدحم', en: 'Busy' },
      emergency: { ar: 'طوارئ', en: 'Emergency' },
      closed: { ar: 'مغلق', en: 'Closed' },
    };
    return isRTL ? map[s].ar : map[s].en;
  }

  // ---- Resubmit after rejection ----
  async function resubmitForReview() {
    if (!facility) return;
    setSaving(true);
    const { error } = await supabase
      .from('facilities')
      .update({ approval_status: 'pending', resubmitted: true, resubmitted_at: new Date().toISOString() })
      .eq('id', facility.id);
    setSaving(false);
    if (error) {
      console.error('[resubmitForReview] Supabase error:', error.code, error.message, error.details, error.hint);
      showToast(isRTL ? `فشل إعادة الإرسال: ${error.message}` : `Failed to resubmit: ${error.message}`, 'error');
      return;
    }
    setFacility({ ...facility, approval_status: 'pending', resubmitted: true });
    showToast(isRTL ? 'تم إعادة إرسال المرفق للمراجعة' : 'Facility resubmitted for review');
    await logActivity('resubmit_facility', facility.name);
    // Notify admin
    await supabase.from('admin_alerts').insert({
      target_type: 'facility',
      target_id: facility.id,
      message: `${isRTL ? 'إعادة إرسال مرفق للمراجعة' : 'Facility resubmitted for review'}: ${facility.name}`,
      severity: 'info',
    });
  }

  // ---- Info save ----
  async function saveInfo() {
    if (!facility) return;
    if (
      !infoForm.name.trim() ||
      !infoForm.area.trim() ||
      !infoForm.address.trim() ||
      !infoForm.phone.trim()
    ) {
      showToast(isRTL ? 'يرجى ملء الحقول المطلوبة' : 'Please fill required fields', 'error');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('facilities')
      .update({
        name: infoForm.name.trim(),
        type: infoForm.type,
        is_free: infoForm.pricing_type === 'free',
        pricing_type: infoForm.pricing_type,
        max_capacity: parseInt(infoForm.max_capacity) || 0,
        area: infoForm.area.trim(),
        address: infoForm.address.trim(),
        phone: infoForm.phone.trim(),
      })
      .eq('id', facility.id);
    setSaving(false);
    if (error) {
      console.error('[saveInfo] Supabase error:', error.code, error.message, error.details, error.hint);
      showToast(isRTL ? `فشل حفظ المعلومات: ${error.message}` : `Failed to save info: ${error.message}`, 'error');
      return;
    }
    setFacility({
      ...facility,
      name: infoForm.name.trim(),
      type: infoForm.type,
      is_free: infoForm.pricing_type === 'free',
      pricing_type: infoForm.pricing_type,
      max_capacity: parseInt(infoForm.max_capacity) || 0,
      area: infoForm.area.trim(),
      address: infoForm.address.trim(),
      phone: infoForm.phone.trim(),
    });
    showToast(isRTL ? 'تم حفظ المعلومات' : 'Info saved successfully');
    await logActivity('update_info', infoForm.name);
  }

  // ---- Department modal ----
  function openAddModal() {
    setEditingDept(null);
    setDeptForm(emptyDeptForm);
    setModalOpen(true);
  }

  function openEditModal(dept: Department) {
    setEditingDept(dept);
    setDeptForm({
      name: dept.name,
      doctor_name: dept.doctor_name,
      status: dept.status,
      waiting_count: String(dept.waiting_count),
      estimated_clear_time: dept.estimated_clear_time,
      avg_service_time_minutes: String(dept.avg_service_time_minutes ?? 15),
      department_capacity: String(dept.department_capacity ?? 20),
    });
    setModalOpen(true);
  }

  async function saveDept() {
    if (!facility) return;
    if (!deptForm.name.trim()) {
      showToast(isRTL ? 'اسم القسم مطلوب' : 'Department name is required', 'error');
      return;
    }
    const waiting = parseInt(deptForm.waiting_count, 10) || 0;

    setSaving(true);
    if (editingDept) {
      const { error } = await supabase
        .from('departments')
        .update({
          name: deptForm.name.trim(),
          doctor_name: deptForm.doctor_name.trim(),
          status: deptForm.status,
          waiting_count: waiting,
          estimated_clear_time: deptForm.estimated_clear_time.trim(),
          avg_service_time_minutes: parseInt(deptForm.avg_service_time_minutes) || 15,
          department_capacity: parseInt(deptForm.department_capacity) || 20,
          current_queue_count: waiting,
          last_updated: new Date().toISOString(),
        })
        .eq('id', editingDept.id);
      setSaving(false);
      if (error) {
        console.error('[saveDept/update] Supabase error:', error.code, error.message, error.details, error.hint);
        showToast(isRTL ? `فشل تحديث القسم: ${error.message}` : `Failed to update department: ${error.message}`, 'error');
        return;
      }
      showToast(isRTL ? 'تم تحديث القسم' : 'Department updated');
      await logActivity('edit_department', deptForm.name);
    } else {
      const { error } = await supabase.from('departments').insert({
        facility_id: facility.id,
        name: deptForm.name.trim(),
        doctor_name: deptForm.doctor_name.trim(),
        status: deptForm.status,
        waiting_count: waiting,
        estimated_clear_time: deptForm.estimated_clear_time.trim(),
        avg_service_time_minutes: parseInt(deptForm.avg_service_time_minutes) || 15,
        department_capacity: parseInt(deptForm.department_capacity) || 20,
        current_queue_count: waiting,
        open_time: '',
        close_time: '',
        last_updated: new Date().toISOString(),
      });
      setSaving(false);
      if (error) {
        console.error('[saveDept/insert] Supabase error:', error.code, error.message, error.details, error.hint);
        showToast(isRTL ? `فشل إضافة القسم: ${error.message}` : `Failed to add department: ${error.message}`, 'error');
        return;
      }
      showToast(isRTL ? 'تم إضافة القسم' : 'Department added');
      await logActivity('add_department', deptForm.name);
    }
    setModalOpen(false);
    await loadDepartments(facility.id);
  }

  async function confirmDelete() {
    if (!deleteTarget || !facility) return;
    setSaving(true);
    const { error } = await supabase.from('departments').delete().eq('id', deleteTarget.id);
    setSaving(false);
    if (error) {
      console.error('[confirmDelete] Supabase error:', error.code, error.message, error.details, error.hint);
      showToast(isRTL ? `فشل الحذف: ${error.message}` : `Failed to delete: ${error.message}`, 'error');
      return;
    }
    showToast(isRTL ? 'تم حذف القسم' : 'Department deleted');
    await logActivity('delete_department', deleteTarget.name);
    setDeleteTarget(null);
    await loadDepartments(facility.id);
  }

  // ---- Derived stats ----
  const stats = useMemo(() => {
    const totalDepts = departments.length;
    const emergencyDepts = departments.filter((d) => d.status === 'emergency').length;
    const totalWaiting = departments.reduce((s, d) => s + d.waiting_count, 0);
    const maxCap = facility?.max_capacity || 0;
    const occupancy = maxCap > 0 ? Math.min(100, Math.round((totalWaiting / maxCap) * 100)) : 0;
    return { totalDepts, emergencyDepts, totalWaiting, occupancy, maxCap };
  }, [departments, facility]);

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-dark)] px-6 py-24">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 border-2 border-brand-green border-t-transparent rounded-full"
        />
      </div>
    );
  }

  // ---- Setup (no facility) ----
  if (!facility) {
    return (
      <div className="min-h-screen bg-[var(--bg-dark)] px-6 py-24" dir={isRTL ? 'rtl' : 'ltr'}>
        <ToastContainer toasts={toasts} onRemove={remove} />
        <div className="max-w-xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="glass-card p-8"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-brand-green/15 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-brand-green" />
              </div>
              <h1 className="text-2xl font-bold text-gradient-green">{t('fac.setup')}</h1>
            </div>
            <p className="text-[var(--text-soft)] mb-6">{t('fac.setupDesc')}</p>

            <div className="space-y-4">
              <SetupField
                label={t('fac.facName')}
                value={setupForm.name}
                onChange={(v) => setSetupForm({ ...setupForm, name: v })}
                placeholder={isRTL ? 'مستشفى الشفاء' : 'Al-Shifa Hospital'}
              />
              <SelectField
                label={t('fac.type')}
                value={setupForm.type}
                onChange={(v) => setSetupForm({ ...setupForm, type: v as FacilityType })}
                options={TYPE_OPTIONS.map((o) => ({ value: o.value, label: isRTL ? o.ar : o.en }))}
              />
              <SetupField
                label={t('pharm.area')}
                value={setupForm.area}
                onChange={(v) => setSetupForm({ ...setupForm, area: v })}
                placeholder={isRTL ? 'غزة' : 'Gaza'}
              />
              <SetupField
                label={t('pharm.address')}
                value={setupForm.address}
                onChange={(v) => setSetupForm({ ...setupForm, address: v })}
                placeholder={isRTL ? 'شارع الجلاء' : 'Jalaa St'}
              />
              <SetupField
                label={t('auth.phone')}
                value={setupForm.phone}
                onChange={(v) => setSetupForm({ ...setupForm, phone: v })}
                placeholder="08..."
              />
              <SelectField
                label={isRTL ? 'نوع الخدمة' : 'Service type'}
                value={setupForm.pricing_type}
                onChange={(v) => setSetupForm({ ...setupForm, pricing_type: v as 'free' | 'paid' | 'nominal' })}
                options={FREE_OPTIONS.map((o) => ({ value: o.value, label: isRTL ? o.ar : o.en }))}
              />
              <SetupField
                label={isRTL ? 'السعة الاستيعابية القصوى' : 'Max Capacity'}
                value={setupForm.max_capacity}
                onChange={(v) => setSetupForm({ ...setupForm, max_capacity: v })}
                placeholder="0"
                type="number"
              />
            </div>

            <button
              onClick={createFacility}
              disabled={saving}
              className="btn-primary w-full mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (isRTL ? 'جاري الإنشاء...' : 'Creating...') : t('fac.create')}
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: typeof Home }[] = [
    { id: 'home', label: t('nav.home'), icon: Home },
    { id: 'departments', label: t('fac.departments'), icon: LayoutGrid },
    { id: 'pharmacy', label: isRTL ? 'الصيدلية' : 'Pharmacy', icon: Pill },
    { id: 'reports', label: isRTL ? 'بلاغاتي' : 'My Reports', icon: Flag },
    { id: 'info', label: t('fac.info'), icon: Info },
    { id: 'settings', label: isRTL ? 'الإعدادات' : 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-dark)] text-[var(--text-main)]" dir={isRTL ? 'rtl' : 'ltr'}>
      <ToastContainer toasts={toasts} onRemove={remove} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex gap-6">
          {/* Sidebar (desktop) */}
          <aside className="hidden md:flex flex-col w-64 shrink-0">
            <div className="glass-card p-5 sticky top-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-11 h-11 rounded-2xl bg-brand-green/15 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-brand-green" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-[var(--text-muted)]">{t('fac.title')}</p>
                  <p className="font-bold truncate">{facility.name}</p>
                </div>
              </div>

              <nav className="space-y-1">
                {tabs.map((tb) => {
                  const Icon = tb.icon;
                  const active = tab === tb.id;
                  return (
                    <button
                      key={tb.id}
                      onClick={() => setTab(tb.id)}
                      className={`relative w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold transition-all ${
                        active
                          ? 'bg-brand-green/15 text-brand-green'
                          : 'text-[var(--text-soft)] hover:bg-white/5'
                      }`}
                    >
                      {active && (
                        <motion.div
                          layoutId="sidebar-active"
                          className="absolute inset-y-2 right-0 w-1 rounded-full bg-brand-green"
                          transition={{ duration: 0.3, ease: EASE }}
                        />
                      )}
                      <Icon className="w-5 h-5 shrink-0" />
                      <span>{tb.label}</span>
                    </button>
                  );
                })}
              </nav>

              <div className="mt-6 pt-6 border-t border-[var(--border-subtle)]">
                <button
                  onClick={() => setShowDonationModal(true)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-brand-green/10 to-brand-blue/10 hover:from-brand-green/20 hover:to-brand-blue/20 transition-all border border-brand-green/20"
                >
                  <Heart className="w-5 h-5 text-brand-green-light" />
                  <div className="text-right">
                    <div className="font-bold text-sm">{isRTL ? 'ساهم في إنقاذ الأرواح' : 'Help Save Lives'}</div>
                    <div className="text-[10px] text-[var(--text-muted)]">{isRTL ? 'تبرع عبر واتساب' : 'Donate via WhatsApp'}</div>
                  </div>
                </button>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0">
            {/* Mobile top nav */}
            <div className="md:hidden mb-6">
              <div className="glass-card p-2 flex items-center gap-1">
                {tabs.map((tb) => {
                  const Icon = tb.icon;
                  const active = tab === tb.id;
                  return (
                    <button
                      key={tb.id}
                      onClick={() => setTab(tb.id)}
                      className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl text-xs font-bold transition-all ${
                        active ? 'bg-brand-green/15 text-brand-green' : 'text-[var(--text-muted)]'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{tb.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <AnimatePresence mode="wait">
              {tab === 'home' && (
                <motion.div
                  key="home"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.35, ease: EASE }}
                  className="space-y-6"
                >
                  {/* Welcome banner */}
                  <div className="glass-card p-6 border-glow">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-[var(--text-muted)] text-sm">{t('dash.welcome')}</p>
                        <h1 className="text-2xl sm:text-3xl font-bold mt-1">
                          {profile?.display_name ?? user?.email ?? (isRTL ? 'إدارة مرفق' : 'Facility admin')}
                        </h1>
                        <p className="text-[var(--text-soft)] mt-2 flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-brand-green" />
                          {facility.name} · {facility.area}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5">
                          <LayoutGrid className="w-5 h-5 text-brand-blue-light" />
                          <span className="font-bold">{stats.totalDepts}</span>
                          <span className="text-sm text-[var(--text-muted)]">{t('fac.departments')}</span>
                        </div>
                        <div className="flex items-center gap-2 w-44">
                          <OccupancyBar value={stats.occupancy} />
                          <span className="text-xs font-bold text-[var(--text-soft)]">{stats.occupancy}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Global status control card */}
                  <div className="glass-card p-6 border border-red-500/40 bg-red-500/10">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                        <div>
                          <p className="text-sm text-[var(--text-muted)]">{t('fac.globalStatus')}</p>
                          <p className="font-bold text-red-200">{statusLabel(facility.overall_status)}</p>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {STATUS_OPTIONS.map((s) => {
                        const active = facility.overall_status === s;
                        const colorCls =
                          s === 'open'
                            ? 'bg-status-open text-white'
                            : s === 'busy'
                            ? 'bg-status-busy text-white'
                            : s === 'emergency'
                            ? 'bg-status-emergency text-white'
                            : 'bg-status-closed text-white';
                        return (
                          <button
                            key={s}
                            onClick={() => updateOverallStatus(s)}
                            disabled={statusSaving || active}
                            className={`px-4 py-3 rounded-2xl font-bold transition-all disabled:opacity-60 ${
                              active ? colorCls : 'bg-white/5 text-[var(--text-soft)] hover:bg-white/10'
                            }`}
                          >
                            {statusLabel(s)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Stat cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                      icon={LayoutGrid}
                      label={t('fac.totalDepts')}
                      value={String(stats.totalDepts)}
                      color="blue"
                    />
                    <StatCard
                      icon={AlertTriangle}
                      label={t('fac.emergencyDepts')}
                      value={String(stats.emergencyDepts)}
                      color="red"
                    />
                    <StatCard
                      icon={Users}
                      label={t('fac.totalWaiting')}
                      value={String(stats.totalWaiting)}
                      color="green"
                    />
                    <StatCard
                      icon={Activity}
                      label={t('fac.occupancy')}
                      value={`${stats.occupancy}%`}
                      color="gray"
                    />
                  </div>

                  {/* Operational tips card */}
                  <div className="glass-card p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Lightbulb className="w-5 h-5 text-amber-400" />
                      <h2 className="font-bold text-lg">
                        {isRTL ? 'نصائح تشغيلية' : 'Operational tips'}
                      </h2>
                    </div>
                    <ul className="space-y-3 text-sm text-[var(--text-soft)]">
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-green mt-2 shrink-0" />
                        <span>
                          {isRTL
                            ? 'حدّث حالة كل قسم فور تغيّر الواقع ليصل المعلومة للمواطن بدقة.'
                            : 'Update each department status as soon as reality changes so citizens get accurate info.'}
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-green mt-2 shrink-0" />
                        <span>
                          {isRTL
                            ? 'فعّل حالة "طوارئ" عند الازدحام الشديد لتنبيه المرافق الأخرى لتوجيه الحالات.'
                            : 'Activate "Emergency" status during heavy crowding to alert other facilities to redirect cases.'}
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-green mt-2 shrink-0" />
                        <span>
                          {isRTL
                            ? 'حدّث وقت الفراغ المتوقع ليساعد المرضى على تقدير انتظارهم.'
                            : 'Update estimated clear time to help patients gauge their wait.'}
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-green mt-2 shrink-0" />
                        <span>
                          {isRTL
                            ? 'أغلق المرفق ككل عبر "مغلق" عند انتهاء الدوام لتفادي قدوم حالات بلا جدوى.'
                            : 'Close the whole facility via "Closed" at end of shift to avoid futile arrivals.'}
                        </span>
                      </li>
                    </ul>
                  </div>

                  {/* Warnings section */}
                  <FacilityWarnings facilityId={facility.id} isRTL={isRTL} />

                  {/* Recent activity */}
                  <div className="glass-card p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Activity className="w-5 h-5 text-brand-green" />
                      <h2 className="font-bold text-lg">{t('pharm.recentActivity')}</h2>
                    </div>
                    {activity.length === 0 ? (
                      <p className="text-sm text-[var(--text-muted)] py-6 text-center">
                        {isRTL ? 'لا يوجد نشاط بعد' : 'No activity yet'}
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {activity.map((a) => (
                          <li
                            key={a.id}
                            className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-white/5"
                          >
                            <div className="min-w-0">
                              <p className="font-semibold text-sm truncate">{a.item}</p>
                              <p className="text-xs text-[var(--text-muted)]">{a.action}</p>
                            </div>
                            <span className="text-xs text-[var(--text-muted)] shrink-0">
                              {new Date(a.ts).toLocaleString(isRTL ? 'ar' : 'en')}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </motion.div>
              )}

              {tab === 'departments' && (
                <motion.div
                  key="departments"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.35, ease: EASE }}
                  className="space-y-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h1 className="text-2xl font-bold text-gradient-green">{t('fac.departments')}</h1>
                    <button
                      onClick={openAddModal}
                      className="btn-primary flex items-center gap-2 !py-2.5 !px-4 text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{isRTL ? 'إضافة قسم' : 'Add department'}</span>
                    </button>
                  </div>

                  {/* Department list */}
                  {departments.length === 0 ? (
                    <div className="glass-card p-10 text-center">
                      <LayoutGrid className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3" />
                      <p className="text-[var(--text-muted)]">{t('fac.noDepts')}</p>
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {departments.map((d, i) => (
                        <motion.div
                          key={d.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: i * 0.04, ease: EASE }}
                          className="glass-card p-5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="font-bold text-gradient-green truncate">{d.name}</h3>
                              <p className="text-sm text-[var(--text-muted)] mt-0.5 flex items-center gap-1.5 truncate">
                                <Stethoscope className="w-3.5 h-3.5 shrink-0" />
                                {d.doctor_name || (isRTL ? 'بدون طبيب' : 'No doctor')}
                              </p>
                            </div>
                            <StatusBadge status={d.status} />
                          </div>

                          <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-brand-blue-light" />
                              <span className="text-[var(--text-muted)]">{t('dash.waiting')}:</span>
                              <span className="font-bold">{d.waiting_count}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-amber-400" />
                              <span className="text-[var(--text-muted)]">{t('dash.estClear')}:</span>
                              <span className="font-bold truncate">
                                {d.estimated_clear_time || '—'}
                              </span>
                            </div>
                          </div>

                          {/* Wait-time badge */}
                          {(() => {
                            const queue = d.current_queue_count ?? d.waiting_count ?? 0;
                            const serviceTime = d.avg_service_time_minutes ?? 15;
                            const capacity = d.department_capacity ?? 20;
                            const waitMin = queue * serviceTime;
                            const occPct = capacity > 0 ? Math.min(100, Math.round((queue / capacity) * 100)) : 0;
                            const waitLevel = queue === 0 ? 'none' : waitMin < 15 ? 'green' : waitMin <= 45 ? 'yellow' : 'red';
                            const levelClasses: Record<string, string> = {
                              green: 'bg-status-open/20 text-status-open border-status-open/40',
                              yellow: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
                              red: 'bg-status-emergency/20 text-status-emergency border-status-emergency/40',
                              none: 'bg-status-open/20 text-status-open border-status-open/40',
                            };
                            return (
                              <div className={`mt-3 rounded-xl border px-3 py-2 text-xs font-bold ${levelClasses[waitLevel]}`}>
                                {queue === 0
                                  ? (isRTL ? 'دخول مباشر — لا يوجد انتظار' : 'Direct entry — no wait')
                                  : (isRTL ? `${waitMin} دقيقة انتظار — إشغال ${occPct}%` : `${waitMin} min wait — ${occPct}% occupancy`)}
                              </div>
                            );
                          })()}

                          {/* Queue management controls */}
                          <div className="flex items-center gap-2 mt-3">
                            <span className="text-xs text-[var(--text-muted)] font-tajawal">{isRTL ? 'تعديل الطابور:' : 'Adjust queue:'}</span>
                            <button
                              onClick={async () => {
                                const next = Math.max(0, (d.current_queue_count ?? d.waiting_count) - 1);
                                await supabase.from('departments').update({ current_queue_count: next, waiting_count: next, last_updated: new Date().toISOString() }).eq('id', d.id);
                                setDepartments((prev) => prev.map((x) => x.id === d.id ? { ...x, current_queue_count: next, waiting_count: next } : x));
                              }}
                              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-red-500/15 flex items-center justify-center transition-colors"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="font-bold text-sm w-8 text-center">{d.current_queue_count ?? d.waiting_count}</span>
                            <button
                              onClick={async () => {
                                const next = (d.current_queue_count ?? d.waiting_count) + 1;
                                await supabase.from('departments').update({ current_queue_count: next, waiting_count: next, last_updated: new Date().toISOString() }).eq('id', d.id);
                                setDepartments((prev) => prev.map((x) => x.id === d.id ? { ...x, current_queue_count: next, waiting_count: next } : x));
                              }}
                              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-brand-green/15 flex items-center justify-center transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[var(--border-subtle)]">
                            <button
                              onClick={() => openEditModal(d)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-brand-green/15 text-sm font-semibold transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                              {t('pharm.edit')}
                            </button>
                            <button
                              onClick={() => setDeleteTarget(d)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-red-500/15 text-sm font-semibold transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                              {t('pharm.delete')}
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {tab === 'reports' && (
                <motion.div key="reports" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.35, ease: EASE }} className="space-y-3">
                  <h1 className="text-2xl font-bold text-gradient-blue">{isRTL ? 'بلاغاتي' : 'My Reports'}</h1>
                  {myReports.length === 0 ? (
                    <div className="glass-card p-8 text-center">
                      <Flag className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3" />
                      <p className="text-sm text-[var(--text-muted)] font-tajawal">{isRTL ? 'لم ترسل أي بلاغات أو اقتراحات بعد' : 'You have not submitted any reports or suggestions yet'}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {myReports.map((r) => (
                        <div key={`${r.type}-${r.id}`} className="glass-card p-4">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${r.type === 'bug' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                {r.type === 'bug' ? (isRTL ? 'بلاغ' : 'Bug') : (isRTL ? 'اقتراح' : 'Suggestion')}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                r.status === 'open' ? 'bg-blue-500/20 text-blue-400' :
                                r.status === 'resolved' || r.status === 'implemented' ? 'bg-green-500/20 text-green-400' :
                                r.status === 'dismissed' || r.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                                'bg-amber-500/20 text-amber-400'
                              }`}>
                                {r.status === 'open' ? (isRTL ? 'مفتوح' : 'Open') :
                                 r.status === 'resolved' ? (isRTL ? 'تم الحل' : 'Resolved') :
                                 r.status === 'implemented' ? (isRTL ? 'تم التنفيذ' : 'Implemented') :
                                 r.status === 'reviewing' ? (isRTL ? 'قيد المراجعة' : 'Reviewing') :
                                 r.status === 'dismissed' ? (isRTL ? 'تم رفضه' : 'Dismissed') :
                                 r.status === 'rejected' ? (isRTL ? 'مرفوض' : 'Rejected') : r.status}
                              </span>
                            </div>
                            <span className="text-[10px] text-[var(--text-muted)]">{new Date(r.created_at).toLocaleDateString(isRTL ? 'ar' : 'en')}</span>
                          </div>
                          <p className="text-sm font-tajawal text-[var(--text-soft)] line-clamp-2">{r.title}</p>
                          {r.admin_notes && (
                            <p className="text-xs text-[var(--text-muted)] mt-2 p-2 rounded-lg bg-white/5">
                              <span className="font-bold">{isRTL ? 'ملاحظة الأدمن: ' : 'Admin note: '}</span>{r.admin_notes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {tab === 'info' && (
                <motion.div
                  key="info"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.35, ease: EASE }}
                  className="space-y-5"
                >
                  <h1 className="text-2xl font-bold text-gradient-green">{t('fac.info')}</h1>
                  <div className="glass-card p-6 max-w-2xl">
                    <div className="space-y-4">
                      <SetupField
                        label={t('fac.facName')}
                        value={infoForm.name}
                        onChange={(v) => setInfoForm({ ...infoForm, name: v })}
                      />
                      <SelectField
                        label={t('fac.type')}
                        value={infoForm.type}
                        onChange={(v) => setInfoForm({ ...infoForm, type: v as FacilityType })}
                        options={TYPE_OPTIONS.map((o) => ({ value: o.value, label: isRTL ? o.ar : o.en }))}
                      />
                      <SetupField
                        label={t('pharm.area')}
                        value={infoForm.area}
                        onChange={(v) => setInfoForm({ ...infoForm, area: v })}
                      />
                      <SetupField
                        label={t('pharm.address')}
                        value={infoForm.address}
                        onChange={(v) => setInfoForm({ ...infoForm, address: v })}
                      />
                      <SetupField
                        label={t('auth.phone')}
                        value={infoForm.phone}
                        onChange={(v) => setInfoForm({ ...infoForm, phone: v })}
                      />
                      <SelectField
                        label={isRTL ? 'نوع الخدمة' : 'Service type'}
                        value={infoForm.pricing_type}
                        onChange={(v) => setInfoForm({ ...infoForm, pricing_type: v as 'free' | 'paid' | 'nominal' })}
                        options={FREE_OPTIONS.map((o) => ({ value: o.value, label: isRTL ? o.ar : o.en }))}
                      />
                      <SetupField
                        label={isRTL ? 'السعة الاستيعابية القصوى' : 'Max Capacity'}
                        value={infoForm.max_capacity}
                        onChange={(v) => setInfoForm({ ...infoForm, max_capacity: v })}
                        placeholder="0"
                        type="number"
                      />
                    </div>
                    <button
                      onClick={saveInfo}
                      disabled={saving}
                      className="btn-primary mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : t('pharm.save')}
                    </button>
                  </div>
                </motion.div>
              )}

              {tab === 'pharmacy' && (
                <motion.div
                  key="pharmacy"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.35, ease: EASE }}
                  className="space-y-5"
                >
                  <FacilityPharmacy
                    facilityId={facility.id}
                    facilityName={facility.name}
                    facilityPhone={facility.phone}
                    facilityArea={facility.area}
                    facilityAddress={facility.address}
                    isRTL={isRTL}
                  />
                </motion.div>
              )}

              {tab === 'settings' && (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.35, ease: EASE }}
                  className="space-y-5 max-w-2xl"
                >
                  <h1 className="text-2xl font-bold text-gradient-green">{isRTL ? 'الإعدادات' : 'Settings'}</h1>

                  {/* Profile card */}
                  <div className="glass-card p-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-green to-brand-blue flex items-center justify-center font-cairo font-black text-2xl text-white mx-auto mb-3">
                      {profile?.display_name?.charAt(0) || 'F'}
                    </div>
                    <h3 className="font-cairo font-bold text-lg">{profile?.display_name}</h3>
                    <p className="text-sm text-[var(--text-muted)] font-tajawal mt-1">{profile?.phone || user?.email || '—'}</p>
                    <span className="inline-block mt-2 px-3 py-1 rounded-full bg-brand-blue/20 text-brand-blue-light text-xs font-bold">{t('auth.facilityAdmin')}</span>
                  </div>

                  {/* Theme toggle */}
                  <div className="glass-card p-5 space-y-4">
                    <h3 className="font-cairo font-bold text-sm flex items-center gap-2"><Settings className="w-4 h-4 text-brand-green" /> {isRTL ? 'المظهر' : 'Appearance'}</h3>
                    <button onClick={onToggleTheme} className="w-full flex items-center justify-between">
                      <span className="font-tajawal text-sm flex items-center gap-2">
                        {theme === 'dark' ? <Moon className="w-4 h-4 text-brand-blue-light" /> : <Sun className="w-4 h-4 text-amber-400" />}
                        {theme === 'dark' ? (isRTL ? 'الوضع الداكن' : 'Dark mode') : (isRTL ? 'الوضع الفاتح' : 'Light mode')}
                      </span>
                      <span className={`w-10 h-6 rounded-full transition-colors relative ${theme === 'dark' ? 'bg-brand-green' : 'bg-[var(--border-subtle)]'}`}>
                        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${theme === 'dark' ? 'left-0.5' : 'right-0.5'}`} />
                      </span>
                    </button>
                  </div>

                  {/* Export backup */}
                  <button
                    onClick={async () => {
                      try {
                        const [{ data: fac }, { data: depts }] = await Promise.all([
                          supabase.from('facilities').select('id,owner_id,name,type,area,address,phone,overall_status,verified,approval_status,rejection_reason,deleted_at,lat,lng,is_free,pricing_type,max_capacity,facility_capacity,power_status,occupancy_rate,last_updated_at,created_at').eq('owner_id', user?.id).maybeSingle(),
                          supabase.from('departments').select('id,facility_id,name,doctor_name,status,waiting_count,estimated_clear_time,avg_service_time_minutes,department_capacity,current_queue_count,open_time,close_time,last_updated').eq('facility_id', facility?.id),
                        ]);
                        const backup = {
                          exportDate: new Date().toISOString(),
                          facility: fac,
                          departments: depts,
                        };
                        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `facility-backup-${Date.now()}.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                        showToast(isRTL ? 'تم تصدير النسخة الاحتياطية' : 'Backup exported');
                      } catch {
                        showToast(isRTL ? 'فشل التصدير' : 'Export failed', 'error');
                      }
                    }}
                    className="w-full btn-secondary text-sm flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" /> {isRTL ? 'تصدير نسخة احتياطية (JSON)' : 'Export Backup (JSON)'}
                  </button>

                  {/* Logout */}
                  <button onClick={signOut} className="w-full btn-secondary text-sm flex items-center justify-center gap-2 text-status-emergency">
                    <LogOut className="w-4 h-4" /> {t('nav.logout')}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>
      </div>

      {/* Add/Edit department modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25, ease: EASE }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold">
                  {editingDept ? t('pharm.edit') : isRTL ? 'إضافة قسم' : 'Add department'}
                </h2>
                <button
                  onClick={() => setModalOpen(false)}
                  className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <SetupField
                  label={t('fac.deptName')}
                  value={deptForm.name}
                  onChange={(v) => setDeptForm({ ...deptForm, name: v })}
                  placeholder={isRTL ? 'قسم الطوارئ' : 'Emergency dept'}
                />
                <SetupField
                  label={t('fac.deptDoctor')}
                  value={deptForm.doctor_name}
                  onChange={(v) => setDeptForm({ ...deptForm, doctor_name: v })}
                  placeholder={isRTL ? 'د. أحمد' : 'Dr. Ahmad'}
                />
                <SelectField
                  label={t('fac.deptStatus')}
                  {/* Back to site */}
                  <button onClick={() => { window.location.hash = ''; }} className="w-full btn-secondary text-sm flex items-center justify-center gap-2 text-brand-green">
                    <Home className="w-4 h-4" /> {isRTL ? 'العودة إلى الموقع' : 'Back to Site'}
                  </button>

                  value={deptForm.status}
                  onChange={(v) => setDeptForm({ ...deptForm, status: v as FacilityStatus })}
                  options={STATUS_OPTIONS.map((s) => ({ value: s, label: statusLabel(s) }))}
                />
                <div className="grid grid-cols-2 gap-3">
                  <SetupField
                    label={t('fac.deptWaiting')}
                    value={deptForm.waiting_count}
                    onChange={(v) => setDeptForm({ ...deptForm, waiting_count: v })}
                    placeholder="0"
                    type="number"
                  />
                  <SetupField
                    label={t('fac.deptClearTime')}
                    value={deptForm.estimated_clear_time}
                    onChange={(v) => setDeptForm({ ...deptForm, estimated_clear_time: v })}
                    placeholder={isRTL ? '30 د' : '30 min'}
                  />
                  <SetupField
                    label={isRTL ? 'متوسط وقت الخدمة (دقيقة)' : 'Avg service time (min)'}
                    value={deptForm.avg_service_time_minutes}
                    onChange={(v) => setDeptForm({ ...deptForm, avg_service_time_minutes: v })}
                    placeholder="15"
                    type="number"
                  />
                  <SetupField
                    label={isRTL ? 'سعة القسم (عدد أشخاص)' : 'Department capacity (people)'}
                    value={deptForm.department_capacity}
                    onChange={(v) => setDeptForm({ ...deptForm, department_capacity: v })}
                    placeholder="20"
                    type="number"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setModalOpen(false)} className="btn-secondary flex-1">
                  {t('pharm.cancel')}
                </button>
                <button
                  onClick={saveDept}
                  disabled={saving}
                  className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (isRTL ? 'جاري...' : 'Saving...') : t('pharm.save')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Donation Modal */}
      <DonationModal open={showDonationModal} onClose={() => setShowDonationModal(false)} />

      {/* Delete confirmation */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setDeleteTarget(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25, ease: EASE }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card p-6 w-full max-w-sm text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-red-500/15 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-7 h-7 text-red-400" />
              </div>
              <p className="font-bold mb-1">{t('pharm.confirmDelete')}</p>
              <p className="text-sm text-[var(--text-muted)] mb-5">{deleteTarget.name}</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteTarget(null)} className="btn-secondary flex-1">
                  {t('pharm.cancel')}
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={saving}
                  className="flex-1 px-6 py-3.5 rounded-full font-bold bg-red-500 text-white hover:bg-red-600 transition-all disabled:opacity-50"
                >
                  {saving ? (isRTL ? 'جاري...' : 'Deleting...') : t('pharm.delete')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---- Sub-components ----

function SetupField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-[var(--text-soft)] mb-1.5">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full glass rounded-2xl px-4 py-3 bg-transparent outline-none focus:border-brand-green transition-colors placeholder:text-[var(--text-muted)]"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-[var(--text-soft)] mb-1.5">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full glass rounded-2xl px-4 py-3 bg-[var(--bg-dark)] outline-none focus:border-brand-green transition-colors"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-[var(--bg-dark)] text-[var(--text-main)]">
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function FacilityWarnings({ facilityId, isRTL }: { facilityId: string; isRTL: boolean }) {
  const [warnings, setWarnings] = useState<FacilityWarning[]>([]);
  useEffect(() => {
    supabase.from('facility_warnings')
      .select('*')
      .eq('target_type', 'facility')
      .eq('target_id', facilityId)
      .order('created_at', { ascending: false })
      .then(({ data }) => setWarnings((data || []) as FacilityWarning[]));
  }, [facilityId]);

  const active = warnings.filter((w) => !w.acknowledged_at && (!w.expires_at || new Date(w.expires_at) > new Date()));
  if (warnings.length === 0) return null;

  return (
    <div className="glass-card p-4">
      <h3 className="font-cairo font-bold text-sm mb-3 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-400" />
        {isRTL ? 'الإنذارات' : 'Warnings'} ({active.length} {isRTL ? 'نشط' : 'active'})
      </h3>
      <div className="space-y-2 max-h-40 overflow-y-auto">
        {warnings.map((w) => {
          const isActive = !w.acknowledged_at && (!w.expires_at || new Date(w.expires_at) > new Date());
          return (
            <div key={w.id} className={`glass rounded-xl p-3 ${isActive ? 'border-l-2 border-amber-400' : 'opacity-50'}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${w.severity === 'emergency' ? 'bg-status-emergency/20 text-status-emergency' : w.severity === 'warning' ? 'bg-amber-400/20 text-amber-400' : 'bg-brand-blue/20 text-brand-blue-light'}`}>
                  {w.severity === 'emergency' ? (isRTL ? 'طوارئ' : 'Emergency') : w.severity === 'warning' ? (isRTL ? 'تحذير' : 'Warning') : (isRTL ? 'معلومة' : 'Info')}
                </span>
                {w.duration_type && w.duration_type !== 'permanent' && (
                  <span className="text-[10px] text-amber-400 font-tajawal flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" />
                    {w.duration_type === 'custom' && w.expires_at
                      ? `${isRTL ? 'حتى' : 'Until'} ${new Date(w.expires_at).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US')}`
                      : w.duration_type === '12h' ? (isRTL ? '12 ساعة' : '12 hours')
                      : w.duration_type === '24h' ? (isRTL ? '24 ساعة' : '24 hours')
                      : w.duration_type}
                  </span>
                )}
                {w.acknowledged_at && <span className="text-[10px] text-status-open font-bold">{isRTL ? 'تم الإقرار' : 'Acknowledged'}</span>}
              </div>
              <p className="text-xs font-tajawal text-[var(--text-soft)]">{w.message}</p>
              <p className="text-[10px] text-[var(--text-muted)] mt-1">{new Date(w.created_at).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US')}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof LayoutGrid;
  label: string;
  value: string;
  color: 'blue' | 'red' | 'green' | 'gray';
}) {
  const colorMap = {
    blue: { bg: 'bg-brand-blue/15', text: 'text-brand-blue-light', ring: 'ring-brand-blue/20' },
    red: { bg: 'bg-red-500/15', text: 'text-red-400', ring: 'ring-red-500/20' },
    green: { bg: 'bg-brand-green/15', text: 'text-brand-green', ring: 'ring-brand-green/20' },
    gray: { bg: 'bg-white/5', text: 'text-[var(--text-soft)]', ring: 'ring-white/10' },
  }[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="glass-card p-5"
    >
      <div className={`w-11 h-11 rounded-2xl ${colorMap.bg} flex items-center justify-center mb-3 ring-1 ${colorMap.ring}`}>
        <Icon className={`w-6 h-6 ${colorMap.text}`} />
      </div>
      <p className="text-2xl font-bold counter">{value}</p>
      <p className="text-sm text-[var(--text-muted)] mt-0.5">{label}</p>
    </motion.div>
  );
}
