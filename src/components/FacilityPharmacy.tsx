import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, Clock, Copy, Loader as Loader2, MapPin, Package, Pencil, Pill, Plus, Search, Store, Trash2, X } from 'lucide-react';
import { supabase, type Medicine, type Pharmacy } from '@/lib/supabase';
import { CloneFromPharmacy } from '@/components/CloneFromPharmacy';
import { showToast } from '@/components/ui/Toast';

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

import { MEDICINE_CATEGORIES } from '@/data/categories';

interface MedForm {
  medicine_name: string;
  generic_name: string;
  price: string;
  quantity: string;
  expiry_date: string;
  category: string;
}

const emptyMedForm: MedForm = {
  medicine_name: '',
  generic_name: '',
  price: '',
  quantity: '',
  expiry_date: '',
  category: '',
};

export function FacilityPharmacy({
  facilityId,
  facilityName,
  facilityPhone,
  facilityArea,
  facilityAddress,
  isRTL,
}: {
  facilityId: string;
  facilityName: string;
  facilityPhone: string;
  facilityArea: string;
  facilityAddress: string;
  isRTL: boolean;
}) {
  const [pharmacy, setPharmacy] = useState<Pharmacy | null>(null);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddChoice, setShowAddChoice] = useState(false);
  const [showClone, setShowClone] = useState(false);
  const [medModal, setMedModal] = useState(false);
  const [editingMed, setEditingMed] = useState<Medicine | null>(null);
  const [medForm, setMedForm] = useState<MedForm>(emptyMedForm);
  const [medSaving, setMedSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Medicine | null>(null);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => {
    (async () => {
      await ensurePharmacy();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facilityId]);

  async function ensurePharmacy() {
    setLoading(true);
    const { data: existing } = await supabase
      .from('pharmacies')
      .select('id,owner_id,name,area,address,phone,open_hours,is_open,status,verified,approval_status,rejection_reason,deleted_at,lat,lng,rating,reviews_count,power_status,last_updated_at,created_at,is_reference,facility_id')
      .eq('facility_id', facilityId)
      .maybeSingle();

    if (existing) {
      setPharmacy(existing as Pharmacy);
      await loadMedicines((existing as Pharmacy).id);
      setLoading(false);
      return;
    }

    const { data: newPharm, error } = await supabase
      .from('pharmacies')
      .insert({
        facility_id: facilityId,
        owner_id: null,
        name: `${facilityName} - ${isRTL ? 'صيدلية داخلية' : 'Internal Pharmacy'}`,
        area: facilityArea,
        address: facilityAddress,
        phone: facilityPhone,
        lat: 0,
        lng: 0,
        open_hours: '08:00-22:00',
        is_open: true,
        status: 'open',
        verified: false,
        power_status: 'unknown',
        approval_status: 'pending',
        is_reference: false,
      })
      .select('id,owner_id,name,area,address,phone,open_hours,is_open,status,verified,approval_status,rejection_reason,deleted_at,lat,lng,rating,reviews_count,power_status,last_updated_at,created_at,is_reference,facility_id')
      .maybeSingle();

    if (error) {
      console.error('[ensurePharmacy] Supabase error:', error.code, error.message, error.details, error.hint);
      setLoading(false);
      return;
    }
    if (newPharm) {
      setPharmacy(newPharm as Pharmacy);
      await loadMedicines((newPharm as Pharmacy).id);
    }
    setLoading(false);
  }

  async function loadMedicines(pharmId: string) {
    const { data } = await supabase
      .from('medicines')
      .select('id,pharmacy_id,medicine_name,generic_name,price,quantity,expiry_date,deleted_at,is_restricted,alternative_medicine_id,is_incomplete,category,price_usd,is_available,restriction_note,last_updated,created_at')
      .eq('pharmacy_id', pharmId)
      .is('deleted_at', null)
      .neq('is_incomplete', true)
      .order('medicine_name', { ascending: true });
    if (data) setMedicines(data as Medicine[]);
  }

  function openAddMedModal() {
    setEditingMed(null);
    setMedForm(emptyMedForm);
    setMedModal(true);
  }

  function openEditMedModal(med: Medicine) {
    setEditingMed(med);
    setMedForm({
      medicine_name: med.medicine_name,
      generic_name: med.generic_name || '',
      price: String(med.price),
      quantity: String(med.quantity),
      expiry_date: med.expiry_date || '',
      category: med.category || '',
    });
    setMedModal(true);
  }

  async function saveMed() {
    if (!pharmacy) return;
    if (!medForm.medicine_name.trim() || !medForm.price || !medForm.quantity) {
      showToast(isRTL ? 'يرجى ملء الحقول المطلوبة' : 'Please fill required fields', 'error');
      return;
    }
    setMedSaving(true);
    const payload = {
      pharmacy_id: pharmacy.id,
      medicine_name: medForm.medicine_name.trim(),
      generic_name: medForm.generic_name.trim(),
      price: parseFloat(medForm.price) || 0,
      quantity: parseInt(medForm.quantity) || 0,
      expiry_date: medForm.expiry_date || null,
      category: medForm.category.trim(),
      is_available: (parseInt(medForm.quantity) || 0) > 0,
      last_updated: new Date().toISOString(),
    };

    if (editingMed) {
      const { error } = await supabase.from('medicines').update(payload).eq('id', editingMed.id);
      setMedSaving(false);
      if (error) {
        console.error('[saveMed/update] Supabase error:', error.code, error.message, error.details, error.hint);
        showToast(isRTL ? `فشل التحديث: ${error.message}` : `Failed to update: ${error.message}`, 'error');
        return;
      }
      showToast(isRTL ? 'تم تحديث الدواء' : 'Medicine updated');
    } else {
      const { error } = await supabase.from('medicines').insert(payload);
      setMedSaving(false);
      if (error) {
        console.error('[saveMed/insert] Supabase error:', error.code, error.message, error.details, error.hint);
        showToast(isRTL ? `فشل الإضافة: ${error.message}` : `Failed to add: ${error.message}`, 'error');
        return;
      }
      showToast(isRTL ? 'تم إضافة الدواء' : 'Medicine added');
    }
    setMedModal(false);
    await loadMedicines(pharmacy.id);
  }

  async function confirmDeleteMed() {
    if (!pharmacy || !deleteTarget) return;
    const { error } = await supabase.from('medicines').update({ deleted_at: new Date().toISOString() }).eq('id', deleteTarget.id);
    if (error) {
      console.error('[confirmDeleteMed] Supabase error:', error.code, error.message, error.details, error.hint);
      showToast(isRTL ? `فشل الحذف: ${error.message}` : `Failed to delete: ${error.message}`, 'error');
      return;
    }
    setDeleteTarget(null);
    await loadMedicines(pharmacy.id);
    showToast(isRTL ? 'تم حذف الدواء' : 'Medicine deleted');
  }

  const filteredMeds = search.trim()
    ? medicines.filter((m) =>
        m.medicine_name.toLowerCase().includes(search.toLowerCase()) ||
        (m.generic_name || '').toLowerCase().includes(search.toLowerCase())
      )
    : medicines;

  const allSelected = filteredMeds.length > 0 && filteredMeds.every((m) => selectedIds.has(m.id));
  const someSelected = selectedIds.size > 0;

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredMeds.map((m) => m.id)));
    }
  }

  async function bulkUpdate() {
    if (!pharmacy || selectedIds.size === 0) return;
    setBulkLoading(true);
    const ids = Array.from(selectedIds);
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('medicines')
      .update({ last_updated: now, is_available: true })
      .in('id', ids);
    setBulkLoading(false);
    if (error) {
      showToast(isRTL ? `فشل تحديث ${ids.length} دواء` : `Failed to update ${ids.length} medicines`, 'error');
      return;
    }
    showToast(isRTL ? `تم تحديث ${ids.length} دواء` : `Updated ${ids.length} medicines`);
    setSelectedIds(new Set());
    await loadMedicines(pharmacy.id);
  }

  async function bulkDelete() {
    if (!pharmacy || selectedIds.size === 0) return;
    setBulkLoading(true);
    const ids = Array.from(selectedIds);
    const { error } = await supabase
      .from('medicines')
      .delete()
      .in('id', ids);
    setBulkLoading(false);
    if (error) {
      showToast(isRTL ? `فشل حذف ${ids.length} دواء` : `Failed to delete ${ids.length} medicines`, 'error');
      return;
    }
    showToast(isRTL ? `تم حذف ${ids.length} دواء` : `Deleted ${ids.length} medicines`);
    setSelectedIds(new Set());
    await loadMedicines(pharmacy.id);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-brand-green" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-green/15 flex items-center justify-center">
            <Pill className="w-5 h-5 text-brand-green" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gradient-green">
              {isRTL ? 'الصيدلية' : 'Pharmacy'}
            </h1>
            <p className="text-sm text-[var(--text-muted)]">
              {pharmacy?.name} · {pharmacy?.area}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowAddChoice(true)}
          className="btn-primary flex items-center gap-2 !py-2.5 !px-4 text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>{isRTL ? 'إضافة دواء' : 'Add medicine'}</span>
        </button>
      </div>

      {pharmacy?.approval_status !== 'approved' && (
        <div className="glass-card p-4 border border-amber-500/40 bg-amber-500/10">
          <p className="text-sm text-amber-200">
            {isRTL
              ? 'صيدلية المرفق بانتظار موافقة الإدارة لتظهر في نتائج بحث المواطنين.'
              : 'Facility pharmacy is pending admin approval to appear in citizen search results.'}
          </p>
        </div>
      )}

      <div className="relative">
        <Search className="absolute top-1/2 -translate-y-1/2 start-4 w-4 h-4 text-[var(--text-muted)]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={isRTL ? 'ابحث عن دواء...' : 'Search medicines...'}
          className="w-full glass rounded-2xl ps-12 pe-4 py-3 bg-transparent outline-none focus:border-brand-green transition-colors"
        />
      </div>

      {/* Bulk action bar */}
      {someSelected && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-3 flex items-center justify-between gap-3"
        >
          <span className="text-sm font-tajawal">
            {isRTL ? `${selectedIds.size} دواء محدد` : `${selectedIds.size} medicines selected`}
          </span>
          <div className="flex gap-2">
            <button
              onClick={bulkDelete}
              disabled={bulkLoading}
              className="btn-secondary !py-2 !px-4 text-sm flex items-center gap-1.5 text-status-emergency disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {isRTL ? 'حذف المحدد' : 'Delete Selected'}
            </button>
            <button
              onClick={bulkUpdate}
              disabled={bulkLoading}
              className="btn-primary !py-2 !px-4 text-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              {bulkLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {isRTL ? 'تحديث الكل' : 'Update All'}
            </button>
            <button onClick={() => setSelectedIds(new Set())} className="btn-secondary !py-2 !px-4 text-sm">
              {isRTL ? 'إلغاء' : 'Clear'}
            </button>
          </div>
        </motion.div>
      )}

      {filteredMeds.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <Package className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3" />
          <p className="text-[var(--text-muted)]">
            {isRTL ? 'لا توجد أدوية بعد — اضغط "إضافة دواء" للبدء' : 'No medicines yet — click "Add medicine" to start'}
          </p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          {/* Table header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-subtle)] bg-white/[0.02]">
            <button onClick={toggleSelectAll} className="w-5 h-5 rounded-md border-2 border-[var(--border-subtle)] flex items-center justify-center transition-colors shrink-0 hover:border-brand-green">
              {allSelected && <Check className="w-3.5 h-3.5 text-brand-green-light" />}
            </button>
            <span className="text-xs font-cairo font-bold text-[var(--text-muted)] flex-1 min-w-0">{isRTL ? 'اسم الدواء' : 'Medicine Name'}</span>
            <span className="text-xs font-cairo font-bold text-[var(--text-muted)] w-16 text-center shrink-0 hidden sm:block">{isRTL ? 'السعر' : 'Price'}</span>
            <span className="text-xs font-cairo font-bold text-[var(--text-muted)] w-16 text-center shrink-0 hidden sm:block">{isRTL ? 'الكمية' : 'Qty'}</span>
            <span className="text-xs font-cairo font-bold text-[var(--text-muted)] w-24 text-center shrink-0 hidden md:block">{isRTL ? 'الصلاحية' : 'Expiry'}</span>
            <span className="w-16 shrink-0"></span>
          </div>
          {/* Rows */}
          <div className="divide-y divide-[var(--border-subtle)]">
            {filteredMeds.map((med) => {
              const isSelected = selectedIds.has(med.id);
              return (
                <motion.div
                  key={med.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className={`flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors cursor-pointer ${isSelected ? 'bg-brand-green/5' : ''}`}
                  onClick={() => toggleSelect(med.id)}
                >
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors shrink-0 ${isSelected ? 'border-brand-green bg-brand-green/20' : 'border-[var(--border-subtle)]'}`}>
                    {isSelected && <Check className="w-3.5 h-3.5 text-brand-green-light" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate">{med.medicine_name}</div>
                    <div className="text-xs text-[var(--text-muted)] truncate sm:hidden">{med.price} ₪ · {med.quantity} {isRTL ? 'وحدة' : 'units'}</div>
                    <p className="text-xs text-[var(--text-muted)] truncate hidden sm:block">{med.generic_name}</p>
                  </div>
                  <span className="font-bold text-sm w-16 text-center shrink-0 hidden sm:block">{med.price} ₪</span>
                  <span className="font-bold text-sm w-16 text-center shrink-0 hidden sm:block">{med.quantity}</span>
                  <span className="text-xs text-[var(--text-muted)] w-24 text-center shrink-0 hidden md:block truncate">{med.expiry_date || '—'}</span>
                  <div className="flex gap-1 shrink-0 w-16 justify-end" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => openEditMedModal(med)} className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleteTarget(med)} className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center transition-colors">
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Medicine Choice Modal */}
      <AnimatePresence>
        {showAddChoice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowAddChoice(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25, ease: EASE }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card p-6 w-full max-w-sm"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold">{isRTL ? 'إضافة دواء' : 'Add Medicine'}</h2>
                <button onClick={() => setShowAddChoice(false)} className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => { setShowAddChoice(false); openAddMedModal(); }}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl glass hover:border-brand-green transition-all text-start"
                >
                  <div className="w-10 h-10 rounded-xl bg-brand-green/15 flex items-center justify-center shrink-0">
                    <Pencil className="w-5 h-5 text-brand-green" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{isRTL ? 'إضافة يدوية' : 'Manual add'}</p>
                    <p className="text-xs text-[var(--text-muted)]">{isRTL ? 'أدخل بيانات الدواء بنفسك' : 'Enter medicine details yourself'}</p>
                  </div>
                </button>
                <button
                  onClick={() => { setShowAddChoice(false); setShowClone(true); }}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl glass hover:border-brand-green transition-all text-start"
                >
                  <div className="w-10 h-10 rounded-xl bg-brand-blue/15 flex items-center justify-center shrink-0">
                    <Copy className="w-5 h-5 text-brand-blue-light" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{isRTL ? 'استيراد من صيدلية أخرى' : 'Import from another pharmacy'}</p>
                    <p className="text-xs text-[var(--text-muted)]">{isRTL ? 'انسخ قائمة الأدوية من صيدلية مرجعية' : 'Clone medicine list from a reference pharmacy'}</p>
                  </div>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clone modal */}
      <AnimatePresence>
        {showClone && pharmacy && (
          <CloneFromPharmacy
            targetPharmacyId={pharmacy.id}
            onClose={() => setShowClone(false)}
            onDone={() => { setShowClone(false); loadMedicines(pharmacy.id); showToast(isRTL ? 'تم استنساخ الأدوية بنجاح' : 'Medicines cloned successfully'); }}
            isRTL={isRTL}
            allowReference={true}
          />
        )}
      </AnimatePresence>

      {/* Medicine add/edit modal */}
      <AnimatePresence>
        {medModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setMedModal(false)}
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
                  {editingMed ? (isRTL ? 'تعديل دواء' : 'Edit medicine') : (isRTL ? 'إضافة دواء' : 'Add medicine')}
                </h2>
                <button onClick={() => setMedModal(false)} className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-[var(--text-muted)] mb-1 block">{isRTL ? 'اسم الدواء *' : 'Medicine name *'}</label>
                  <input
                    value={medForm.medicine_name}
                    onChange={(e) => setMedForm({ ...medForm, medicine_name: e.target.value })}
                    className="w-full glass rounded-xl px-4 py-2.5 bg-transparent outline-none focus:border-brand-green transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-[var(--text-muted)] mb-1 block">{isRTL ? 'الاسم العلمي' : 'Generic name'}</label>
                  <input
                    value={medForm.generic_name}
                    onChange={(e) => setMedForm({ ...medForm, generic_name: e.target.value })}
                    className="w-full glass rounded-xl px-4 py-2.5 bg-transparent outline-none focus:border-brand-green transition-colors"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-[var(--text-muted)] mb-1 block">{isRTL ? 'السعر (₪) *' : 'Price (₪) *'}</label>
                    <input
                      type="number"
                      value={medForm.price}
                      onChange={(e) => setMedForm({ ...medForm, price: e.target.value })}
                      className="w-full glass rounded-xl px-4 py-2.5 bg-transparent outline-none focus:border-brand-green transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-muted)] mb-1 block">{isRTL ? 'الكمية *' : 'Quantity *'}</label>
                    <input
                      type="number"
                      value={medForm.quantity}
                      onChange={(e) => setMedForm({ ...medForm, quantity: e.target.value })}
                      className="w-full glass rounded-xl px-4 py-2.5 bg-transparent outline-none focus:border-brand-green transition-colors"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-[var(--text-muted)] mb-1 block">{isRTL ? 'تاريخ الصلاحية' : 'Expiry date'}</label>
                    <input
                      type="date"
                      value={medForm.expiry_date}
                      onChange={(e) => setMedForm({ ...medForm, expiry_date: e.target.value })}
                      className="w-full glass rounded-xl px-4 py-2.5 bg-transparent outline-none focus:border-brand-green transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-muted)] mb-1 block">{isRTL ? 'التصنيف' : 'Category'}</label>
                    <select
                      value={medForm.category}
                      onChange={(e) => setMedForm({ ...medForm, category: e.target.value })}
                      className="w-full glass rounded-xl px-4 py-2.5 bg-transparent outline-none focus:border-brand-green transition-colors"
                    >
                      <option value="" className="bg-[var(--bg-dark)]">{isRTL ? 'اختر تصنيفاً...' : 'Select category...'}</option>
                      {MEDICINE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat} className="bg-[var(--bg-dark)]">{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  onClick={saveMed}
                  disabled={medSaving}
                  className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                >
                  {medSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {editingMed ? (isRTL ? 'حفظ التعديلات' : 'Save changes') : (isRTL ? 'إضافة' : 'Add')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirm modal */}
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
              className="glass-card p-6 w-full max-w-sm"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-400" />
                </div>
                <h2 className="font-bold">{isRTL ? 'حذف الدواء؟' : 'Delete medicine?'}</h2>
              </div>
              <p className="text-sm text-[var(--text-muted)] mb-5">
                {isRTL ? `هل أنت متأكد من حذف "${deleteTarget.medicine_name}"؟` : `Are you sure you want to delete "${deleteTarget.medicine_name}"?`}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setDeleteTarget(null)} className="flex-1 glass rounded-xl py-2.5 font-bold hover:bg-white/10 transition-colors">
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </button>
                <button onClick={confirmDeleteMed} className="flex-1 rounded-xl py-2.5 font-bold bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors">
                  {isRTL ? 'حذف' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
