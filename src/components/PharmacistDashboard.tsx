import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Activity, TriangleAlert as AlertTriangle, Box, Check, ClipboardCopy, Clock, Heart, Chrome as Home, Info, LogOut, Moon, Package, Pencil, Pill, Plus, RotateCcw, Search, Settings, Star, Store, Sun, Trash2, Upload, UserCheck, UserX, X, Circle as XCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useLang } from '@/lib/i18n';
import { supabase, type ActivityLogEntry, type Medicine, type MedicineReservation, type Pharmacy } from '@/lib/supabase';
import { showToast, ToastContainer, useToast } from '@/components/ui/Toast';
import { BulkImport } from '@/components/BulkImport';
import { DonationModal } from '@/components/DonationModal';

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

type Tab = 'home' | 'medicines' | 'reservations' | 'info' | 'settings';

interface MedForm {
  medicine_name: string;
  generic_name: string;
  price: string;
  quantity: string;
  expiry_date: string;
  has_alternative: 'yes' | 'no';
  alternative_medicine_id: string;
}

const emptyMedForm: MedForm = { medicine_name: '', generic_name: '', price: '', quantity: '', expiry_date: '', has_alternative: 'no', alternative_medicine_id: '' };

export default function PharmacistDashboard({ theme, onToggleTheme }: { theme: 'dark' | 'light'; onToggleTheme: () => void }) {
  const { user, profile, signOut } = useAuth();
  const { t, lang } = useLang();
  const { toasts, remove } = useToast();

  const [tab, setTab] = useState<Tab>('home');
  const [pharmacy, setPharmacy] = useState<Pharmacy | null>(null);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [allMedicines, setAllMedicines] = useState<Medicine[]>([]);
  const [activity, setActivity] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reservations, setReservations] = useState<MedicineReservation[]>([]);

  // Setup form (no pharmacy yet)
  const [setupForm, setSetupForm] = useState({ name: '', area: '', address: '', phone: '' });

  // Info form
  const [infoForm, setInfoForm] = useState({ name: '', area: '', address: '', phone: '', open_hours: '' });

  // Medicine modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMed, setEditingMed] = useState<Medicine | null>(null);
  const [medForm, setMedForm] = useState<MedForm>(emptyMedForm);
  const [deleteTarget, setDeleteTarget] = useState<Medicine | null>(null);

  // Search
  const [search, setSearch] = useState('');
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showDonationModal, setShowDonationModal] = useState(false);

  // Status toggle
  const [statusSaving, setStatusSaving] = useState(false);

  const isRTL = lang === 'ar';

  // ---- Load pharmacy ----
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: pharmData } = await supabase
        .from('pharmacies')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (cancelled) return;
      if (pharmData) {
        const p = pharmData as Pharmacy;
        setPharmacy(p);
        setInfoForm({
          name: p.name,
          area: p.area,
          address: p.address,
          phone: p.phone,
          open_hours: p.open_hours,
        });
        await loadMedicines(p.id);
        await loadReservations(p.id);
        await loadActivity(user.id);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function loadMedicines(pharmacyId: string) {
    const { data } = await supabase
      .from('medicines')
      .select('*')
      .eq('pharmacy_id', pharmacyId)
      .order('medicine_name', { ascending: true });
    if (data) setMedicines(data as Medicine[]);
    // Also fetch all medicines for the alternative dropdown (global list)
    const { data: allData } = await supabase
      .from('medicines')
      .select('id, medicine_name, generic_name, pharmacy_id')
      .order('medicine_name', { ascending: true })
      .limit(200);
    if (allData) setAllMedicines(allData as Medicine[]);
  }

  async function loadActivity(userId: string) {
    const { data } = await supabase
      .from('activity_log')
      .select('*')
      .eq('user_id', userId)
      .order('ts', { ascending: false })
      .limit(10);
    if (data) setActivity(data as ActivityLogEntry[]);
  }

  async function loadReservations(pharmacyId: string) {
    const { data } = await supabase
      .from('medicine_reservations')
      .select('*')
      .eq('pharmacy_id', pharmacyId)
      .in('status', ['pending', 'confirmed'])
      .order('created_at', { ascending: false });
    if (data) setReservations(data as MedicineReservation[]);
  }

  async function updateReservation(id: string, status: MedicineReservation['status'], restoreStock: boolean, medId?: string, medName?: string) {
    const updates: Record<string, unknown> = { status };
    if (status === 'confirmed') updates.confirmed_at = new Date().toISOString();
    if (status === 'cancelled' || status === 'expired' || status === 'no_show') updates.cancelled_at = new Date().toISOString();
    const { error } = await supabase.from('medicine_reservations').update(updates).eq('id', id);
    if (error) {
      showToast(isRTL ? 'فشل تحديث الحجز' : 'Failed to update reservation', 'error');
      return;
    }
    if (restoreStock && medId) {
      await supabase.from('medicines').update({ quantity: (medicines.find((m) => m.id === medId)?.quantity ?? 0) + 1, last_updated: new Date().toISOString() }).eq('id', medId);
      await loadMedicines(pharmacy!.id);
    }
    if (pharmacy) await loadReservations(pharmacy.id);
    showToast(isRTL ? 'تم تحديث الحجز' : 'Reservation updated');
    await logActivity(`reservation_${status}`, medName || id.slice(0, 8));
  }

  async function logActivity(action: string, item: string) {
    if (!user) return;
    await supabase.from('activity_log').insert({
      user_id: user.id,
      user_name: profile?.display_name ?? user.email ?? 'صيدلي',
      action,
      item,
    });
    if (pharmacy) await loadActivity(user.id);
  }

  // ---- Setup: create pharmacy ----
  async function createPharmacy() {
    if (!user) return;
    if (!setupForm.name.trim() || !setupForm.area.trim() || !setupForm.address.trim() || !setupForm.phone.trim()) {
      showToast(isRTL ? 'يرجى ملء جميع الحقول' : 'Please fill all fields', 'error');
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from('pharmacies')
      .insert({
        owner_id: user.id,
        name: setupForm.name.trim(),
        area: setupForm.area.trim(),
        address: setupForm.address.trim(),
        phone: setupForm.phone.trim(),
        open_hours: '',
        is_open: true,
        rating: 0,
        reviews_count: 0,
        status: 'open',
        lat: 0,
        lng: 0,
      })
      .select('*')
      .single();
    setSaving(false);
    if (error) {
      showToast(isRTL ? 'فشل إنشاء الصيدلية' : 'Failed to create pharmacy', 'error');
      return;
    }
    const p = data as Pharmacy;
    setPharmacy(p);
    setInfoForm({
      name: p.name,
      area: p.area,
      address: p.address,
      phone: p.phone,
      open_hours: p.open_hours,
    });
    showToast(isRTL ? 'تم إنشاء الصيدلية بنجاح' : 'Pharmacy created successfully');
    await logActivity('create_pharmacy', p.name);
  }

  // ---- Status toggle ----
  async function toggleStatus(open: boolean) {
    if (!pharmacy) return;
    setStatusSaving(true);
    const { error } = await supabase
      .from('pharmacies')
      .update({ is_open: open, status: open ? 'open' : 'closed' })
      .eq('id', pharmacy.id);
    setStatusSaving(false);
    if (error) {
      showToast(isRTL ? 'فشل تحديث الحالة' : 'Failed to update status', 'error');
      return;
    }
    setPharmacy({ ...pharmacy, is_open: open, status: open ? 'open' : 'closed' });
    showToast(open ? (isRTL ? 'الصيدلية مفتوحة الآن' : 'Pharmacy is now open') : (isRTL ? 'الصيدلية مغلقة الآن' : 'Pharmacy is now closed'));
    await logActivity(open ? 'status_open' : 'status_closed', pharmacy.name);
  }

  // ---- Info save ----
  async function saveInfo() {
    if (!pharmacy) return;
    if (!infoForm.name.trim() || !infoForm.area.trim() || !infoForm.address.trim() || !infoForm.phone.trim()) {
      showToast(isRTL ? 'يرجى ملء الحقول المطلوبة' : 'Please fill required fields', 'error');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('pharmacies')
      .update({
        name: infoForm.name.trim(),
        area: infoForm.area.trim(),
        address: infoForm.address.trim(),
        phone: infoForm.phone.trim(),
        open_hours: infoForm.open_hours.trim(),
      })
      .eq('id', pharmacy.id);
    setSaving(false);
    if (error) {
      showToast(isRTL ? 'فشل حفظ المعلومات' : 'Failed to save info', 'error');
      return;
    }
    setPharmacy({ ...pharmacy, ...infoForm });
    showToast(isRTL ? 'تم حفظ المعلومات' : 'Info saved successfully');
    await logActivity('update_info', infoForm.name);
  }

  // ---- Medicine modal ----
  function openAddModal() {
    setEditingMed(null);
    setMedForm(emptyMedForm);
    setModalOpen(true);
  }

  function openEditModal(med: Medicine) {
    setEditingMed(med);
    setMedForm({
      medicine_name: med.medicine_name,
      generic_name: med.generic_name,
      price: String(med.price),
      quantity: String(med.quantity),
      expiry_date: med.expiry_date || '',
      has_alternative: med.alternative_medicine_id ? 'yes' : 'no',
      alternative_medicine_id: med.alternative_medicine_id || '',
    });
    setModalOpen(true);
  }

  async function saveMed() {
    if (!pharmacy) return;
    if (!medForm.medicine_name.trim()) {
      showToast(isRTL ? 'اسم الدواء مطلوب' : 'Medicine name is required', 'error');
      return;
    }
    const price = parseFloat(medForm.price) || 0;
    const quantity = parseInt(medForm.quantity, 10) || 0;

    setSaving(true);
    const altId = medForm.has_alternative === 'yes' && medForm.alternative_medicine_id ? medForm.alternative_medicine_id : null;
    if (editingMed) {
      const { error } = await supabase
        .from('medicines')
        .update({
          medicine_name: medForm.medicine_name.trim(),
          generic_name: medForm.generic_name.trim(),
          price,
          quantity,
          expiry_date: medForm.expiry_date || null,
          alternative_medicine_id: altId,
          last_updated: new Date().toISOString(),
        })
        .eq('id', editingMed.id);
      setSaving(false);
      if (error) {
        showToast(isRTL ? 'فشل تحديث الدواء' : 'Failed to update medicine', 'error');
        return;
      }
      showToast(isRTL ? 'تم تحديث الدواء' : 'Medicine updated');
      await logActivity('edit_medicine', medForm.medicine_name);
    } else {
      const { error } = await supabase
        .from('medicines')
        .insert({
          pharmacy_id: pharmacy.id,
          medicine_name: medForm.medicine_name.trim(),
          generic_name: medForm.generic_name.trim(),
          price,
          quantity,
          expiry_date: medForm.expiry_date || null,
          alternative_medicine_id: altId,
          last_updated: new Date().toISOString(),
        });
      setSaving(false);
      if (error) {
        showToast(isRTL ? 'فشل إضافة الدواء' : 'Failed to add medicine', 'error');
        return;
      }
      showToast(isRTL ? 'تم إضافة الدواء' : 'Medicine added');
      await logActivity('add_medicine', medForm.medicine_name);
    }
    setModalOpen(false);
    await loadMedicines(pharmacy.id);
  }

  async function confirmDelete() {
    if (!deleteTarget || !pharmacy) return;
    setSaving(true);
    const { error } = await supabase.from('medicines').delete().eq('id', deleteTarget.id);
    setSaving(false);
    if (error) {
      showToast(isRTL ? 'فشل الحذف' : 'Failed to delete', 'error');
      return;
    }
    showToast(isRTL ? 'تم حذف الدواء' : 'Medicine deleted');
    await logActivity('delete_medicine', deleteTarget.medicine_name);
    setDeleteTarget(null);
    await loadMedicines(pharmacy.id);
  }

  // ---- Export ----
  async function exportList() {
    if (medicines.length === 0) {
      showToast(isRTL ? 'لا توجد أدوية للتصدير' : 'No medicines to export', 'error');
      return;
    }
    const lines = medicines.map(
      (m) => `${m.medicine_name} | ${m.generic_name} | ${m.price} ₪ | ${m.quantity}`
    );
    const text = lines.join('\n');
    try {
      await navigator.clipboard.writeText(text);
      showToast(isRTL ? 'تم نسخ القائمة' : 'List copied to clipboard');
    } catch {
      showToast(isRTL ? 'فشل النسخ' : 'Copy failed', 'error');
    }
  }

  // ---- Derived stats ----
  const stats = useMemo(() => {
    const total = medicines.length;
    const outOfStock = medicines.filter((m) => m.quantity <= 0).length;
    const avgPrice = medicines.length > 0 ? medicines.reduce((s, m) => s + m.price, 0) / medicines.length : 0;
    const rating = pharmacy?.rating ?? 0;
    return { total, outOfStock, avgPrice, rating };
  }, [medicines, pharmacy]);

  const outOfStockNames = useMemo(
    () => medicines.filter((m) => m.quantity <= 0).map((m) => m.medicine_name),
    [medicines]
  );

  const filteredMeds = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return medicines;
    return medicines.filter(
      (m) =>
        m.medicine_name.toLowerCase().includes(q) ||
        m.generic_name.toLowerCase().includes(q)
    );
  }, [medicines, search]);

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

  // ---- Setup (no pharmacy) ----
  if (!pharmacy) {
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
                <Store className="w-6 h-6 text-brand-green" />
              </div>
              <h1 className="text-2xl font-bold text-gradient-green">{t('pharm.setup')}</h1>
            </div>
            <p className="text-[var(--text-soft)] mb-6">{t('pharm.setupDesc')}</p>

            <div className="space-y-4">
              <SetupField
                label={t('pharm.pharmName')}
                value={setupForm.name}
                onChange={(v) => setSetupForm({ ...setupForm, name: v })}
                placeholder={isRTL ? 'صيدلية النور' : 'Al-Noor Pharmacy'}
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
                placeholder={isRTL ? 'شارع الرشيد' : 'Rasheed St'}
              />
              <SetupField
                label={t('auth.phone')}
                value={setupForm.phone}
                onChange={(v) => setSetupForm({ ...setupForm, phone: v })}
                placeholder="0599..."
              />
            </div>

            <button
              onClick={createPharmacy}
              disabled={saving}
              className="btn-primary w-full mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (isRTL ? 'جاري الإنشاء...' : 'Creating...') : t('pharm.create')}
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: typeof Home }[] = [
    { id: 'home', label: t('nav.home'), icon: Home },
    { id: 'medicines', label: t('pharm.medicines'), icon: Pill },
    { id: 'reservations', label: isRTL ? 'الحجوزات' : 'Reservations', icon: Clock },
    { id: 'info', label: t('pharm.info'), icon: Info },
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
                  <Store className="w-6 h-6 text-brand-green" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-[var(--text-muted)]">{t('pharm.title')}</p>
                  <p className="font-bold truncate">{pharmacy.name}</p>
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

              {/* Donation CTA */}
              <div className="mt-6 pt-6 border-t border-[var(--border-subtle)]">
                <button
                  onClick={() => setShowDonationModal(true)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-brand-green/10 to-brand-blue/10 hover:from-brand-green/20 hover:to-brand-blue/20 transition-all border border-brand-green/20"
                >
                  <Heart className="w-5 h-5 text-brand-green-light" />
                  <div className="text-right">
                    <div className="font-bold text-sm">{isRTL ? 'ساهم في إنقاذ الأرواح' : 'Help Save Lives'}</div>
                    <div className="text-[10px] text-[var(--text-muted)]">{isRTL ? 'دعم المنصة' : 'Support Platform'}</div>
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
                          {profile?.display_name ?? user?.email ?? (isRTL ? 'صيدلي' : 'Pharmacist')}
                        </h1>
                        <p className="text-[var(--text-soft)] mt-2 flex items-center gap-2">
                          <Store className="w-4 h-4 text-brand-green" />
                          {pharmacy.name} · {pharmacy.area}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5">
                        <Package className="w-5 h-5 text-brand-blue-light" />
                        <span className="font-bold">{stats.total}</span>
                        <span className="text-sm text-[var(--text-muted)]">{t('pharm.medicines')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Review status banner (under_review / rejected / resubmitted) */}
                  {(pharmacy.approval_status === 'under_review' || pharmacy.approval_status === 'rejected' || pharmacy.approval_status === 'resubmitted') && (
                    <div className={`glass-card p-5 border-2 ${pharmacy.approval_status === 'rejected' ? 'border-status-emergency/40 bg-status-emergency/5' : pharmacy.approval_status === 'resubmitted' ? 'border-brand-blue/40 bg-brand-blue/5' : 'border-amber-500/40 bg-amber-500/5'}`}>
                      <div className="flex items-start gap-3">
                        <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${pharmacy.approval_status === 'rejected' ? 'text-status-emergency' : 'text-amber-400'}`} />
                        <div className="flex-1">
                          <p className="font-cairo font-bold text-sm mb-1">
                            {pharmacy.approval_status === 'rejected'
                              ? (isRTL ? 'تم رفض صيدليتك' : 'Your pharmacy was rejected')
                              : pharmacy.approval_status === 'resubmitted'
                              ? (isRTL ? 'تمت إعادة الإرسال — بانتظار المراجعة' : 'Resubmitted — awaiting review')
                              : (isRTL ? 'صيدليتك قيد المراجعة' : 'Your pharmacy is under review')}
                          </p>
                          {(pharmacy.review_reason || pharmacy.rejection_reason) && (
                            <p className="text-xs font-tajawal text-[var(--text-soft)] mb-2">
                              {isRTL ? 'السبب: ' : 'Reason: '}{pharmacy.review_reason || pharmacy.rejection_reason}
                            </p>
                          )}
                          {pharmacy.reviewed_at && (
                            <p className="text-[10px] text-[var(--text-muted)] font-tajawal mb-3">
                              {isRTL ? 'آخر مراجعة: ' : 'Last review: '}{new Date(pharmacy.reviewed_at).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US')}
                            </p>
                          )}
                          {pharmacy.approval_status !== 'resubmitted' && (
                            <button
                              onClick={async () => {
                                if (!pharmacy || !user) return;
                                await supabase.from('pharmacies').update({ approval_status: 'resubmitted', resubmitted: true, resubmitted_at: new Date().toISOString() }).eq('id', pharmacy.id);
                                await supabase.from('audit_logs').insert({ actor_id: user.id, actor_name: profile?.display_name || user.email || '', action: 'resubmit_pharmacy', entity_type: 'pharmacy', entity_id: pharmacy.id, details: { name: pharmacy.name } });
                                await supabase.from('notifications').insert({ user_id: user.id, title: isRTL ? 'تمت إعادة إرسال صيدليتك للمراجعة' : 'Pharmacy resubmitted for review', body: isRTL ? 'سيقوم الأدمن بمراجعة طلبك قريباً' : 'An admin will review your request soon', type: 'info' });
                                setPharmacy({ ...pharmacy, approval_status: 'resubmitted', resubmitted: true, resubmitted_at: new Date().toISOString() });
                                showToast(isRTL ? 'تمت إعادة الإرسال للمراجعة' : 'Resubmitted for review');
                              }}
                              className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              {isRTL ? 'تم التعديل — إعادة إرسال للمراجعة' : 'Edited — Resubmit for review'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Out of stock alert */}
                  {outOfStockNames.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="glass-card p-5 border border-red-500/40 bg-red-500/10"
                    >
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="font-bold text-red-300">
                            {isRTL
                              ? `نفد المخزون (${outOfStockNames.length})`
                              : `Out of stock (${outOfStockNames.length})`}
                          </p>
                          <p className="text-sm text-red-200/80 mt-1 break-words">
                            {outOfStockNames.join(' · ')}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Status toggle card */}
                  <div className="glass-card p-6">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-brand-green" />
                        <div>
                          <p className="text-sm text-[var(--text-muted)]">{t('pharm.status')}</p>
                          <p className="font-bold">
                            {pharmacy.is_open ? t('pharm.openNow') : t('pharm.closedNow')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleStatus(true)}
                          disabled={statusSaving || pharmacy.is_open}
                          className={`px-5 py-2.5 rounded-2xl font-bold transition-all disabled:opacity-50 ${
                            pharmacy.is_open
                              ? 'bg-brand-green text-white'
                              : 'bg-white/5 text-[var(--text-soft)] hover:bg-brand-green/10'
                          }`}
                        >
                          {t('pharm.openNow')}
                        </button>
                        <button
                          onClick={() => toggleStatus(false)}
                          disabled={statusSaving || !pharmacy.is_open}
                          className={`px-5 py-2.5 rounded-2xl font-bold transition-all disabled:opacity-50 ${
                            !pharmacy.is_open
                              ? 'bg-red-500 text-white'
                              : 'bg-white/5 text-[var(--text-soft)] hover:bg-red-500/10'
                          }`}
                        >
                          {t('pharm.closedNow')}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Stat cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                      icon={Package}
                      label={t('pharm.totalMeds')}
                      value={String(stats.total)}
                      color="blue"
                    />
                    <StatCard
                      icon={AlertTriangle}
                      label={t('pharm.outOfStock')}
                      value={String(stats.outOfStock)}
                      color="red"
                    />
                    <StatCard
                      icon={Box}
                      label={t('pharm.avgPrice')}
                      value={`${stats.avgPrice.toFixed(1)} ₪`}
                      color="green"
                    />
                    <StatCard
                      icon={Star}
                      label={isRTL ? 'التقييم' : 'Rating'}
                      value={stats.rating.toFixed(1)}
                      color="gray"
                    />
                  </div>

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

              {tab === 'medicines' && (
                <motion.div
                  key="medicines"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.35, ease: EASE }}
                  className="space-y-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h1 className="text-2xl font-bold text-gradient-green">{t('pharm.medicines')}</h1>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowBulkImport(true)}
                        className="btn-secondary flex items-center gap-2 !py-2.5 !px-4 text-sm"
                      >
                        <Upload className="w-4 h-4" />
                        <span className="hidden sm:inline">{isRTL ? 'استيراد مجمّع' : 'Import'}</span>
                      </button>
                      <button
                        onClick={exportList}
                        className="btn-secondary flex items-center gap-2 !py-2.5 !px-4 text-sm"
                      >
                        <ClipboardCopy className="w-4 h-4" />
                        <span className="hidden sm:inline">{isRTL ? 'تصدير' : 'Export'}</span>
                      </button>
                      <button
                        onClick={openAddModal}
                        className="btn-primary flex items-center gap-2 !py-2.5 !px-4 text-sm"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{isRTL ? 'إضافة دواء' : 'Add medicine'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute top-1/2 -translate-y-1/2 start-4 w-5 h-5 text-[var(--text-muted)]" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={isRTL ? 'ابحث عن دواء...' : 'Search medicines...'}
                      className="w-full glass rounded-2xl ps-12 pe-4 py-3.5 bg-transparent outline-none focus:border-brand-green transition-colors placeholder:text-[var(--text-muted)]"
                    />
                  </div>

                  {/* Medicine list */}
                  {filteredMeds.length === 0 ? (
                    <div className="glass-card p-10 text-center">
                      <Pill className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3" />
                      <p className="text-[var(--text-muted)]">{t('pharm.noMeds')}</p>
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {filteredMeds.map((m, i) => {
                        const out = m.quantity <= 0;
                        const low = m.quantity > 0 && m.quantity < 5;
                        return (
                          <motion.div
                            key={m.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: i * 0.04, ease: EASE }}
                            className="glass-card p-5"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h3 className="font-bold text-gradient-green truncate">{m.medicine_name}</h3>
                                {m.generic_name && (
                                  <p className="text-sm text-[var(--text-muted)] mt-0.5 truncate">
                                    {m.generic_name}
                                  </p>
                                )}
                                <p className="mt-2 font-bold text-brand-blue-light">
                                  {m.price} ₪
                                </p>
                              </div>
                              <StockBadge out={out} low={low} qty={m.quantity} t={t} />
                            </div>
                            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[var(--border-subtle)]">
                              <button
                                onClick={() => openEditModal(m)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-brand-green/15 text-sm font-semibold transition-colors"
                              >
                                <Pencil className="w-4 h-4" />
                                {t('pharm.edit')}
                              </button>
                              <button
                                onClick={() => setDeleteTarget(m)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-red-500/15 text-sm font-semibold transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                                {t('pharm.delete')}
                              </button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}

              {tab === 'reservations' && (
                <motion.div
                  key="reservations"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.35, ease: EASE }}
                  className="space-y-5"
                >
                  <h1 className="text-2xl font-bold text-gradient-green">{isRTL ? 'الحجوزات' : 'Reservations'}</h1>
                  {reservations.length === 0 ? (
                    <div className="glass-card p-8 text-center">
                      <Clock className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3" />
                      <p className="text-sm text-[var(--text-muted)] font-tajawal">{isRTL ? 'لا توجد حجوزات نشطة حالياً' : 'No active reservations'}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {reservations.map((r) => {
                        const remaining = Math.max(0, new Date(r.expires_at).getTime() - Date.now());
                        const mm = String(Math.floor(remaining / 60000)).padStart(2, '0');
                        const ss = String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0');
                        const isPending = r.status === 'pending';
                        const isConfirmed = r.status === 'confirmed';
                        return (
                          <motion.div key={r.id} layout className="glass-card p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Pill className="w-4 h-4 text-brand-green shrink-0" />
                                  <span className="font-cairo font-bold text-sm">{r.medicine_name}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] font-tajawal">
                                  <UserCheck className="w-3 h-3" />
                                  {r.user_name} · {r.user_phone}
                                </div>
                                {isPending && (
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-status-busy">
                                    <Clock className="w-3 h-3" />
                                    <span className="font-mono tabular-nums">{mm}:{ss}</span>
                                  </div>
                                )}
                                {isConfirmed && (
                                  <span className="inline-block text-[10px] px-2 py-0.5 rounded-full font-bold bg-status-open/20 text-status-open">{isRTL ? 'مؤكد' : 'Confirmed'}</span>
                                )}
                              </div>
                              <div className="flex flex-col gap-1.5 shrink-0">
                                {isPending && (
                                  <>
                                    <button onClick={() => updateReservation(r.id, 'confirmed', false, r.medicine_id, r.medicine_name)} className="px-3 py-1.5 rounded-lg bg-status-open/20 text-status-open text-xs font-bold flex items-center gap-1.5 hover:bg-status-open/30 transition-colors">
                                      <Check className="w-3.5 h-3.5" /> {isRTL ? 'قبول الطلب' : 'Accept'}
                                    </button>
                                    <button onClick={() => updateReservation(r.id, 'cancelled', true, r.medicine_id, r.medicine_name)} className="px-3 py-1.5 rounded-lg bg-status-emergency/20 text-status-emergency text-xs font-bold flex items-center gap-1.5 hover:bg-status-emergency/30 transition-colors">
                                      <XCircle className="w-3.5 h-3.5" /> {isRTL ? 'رفض الطلب' : 'Reject'}
                                    </button>
                                  </>
                                )}
                                {isConfirmed && (
                                  <>
                                    <button onClick={() => updateReservation(r.id, 'confirmed', false, r.medicine_id, r.medicine_name)} className="px-3 py-1.5 rounded-lg bg-status-open/20 text-status-open text-xs font-bold flex items-center gap-1.5 hover:bg-status-open/30 transition-colors">
                                      <UserCheck className="w-3.5 h-3.5" /> {isRTL ? 'تم الاستلام' : 'Picked up'}
                                    </button>
                                    <button onClick={() => updateReservation(r.id, 'no_show', true, r.medicine_id, r.medicine_name)} className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-bold flex items-center gap-1.5 hover:bg-amber-500/30 transition-colors">
                                      <UserX className="w-3.5 h-3.5" /> {isRTL ? 'لم يحضر' : 'No-show'}
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
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
                  <h1 className="text-2xl font-bold text-gradient-green">{t('pharm.info')}</h1>
                  <div className="glass-card p-6 max-w-2xl">
                    <div className="space-y-4">
                      <SetupField
                        label={t('pharm.pharmName')}
                        value={infoForm.name}
                        onChange={(v) => setInfoForm({ ...infoForm, name: v })}
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
                      <SetupField
                        label={t('dash.workHours')}
                        value={infoForm.open_hours}
                        onChange={(v) => setInfoForm({ ...infoForm, open_hours: v })}
                        placeholder={isRTL ? '8 ص - 10 م' : '8 AM - 10 PM'}
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
                      {profile?.display_name?.charAt(0) || 'P'}
                    </div>
                    <h3 className="font-cairo font-bold text-lg">{profile?.display_name}</h3>
                    <p className="text-sm text-[var(--text-muted)] font-tajawal mt-1">{profile?.phone || user?.email || '—'}</p>
                    <span className="inline-block mt-2 px-3 py-1 rounded-full bg-brand-green/20 text-brand-green-light text-xs font-bold">{t('auth.pharmacist')}</span>
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

      {/* Bulk Import Modal */}
      <AnimatePresence>
        {showBulkImport && pharmacy && (
          <BulkImport entityType="medicines" pharmacyId={pharmacy.id} onClose={() => setShowBulkImport(false)} onDone={() => { setShowBulkImport(false); loadMedicines(pharmacy.id); }} isRTL={isRTL} />
        )}
      </AnimatePresence>

      {/* Add/Edit modal */}
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
                  {editingMed ? t('pharm.edit') : t('pharm.addMed')}
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
                  label={t('pharm.medName')}
                  value={medForm.medicine_name}
                  onChange={(v) => setMedForm({ ...medForm, medicine_name: v })}
                />
                <SetupField
                  label={t('pharm.genericName')}
                  value={medForm.generic_name}
                  onChange={(v) => setMedForm({ ...medForm, generic_name: v })}
                />
                <div className="grid grid-cols-2 gap-3">
                  <SetupField
                    label={t('pharm.price')}
                    value={medForm.price}
                    onChange={(v) => setMedForm({ ...medForm, price: v })}
                    placeholder="0"
                    type="number"
                  />
                  <SetupField
                    label={t('pharm.quantity')}
                    value={medForm.quantity}
                    onChange={(v) => setMedForm({ ...medForm, quantity: v })}
                    placeholder="0"
                    type="number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[var(--text-soft)] mb-1.5">{isRTL ? 'تاريخ الصلاحية' : 'Expiry Date'}</label>
                  <input
                    type="date"
                    value={medForm.expiry_date}
                    onChange={(e) => setMedForm({ ...medForm, expiry_date: e.target.value })}
                    className="w-full glass rounded-2xl px-4 py-3 bg-transparent outline-none focus:border-brand-green transition-colors"
                  />
                </div>

                {/* Alternative medicine field */}
                <div className="mt-4">
                  <label className="block text-sm font-semibold text-[var(--text-soft)] mb-1.5">
                    {isRTL ? 'هل يوجد دواء بديل؟' : 'Is there an alternative medicine?'}
                  </label>
                  <div className="flex gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setMedForm({ ...medForm, has_alternative: 'no', alternative_medicine_id: '' })}
                      className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${medForm.has_alternative === 'no' ? 'bg-brand-green/20 border-2 border-brand-green' : 'glass border-2 border-transparent'}`}
                    >
                      {isRTL ? 'لا' : 'No'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMedForm({ ...medForm, has_alternative: 'yes' })}
                      className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${medForm.has_alternative === 'yes' ? 'bg-brand-green/20 border-2 border-brand-green' : 'glass border-2 border-transparent'}`}
                    >
                      {isRTL ? 'نعم' : 'Yes'}
                    </button>
                  </div>
                  {medForm.has_alternative === 'yes' && (
                    <select
                      value={medForm.alternative_medicine_id}
                      onChange={(e) => setMedForm({ ...medForm, alternative_medicine_id: e.target.value })}
                      className="w-full glass rounded-2xl px-4 py-3 bg-transparent outline-none focus:border-brand-green transition-colors text-sm"
                    >
                      <option value="" className="bg-[var(--bg-dark)]">
                        {isRTL ? 'اختر دواء بديل من القائمة...' : 'Select an alternative from the list...'}
                      </option>
                      <optgroup label={isRTL ? 'أدويتي بالمخزون' : 'My inventory'} className="bg-[var(--bg-dark)]">
                        {medicines.filter((m) => m.id !== editingMed?.id).map((m) => (
                          <option key={m.id} value={m.id} className="bg-[var(--bg-dark)]">
                            {m.medicine_name} {m.generic_name ? `(${m.generic_name})` : ''} — {m.quantity} {isRTL ? 'قطعة' : 'units'}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label={isRTL ? 'كل الأدوية بالنظام' : 'All medicines in system'} className="bg-[var(--bg-dark)]">
                        {allMedicines.filter((m) => m.id !== editingMed?.id && !medicines.some((own) => own.id === m.id)).slice(0, 50).map((m) => (
                          <option key={m.id} value={m.id} className="bg-[var(--bg-dark)]">
                            {m.medicine_name} {m.generic_name ? `(${m.generic_name})` : ''}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  )}
                </div>
              </div>
                <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setModalOpen(false)}
                  className="btn-secondary flex-1"
                >
                  {t('pharm.cancel')}
                </button>
                <button
                  onClick={saveMed}
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
              <p className="text-sm text-[var(--text-muted)] mb-5">{deleteTarget.medicine_name}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="btn-secondary flex-1"
                >
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

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Package;
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

function StockBadge({
  out,
  low,
  qty,
  t,
}: {
  out: boolean;
  low: boolean;
  qty: number;
  t: (k: string) => string;
}) {
  let cls = 'bg-brand-green/15 text-brand-green';
  let label = `${t('dash.available')} · ${qty}`;
  if (out) {
    cls = 'bg-red-500/15 text-red-400';
    label = t('dash.outOfStock');
  } else if (low) {
    cls = 'bg-amber-500/15 text-amber-400';
    label = `${t('dash.lowStock')} · ${qty}`;
  }
  return (
    <span className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold ${cls}`}>
      {label}
    </span>
  );
}
