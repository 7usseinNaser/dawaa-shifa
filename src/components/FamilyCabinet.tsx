import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Plus, Pill, Clock, Trash2, Loader2, X, Heart, Baby, User, Pencil, Check,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useLang } from '@/lib/i18n';
import { supabase, type FamilyMember, type ChronicMedicine } from '@/lib/supabase';
import { showToast } from '@/components/ui/Toast';
import { DrugInteractionChecker, RefillPredictor } from '@/components/AIFeatures';

function sanitize(str: string): string {
  return String(str || '').replace(/[<>]/g, '').trim().slice(0, 200);
}

export function FamilyCabinet() {
  const { user } = useAuth();
  const { lang } = useLang();
  const isRTL = lang === 'ar';
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [meds, setMeds] = useState<ChronicMedicine[]>([]);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [showMedForm, setShowMedForm] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [memberForm, setMemberForm] = useState({ name: '', age: '', relation: 'self' });
  const [medForm, setMedForm] = useState({ name: '', dosage: '', times: '', pillsLeft: '', pillsPerDay: '1' });
  const [doseTimes, setDoseTimes] = useState<string[]>(['09:00']);
  const [editingMedId, setEditingMedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [memRes, medRes] = await Promise.all([
          supabase.from('family_cabinet').select('*').eq('owner_id', user.id).order('created_at', { ascending: true }),
          supabase.from('chronic_medicines').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        ]);
        setMembers((memRes.data || []) as FamilyMember[]);
        setMeds((medRes.data || []) as ChronicMedicine[]);
      } catch {
        // offline
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const addMember = async () => {
    if (!user || !memberForm.name.trim()) return;
    try {
      const { data, error } = await supabase.from('family_cabinet').insert({
        owner_id: user.id,
        member_name: sanitize(memberForm.name),
        member_age: parseInt(memberForm.age) || 0,
        member_relation: memberForm.relation,
      }).select().single();
      if (error) throw error;
      setMembers([...members, data as FamilyMember]);
      showToast(isRTL ? 'تمت إضافة فرد' : 'Member added');
      setMemberForm({ name: '', age: '', relation: 'self' });
      setShowMemberForm(false);
    } catch {
      showToast(isRTL ? 'فشل' : 'Failed', 'error');
    }
  };

  const removeMember = async (id: string) => {
    try {
      await supabase.from('family_cabinet').delete().eq('id', id);
      setMembers(members.filter((m) => m.id !== id));
      showToast(isRTL ? 'تم الحذف' : 'Removed');
    } catch {
      showToast(isRTL ? 'فشل' : 'Failed', 'error');
    }
  };

  const addMed = async (memberId: string | null) => {
    if (!user || !medForm.name.trim()) return;
    const timesStr = doseTimes.filter(Boolean).join(', ');
    try {
      const { data, error } = await supabase.from('chronic_medicines').insert({
        user_id: user.id,
        member_id: memberId,
        name: sanitize(medForm.name),
        dosage: sanitize(medForm.dosage),
        times: timesStr,
        pills_left: parseInt(medForm.pillsLeft) || 0,
        pills_per_day: parseFloat(medForm.pillsPerDay) || 1,
      }).select().single();
      if (error) throw error;
      setMeds([...meds, data as ChronicMedicine]);
      showToast(isRTL ? 'تم حفظ الدواء' : 'Medicine saved');
      setMedForm({ name: '', dosage: '', times: '', pillsLeft: '', pillsPerDay: '1' });
      setDoseTimes(['09:00']);
      setShowMedForm(null);
    } catch {
      showToast(isRTL ? 'فشل' : 'Failed', 'error');
    }
  };

  const startEditMed = (med: ChronicMedicine) => {
    setEditingMedId(med.id);
    setMedForm({
      name: med.name,
      dosage: med.dosage || '',
      times: med.times || '',
      pillsLeft: String(med.pills_left),
      pillsPerDay: String(med.pills_per_day || 1),
    });
    const parsed = (med.times || '').split(',').map((t) => t.trim()).filter(Boolean);
    setDoseTimes(parsed.length > 0 ? parsed : ['09:00']);
  };

  const saveEditMed = async () => {
    if (!editingMedId) return;
    const timesStr = doseTimes.filter(Boolean).join(', ');
    try {
      const { error } = await supabase.from('chronic_medicines').update({
        name: sanitize(medForm.name),
        dosage: sanitize(medForm.dosage),
        times: timesStr,
        pills_left: parseInt(medForm.pillsLeft) || 0,
        pills_per_day: parseFloat(medForm.pillsPerDay) || 1,
      }).eq('id', editingMedId);
      if (error) throw error;
      setMeds(meds.map((m) => m.id === editingMedId ? {
        ...m,
        name: sanitize(medForm.name),
        dosage: sanitize(medForm.dosage),
        times: timesStr,
        pills_left: parseInt(medForm.pillsLeft) || 0,
        pills_per_day: parseFloat(medForm.pillsPerDay) || 1,
      } : m));
      showToast(isRTL ? 'تم تحديث الدواء' : 'Medicine updated');
      setEditingMedId(null);
      setMedForm({ name: '', dosage: '', times: '', pillsLeft: '', pillsPerDay: '1' });
      setDoseTimes(['09:00']);
    } catch {
      showToast(isRTL ? 'فشل' : 'Failed', 'error');
    }
  };

  const removeMed = async (id: string) => {
    try {
      await supabase.from('chronic_medicines').delete().eq('id', id);
      setMeds(meds.filter((m) => m.id !== id));
      if (editingMedId === id) setEditingMedId(null);
      showToast(isRTL ? 'تم حذف الدواء' : 'Medicine removed');
    } catch {
      showToast(isRTL ? 'فشل' : 'Failed', 'error');
    }
  };

  const relationIcons: Record<string, JSX.Element> = {
    self: <User className="w-4 h-4 text-brand-green-light" />,
    child: <Baby className="w-4 h-4 text-brand-blue-light" />,
    parent: <Heart className="w-4 h-4 text-status-emergency" />,
    spouse: <Heart className="w-4 h-4 text-amber-400" />,
    other: <User className="w-4 h-4 text-[var(--text-muted)]" />,
  };

  if (loading) return <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-brand-green" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-cairo font-bold text-lg flex items-center gap-2">
          <Users className="w-5 h-5 text-brand-green-light" />
          {isRTL ? 'خزانة العائلة' : 'Family Cabinet'}
        </h2>
        <button onClick={() => setShowMemberForm(true)} className="btn-primary text-xs flex items-center gap-1">
          <Plus className="w-4 h-4" />
          {isRTL ? 'إضافة فرد' : 'Add Member'}
        </button>
      </div>

      {/* AI Features */}
      <DrugInteractionChecker chronicMeds={meds} />
      <RefillPredictor chronicMeds={meds} />

      {/* Member form */}
      <AnimatePresence>
        {showMemberForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-card p-4 space-y-3 overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-cairo font-bold text-sm">{isRTL ? 'فرد جديد' : 'New Member'}</h3>
              <button onClick={() => setShowMemberForm(false)} className="text-[var(--text-muted)]"><X className="w-4 h-4" /></button>
            </div>
            <input value={memberForm.name} onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })} placeholder={isRTL ? 'الاسم' : 'Name'} className="w-full glass-card p-3 text-sm font-tajawal focus:outline-none focus:border-brand-green" />
            <input type="number" value={memberForm.age} onChange={(e) => setMemberForm({ ...memberForm, age: e.target.value })} placeholder={isRTL ? 'العمر' : 'Age'} className="w-full glass-card p-3 text-sm font-tajawal focus:outline-none focus:border-brand-green" />
            <select value={memberForm.relation} onChange={(e) => setMemberForm({ ...memberForm, relation: e.target.value })} className="w-full glass-card p-3 text-sm font-tajawal rounded-xl">
              <option value="self">{isRTL ? 'نفسي' : 'Self'}</option>
              <option value="child">{isRTL ? 'طفل' : 'Child'}</option>
              <option value="parent">{isRTL ? 'والد/والدة' : 'Parent'}</option>
              <option value="spouse">{isRTL ? 'زوج/زوجة' : 'Spouse'}</option>
              <option value="other">{isRTL ? 'أخرى' : 'Other'}</option>
            </select>
            <button onClick={addMember} className="btn-primary w-full text-sm">{isRTL ? 'إضافة' : 'Add'}</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Members list */}
      {members.length === 0 && !showMemberForm ? (
        <div className="glass-card p-8 text-center">
          <Users className="w-10 h-10 mx-auto mb-3 text-[var(--text-muted)]" />
          <p className="font-tajawal text-[var(--text-muted)]">{isRTL ? 'لا يوجد أفراد بعد. أضف أفراد عائلتك لتتبع أدويتهم.' : 'No members yet. Add your family members to track their medicines.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {members.map((m) => {
            const memberMeds = meds.filter((med) => med.member_id === m.id);
            return (
              <motion.div key={m.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-green/20 flex items-center justify-center shrink-0">
                      {relationIcons[m.member_relation] || <User className="w-5 h-5 text-brand-green-light" />}
                    </div>
                    <div>
                      <div className="font-cairo font-bold text-sm">{m.member_name}</div>
                      <div className="text-xs text-[var(--text-muted)] font-tajawal">{m.member_age} {isRTL ? 'سنة' : 'yrs'} · {m.member_relation}</div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setShowMedForm(m.id)} className="p-1.5 rounded-lg glass text-brand-green-light hover:bg-brand-green/15"><Plus className="w-3.5 h-3.5" /></button>
                    <button onClick={() => removeMember(m.id)} className="p-1.5 rounded-lg glass text-status-emergency hover:bg-status-emergency/15"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>

                {/* Med form for this member */}
                <AnimatePresence>
                  {showMedForm === m.id && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-2 overflow-hidden">
                      <input value={medForm.name} onChange={(e) => setMedForm({ ...medForm, name: e.target.value })} placeholder={isRTL ? 'اسم الدواء' : 'Medicine name'} className="w-full glass-card p-2.5 text-sm font-tajawal focus:outline-none focus:border-brand-green" />
                      <div className="flex gap-2">
                        <input value={medForm.dosage} onChange={(e) => setMedForm({ ...medForm, dosage: e.target.value })} placeholder={isRTL ? 'الجرعة' : 'Dosage'} className="flex-1 glass-card p-2.5 text-sm font-tajawal focus:outline-none focus:border-brand-green" />
                        <input type="number" value={medForm.pillsLeft} onChange={(e) => setMedForm({ ...medForm, pillsLeft: e.target.value })} placeholder={isRTL ? 'الحبات' : 'Pills'} className="flex-1 glass-card p-2.5 text-sm font-tajawal focus:outline-none focus:border-brand-green" />
                      </div>
                      <div>
                        <label className="text-xs font-tajawal text-[var(--text-muted)] block mb-1">{isRTL ? 'عدد الجرعات اليومية' : 'Daily doses'}</label>
                        <input type="number" min="1" max="6" value={medForm.pillsPerDay} onChange={(e) => {
                          const n = Math.max(1, Math.min(6, parseInt(e.target.value) || 1));
                          setMedForm({ ...medForm, pillsPerDay: String(n) });
                          setDoseTimes(prev => {
                            const next = [...prev];
                            while (next.length < n) next.push('');
                            while (next.length > n) next.pop();
                            return next;
                          });
                        }} className="w-full glass-card p-2.5 text-sm font-tajawal focus:outline-none focus:border-brand-green" />
                      </div>
                      {doseTimes.map((t, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-xs font-tajawal text-[var(--text-muted)] shrink-0 w-20">{isRTL ? `الجرعة ${i + 1}` : `Dose ${i + 1}`}</span>
                          <input type="time" value={t} onChange={(e) => setDoseTimes(prev => prev.map((x, j) => j === i ? e.target.value : x))} className="flex-1 glass-card p-2 text-sm font-tajawal focus:outline-none focus:border-brand-green" />
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <button onClick={() => addMed(m.id)} className="btn-primary flex-1 text-xs">{isRTL ? 'حفظ' : 'Save'}</button>
                        <button onClick={() => setShowMedForm(null)} className="btn-secondary text-xs px-4">{isRTL ? 'إلغاء' : 'Cancel'}</button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Member's meds */}
                {memberMeds.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-[var(--border-subtle)]">
                    {memberMeds.map((med) => (
                      <div key={med.id} className="flex items-center gap-2 text-xs">
                        <Pill className="w-3 h-3 text-brand-green-light shrink-0" />
                        <span className="font-cairo font-bold flex-1 truncate">{med.name}</span>
                        {med.dosage && <span className="text-[var(--text-muted)] font-tajawal">{med.dosage}</span>}
                        {med.times && <span className="flex items-center gap-0.5 text-brand-blue-light"><Clock className="w-2.5 h-2.5" />{med.times}</span>}
                        <span className={`font-inter font-bold ${med.pills_left <= 5 ? 'text-status-emergency' : 'text-status-open'}`}>{med.pills_left}</span>
                        <button onClick={() => startEditMed(med)} className="p-1 text-brand-blue-light"><Pencil className="w-3 h-3" /></button>
                        <button onClick={() => removeMed(med.id)} className="p-1 text-status-emergency"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Edit med form */}
                <AnimatePresence>
                  {editingMedId && memberMeds.some((m) => m.id === editingMedId) && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-2 overflow-hidden pt-2 border-t border-[var(--border-subtle)]">
                      <div className="flex items-center gap-1.5 text-xs font-cairo font-bold text-brand-blue-light"><Pencil className="w-3 h-3" /> {isRTL ? 'تعديل الدواء' : 'Edit Medicine'}</div>
                      <input value={medForm.name} onChange={(e) => setMedForm({ ...medForm, name: e.target.value })} placeholder={isRTL ? 'اسم الدواء' : 'Medicine name'} className="w-full glass-card p-2.5 text-sm font-tajawal focus:outline-none focus:border-brand-green" />
                      <div className="flex gap-2">
                        <input value={medForm.dosage} onChange={(e) => setMedForm({ ...medForm, dosage: e.target.value })} placeholder={isRTL ? 'الجرعة' : 'Dosage'} className="flex-1 glass-card p-2.5 text-sm font-tajawal focus:outline-none focus:border-brand-green" />
                        <input type="number" value={medForm.pillsLeft} onChange={(e) => setMedForm({ ...medForm, pillsLeft: e.target.value })} placeholder={isRTL ? 'الحبات' : 'Pills'} className="flex-1 glass-card p-2.5 text-sm font-tajawal focus:outline-none focus:border-brand-green" />
                      </div>
                      <div>
                        <label className="text-xs font-tajawal text-[var(--text-muted)] block mb-1">{isRTL ? 'عدد الجرعات اليومية' : 'Daily doses'}</label>
                        <input type="number" min="1" max="6" value={medForm.pillsPerDay} onChange={(e) => {
                          const n = Math.max(1, Math.min(6, parseInt(e.target.value) || 1));
                          setMedForm({ ...medForm, pillsPerDay: String(n) });
                          setDoseTimes(prev => {
                            const next = [...prev];
                            while (next.length < n) next.push('');
                            while (next.length > n) next.pop();
                            return next;
                          });
                        }} className="w-full glass-card p-2.5 text-sm font-tajawal focus:outline-none focus:border-brand-green" />
                      </div>
                      {doseTimes.map((t, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-xs font-tajawal text-[var(--text-muted)] shrink-0 w-20">{isRTL ? `الجرعة ${i + 1}` : `Dose ${i + 1}`}</span>
                          <input type="time" value={t} onChange={(e) => setDoseTimes(prev => prev.map((x, j) => j === i ? e.target.value : x))} className="flex-1 glass-card p-2 text-sm font-tajawal focus:outline-none focus:border-brand-green" />
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <button onClick={saveEditMed} className="btn-primary flex-1 text-xs flex items-center justify-center gap-1"><Check className="w-3 h-3" /> {isRTL ? 'حفظ' : 'Save'}</button>
                        <button onClick={() => { setEditingMedId(null); setMedForm({ name: '', dosage: '', times: '', pillsLeft: '', pillsPerDay: '1' }); setDoseTimes(['09:00']); }} className="btn-secondary text-xs px-4">{isRTL ? 'إلغاء' : 'Cancel'}</button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   RADIUS SELECTOR
   Filters pharmacies/facilities by distance
   ============================================================ */
export function RadiusSelector({ value, onChange, isRTL }: {
  value: number;
  onChange: (v: number) => void;
  isRTL: boolean;
}) {
  const options = [1, 5, 10, 25, 0]; // 0 = all
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-tajawal text-[var(--text-muted)] shrink-0">{isRTL ? 'المسافة:' : 'Radius:'}</span>
      <div className="flex gap-1 flex-wrap">
        {options.map((r) => (
          <button
            key={r}
            onClick={() => onChange(r)}
            className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors ${value === r ? 'bg-brand-green text-white' : 'glass text-[var(--text-soft)]'}`}
          >
            {r === 0 ? (isRTL ? 'الكل' : 'All') : `${r} km`}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   SENIOR MODE TOGGLE
   Global toggle for enlarged fonts, simplified UI
   ============================================================ */
export function SeniorModeToggle() {
  const { lang } = useLang();
  const isRTL = lang === 'ar';
  const [active, setActive] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (active) {
      root.style.fontSize = '120%';
      root.classList.add('senior-mode');
    } else {
      root.style.fontSize = '';
      root.classList.remove('senior-mode');
    }
  }, [active]);

  return (
    <button
      onClick={() => setActive(!active)}
      className={`fixed top-4 ${isRTL ? 'left-4' : 'right-4'} z-50 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${
        active ? 'bg-brand-green text-white shadow-lg' : 'glass-card text-[var(--text-soft)]'
      }`}
    >
      <Heart className={`w-3.5 h-3.5 ${active ? 'fill-white' : ''}`} />
      {isRTL ? 'وضع كبار السن' : 'Senior Mode'}
    </button>
  );
}
