import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pill, Plus, Trash2, Clock, Loader2, MapPin, AlertCircle, Edit3, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useLang } from '@/lib/i18n';
import { supabase, type Pharmacy, type Medicine } from '@/lib/supabase';
import { showToast } from '@/components/ui/Toast';
import { useOnlineStatus, enqueueOfflineOp } from '@/lib/offline';

interface ChronicMed {
  id: string;
  name: string;
  dosage: string;
  times: string;
  pillsLeft: number;
  notes: string;
  createdAt: number;
}

const STORAGE_KEY = 'dawaa_chronic_meds';

function sanitize(str: string): string {
  return String(str || '').replace(/[<>]/g, '').trim().slice(0, 200);
}

function loadChronicMeds(): ChronicMed[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveChronicMeds(meds: ChronicMed[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(meds));
}

export default function ChronicMedicines() {
  const { user } = useAuth();
  const { t, lang } = useLang();
  const online = useOnlineStatus();
  const [meds, setMeds] = useState<ChronicMed[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', dosage: '', times: '', pillsLeft: '', notes: '' });
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [allMedicines, setAllMedicines] = useState<Medicine[]>([]);
  const [availability, setAvailability] = useState<Record<string, Pharmacy[]>>({});

  useEffect(() => {
    setMeds(loadChronicMeds());
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [{ data: ph }, { data: meds }] = await Promise.all([
          supabase.from('pharmacies').select('*'),
          supabase.from('medicines').select('*'),
        ]);
        if (ph) setPharmacies(ph as Pharmacy[]);
        if (meds) setAllMedicines(meds as Medicine[]);
      } catch {
        // offline — skip
      }
    })();
  }, []);

  useEffect(() => {
    const map: Record<string, Pharmacy[]> = {};
    for (const cm of meds) {
      const matches: Pharmacy[] = [];
      const lowerName = cm.name.toLowerCase().trim();
      for (const m of allMedicines) {
        if (
          m.is_available &&
          (m.medicine_name.toLowerCase().includes(lowerName) ||
            m.generic_name.toLowerCase().includes(lowerName))
        ) {
          const pharm = pharmacies.find((p) => p.id === m.pharmacy_id);
          if (pharm && !matches.find((x) => x.id === pharm.id)) matches.push(pharm);
        }
      }
      map[cm.id] = matches;
    }
    setAvailability(map);
  }, [meds, allMedicines, pharmacies]);

  const addOrUpdate = () => {
    if (!form.name.trim()) {
      showToast(lang === 'ar' ? 'اسم الدواء مطلوب' : 'Medicine name required', 'error');
      return;
    }
    const newMed: ChronicMed = {
      id: editingId || `cm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: sanitize(form.name),
      dosage: sanitize(form.dosage),
      times: sanitize(form.times),
      pillsLeft: parseInt(form.pillsLeft) || 0,
      notes: sanitize(form.notes),
      createdAt: editingId ? meds.find((m) => m.id === editingId)?.createdAt || Date.now() : Date.now(),
    };
    const updated = editingId
      ? meds.map((m) => (m.id === editingId ? newMed : m))
      : [...meds, newMed];
    setMeds(updated);
    saveChronicMeds(updated);
    showToast(lang === 'ar' ? 'تم حفظ الدواء المزمن' : 'Chronic medicine saved');
    setForm({ name: '', dosage: '', times: '', pillsLeft: '', notes: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const remove = (id: string) => {
    const updated = meds.filter((m) => m.id !== id);
    setMeds(updated);
    saveChronicMeds(updated);
    showToast(lang === 'ar' ? 'تم حذف الدواء' : 'Medicine removed', 'info');
  };

  const startEdit = (m: ChronicMed) => {
    setEditingId(m.id);
    setForm({ name: m.name, dosage: m.dosage, times: m.times, pillsLeft: String(m.pillsLeft), notes: m.notes });
    setShowForm(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ name: '', dosage: '', times: '', pillsLeft: '', notes: '' });
    setShowForm(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-cairo font-bold text-lg flex items-center gap-2">
          <Pill className="w-5 h-5 text-brand-green-light" />
          {lang === 'ar' ? 'أدويتي المزمنة' : 'My Chronic Medicines'}
        </h2>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary text-xs flex items-center gap-1">
            <Plus className="w-4 h-4" />
            {lang === 'ar' ? 'إضافة دواء' : 'Add Medicine'}
          </button>
        )}
      </div>

      {!online && (
        <div className="glass-card p-3 flex items-center gap-2 text-xs text-status-busy font-tajawal">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {lang === 'ar' ? 'أنت غير متصل — التغييرات تُحفظ محلياً وتُزامن عند عودة الاتصال.' : 'Offline — changes saved locally and synced when back online.'}
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-card p-4 space-y-3 overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-cairo font-bold text-sm">
                {editingId ? (lang === 'ar' ? 'تعديل الدواء' : 'Edit Medicine') : (lang === 'ar' ? 'دواء جديد' : 'New Medicine')}
              </h3>
              <button onClick={cancelEdit} className="text-[var(--text-muted)]"><X className="w-4 h-4" /></button>
            </div>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={lang === 'ar' ? 'اسم الدواء (مثال: جلوكوفاج 850mg)' : 'Medicine name'}
              className="w-full glass-card p-3 text-sm font-tajawal focus:outline-none focus:border-brand-green"
            />
            <input
              value={form.dosage}
              onChange={(e) => setForm({ ...form, dosage: e.target.value })}
              placeholder={lang === 'ar' ? 'الجرعة (مثال: حبة واحدة)' : 'Dosage'}
              className="w-full glass-card p-3 text-sm font-tajawal focus:outline-none focus:border-brand-green"
            />
            <input
              value={form.times}
              onChange={(e) => setForm({ ...form, times: e.target.value })}
              placeholder={lang === 'ar' ? 'أوقات التناول (مثال: 8 صباحاً، 8 مساءً)' : 'Times (e.g. 8am, 8pm)'}
              className="w-full glass-card p-3 text-sm font-tajawal focus:outline-none focus:border-brand-green"
            />
            <input
              type="number"
              value={form.pillsLeft}
              onChange={(e) => setForm({ ...form, pillsLeft: e.target.value })}
              placeholder={lang === 'ar' ? 'عدد الحبات المتبقية' : 'Pills remaining'}
              className="w-full glass-card p-3 text-sm font-tajawal focus:outline-none focus:border-brand-green"
            />
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder={lang === 'ar' ? 'ملاحظات' : 'Notes'}
              rows={2}
              className="w-full glass-card p-3 text-sm font-tajawal focus:outline-none focus:border-brand-green resize-none"
            />
            <button onClick={addOrUpdate} className="btn-primary w-full text-sm">
              {editingId ? (lang === 'ar' ? 'حفظ التعديل' : 'Save Changes') : (lang === 'ar' ? 'إضافة' : 'Add')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {meds.length === 0 && !showForm && (
        <div className="glass-card p-8 text-center">
          <Pill className="w-10 h-10 mx-auto mb-3 text-[var(--text-muted)]" />
          <p className="font-tajawal text-[var(--text-muted)]">
            {lang === 'ar' ? 'لا توجد أدوية مزمنة بعد. أضف دواءك الأول لتتبع توفره في الصيدليات.' : 'No chronic medicines yet. Add your first one to track availability.'}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {meds.map((m, i) => {
          const avail = availability[m.id] || [];
          const lowStock = m.pillsLeft > 0 && m.pillsLeft <= 5;
          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0, transition: { delay: i * 0.05 } }}
              className="glass-card p-4 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-green/20 flex items-center justify-center shrink-0">
                    <Pill className="w-5 h-5 text-brand-green-light" />
                  </div>
                  <div>
                    <div className="font-cairo font-bold text-sm">{m.name}</div>
                    {m.dosage && <div className="text-xs text-[var(--text-muted)] font-tajawal">{m.dosage}</div>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => startEdit(m)} className="p-1.5 rounded-lg glass text-[var(--text-muted)] hover:text-brand-green-light">
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => remove(m.id)} className="p-1.5 rounded-lg glass text-[var(--text-muted)] hover:text-status-emergency">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                {m.times && (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-brand-blue/10 text-brand-blue-light font-tajawal">
                    <Clock className="w-3 h-3" /> {m.times}
                  </span>
                )}
                <span className={`flex items-center gap-1 px-2 py-1 rounded-lg font-tajawal ${lowStock ? 'bg-status-emergency/10 text-status-emergency' : 'bg-status-open/10 text-status-open'}`}>
                  <Pill className="w-3 h-3" />
                  {lang === 'ar' ? `متبقي: ${m.pillsLeft} حبة` : `${m.pillsLeft} pills left`}
                </span>
              </div>

              {m.notes && <p className="text-xs font-tajawal text-[var(--text-soft)]">{m.notes}</p>}

              {avail.length > 0 && (
                <div className="pt-2 border-t border-[var(--border-subtle)]">
                  <p className="text-xs font-tajawal text-[var(--text-muted)] mb-1.5">
                    {lang === 'ar' ? 'متوفر حالياً في:' : 'Currently available at:'}
                  </p>
                  <div className="space-y-1">
                    {avail.slice(0, 3).map((p) => (
                      <div key={p.id} className="flex items-center gap-1.5 text-xs font-tajawal">
                        <MapPin className="w-3 h-3 text-brand-green-light shrink-0" />
                        <span className="font-bold">{p.name}</span>
                        <span className="text-[var(--text-muted)]">· {p.area}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {avail.length === 0 && allMedicines.length > 0 && (
                <div className="pt-2 border-t border-[var(--border-subtle)]">
                  <p className="text-xs font-tajawal text-status-busy">
                    {lang === 'ar' ? 'غير متوفر حالياً في أي صيدلية مسجلة' : 'Not currently available at any registered pharmacy'}
                  </p>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
