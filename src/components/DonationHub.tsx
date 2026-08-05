import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Plus, X, Clock, Package, MapPin, CircleCheck as CheckCircle, Circle as XCircle, Loader as Loader2, Heart, TriangleAlert as AlertTriangle, MessageCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useLang } from '@/lib/i18n';
import { supabase, type MedicineDonation, type Pharmacy } from '@/lib/supabase';
import { showToast, ToastContainer, useToast } from '@/components/ui/Toast';
import type { DonationType } from '@/components/DonationModal';

export function DonationHub({ onOpenModal }: { onOpenModal?: (type: DonationType) => void }) {
  const { user, profile } = useAuth();
  const { lang } = useLang();
  const isRTL = lang === 'ar';
  const { toasts, remove } = useToast();
  const showToastMsg = showToast;

  const [donations, setDonations] = useState<MedicineDonation[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Form state
  const [medicineName, setMedicineName] = useState('');
  const [genericName, setGenericName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [expiryDate, setExpiryDate] = useState('');
  const [condition, setCondition] = useState<'sealed' | 'loose'>('sealed');
  const [area, setArea] = useState('');
  const [notes, setNotes] = useState('');
  const [phone, setPhone] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [donRes, pharmRes] = await Promise.all([
      supabase.from('medicine_donations').select('id,donor_id,donor_name,donor_phone,medicine_name,generic_name,quantity,expiry_date,condition,area,notes,status,pharmacy_id,rejection_reason,recipient_pharmacy_id,recipient_facility_id,distributed_at,created_at,updated_at').order('created_at', { ascending: false }),
      supabase.from('pharmacies').select('id,name,area,phone,verified,deleted_at').eq('verified', true).is('deleted_at', null),
    ]);
    if (donRes.data) setDonations(donRes.data as MedicineDonation[]);
    if (pharmRes.data) setPharmacies(pharmRes.data as Pharmacy[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const submitDonation = async () => {
    if (!user || !medicineName.trim()) return;
    setActionLoading('new');
    try {
      const { error } = await supabase.from('medicine_donations').insert({
        donor_id: user.id,
        donor_name: profile?.display_name || '',
        donor_phone: phone.trim(),
        medicine_name: medicineName.trim(),
        generic_name: genericName.trim(),
        quantity,
        expiry_date: expiryDate || null,
        condition,
        area: area.trim(),
        notes: notes.trim(),
        status: 'pending',
      });
      if (error) throw error;
      showToastMsg(isRTL ? 'تم تقديم طلب التبرع بنجاح! شكراً لك' : 'Donation submitted successfully! Thank you');
      setShowForm(false);
      setMedicineName(''); setGenericName(''); setQuantity(1); setExpiryDate(''); setArea(''); setNotes(''); setPhone('');
      load();
    } catch {
      showToastMsg(isRTL ? 'فشل إرسال الطلب' : 'Failed to submit', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-500/20 text-amber-400',
    approved: 'bg-status-open/20 text-status-open',
    rejected: 'bg-status-emergency/20 text-status-emergency',
    distributed: 'bg-brand-blue/20 text-brand-blue-light',
  };
  const statusLabels: Record<string, string> = {
    pending: isRTL ? 'قيد المراجعة' : 'Pending',
    approved: isRTL ? 'مقبول' : 'Approved',
    rejected: isRTL ? 'مرفوض' : 'Rejected',
    distributed: isRTL ? 'تم التوزيع' : 'Distributed',
  };

  return (
    <div className="space-y-4">
      <ToastContainer toasts={toasts} onRemove={remove} />

      {/* Hero */}
      <div className="glass-card p-5 bg-gradient-to-br from-brand-green/10 to-brand-blue/10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-green to-brand-blue flex items-center justify-center">
            <Gift className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-cairo font-bold text-lg">{isRTL ? 'مركز التبرع بالأدوية' : 'Medicine Donation Hub'}</h2>
            <p className="text-xs font-tajawal text-[var(--text-muted)]">{isRTL ? 'تبرع بأدويتك السليمة لمحتاجين' : 'Donate your unused medicines to those in need'}</p>
          </div>
        </div>
        <p className="text-sm font-tajawal text-[var(--text-soft)] leading-relaxed">
          {isRTL
            ? 'هل لديك أدوية سليمة غير مستعملة؟ يمكنك التبرع بها للصيدليات والمرافق الطبية المعتمدة حيث يتم التحقق منها وتوزيعها على المرضى المحتاجين. التبرع بالأدوية المنتهية الصلاحية ممنوع.'
            : 'Do you have unused sealed medicines? You can donate them to verified pharmacies and medical facilities where they are verified and distributed to patients in need. Expired medicines cannot be donated.'}
        </p>
      </div>

      {/* Donate button */}
      <button onClick={() => setShowForm(true)} className="btn-primary w-full flex items-center justify-center gap-2">
        <Plus className="w-5 h-5" />
        {isRTL ? 'تبرع بدواء' : 'Donate Medicine'}
      </button>

      {/* Donation CTA */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => onOpenModal?.('medicine')} className="glass-card p-3 rounded-2xl text-center hover:scale-[1.02] transition-transform">
          <Gift className="w-5 h-5 mx-auto mb-1 text-brand-green-light" />
          <div className="font-cairo font-bold text-xs">{isRTL ? 'تبرع بدواء' : 'Donate Medicine'}</div>
          <div className="text-[10px] font-tajawal text-[var(--text-muted)] mt-0.5">{isRTL ? 'أدوية مغلقة وغير مستعملة' : 'Sealed, unused medicines'}</div>
        </button>
        <button onClick={() => onOpenModal?.('platform')} className="glass-card p-3 rounded-2xl text-center hover:scale-[1.02] transition-transform">
          <Heart className="w-5 h-5 mx-auto mb-1 text-brand-blue-light" />
          <div className="font-cairo font-bold text-xs">{isRTL ? 'دعم المنصة' : 'Support Platform'}</div>
          <div className="text-[10px] font-tajawal text-[var(--text-muted)] mt-0.5">{isRTL ? 'دعم مالي' : 'Financial support'}</div>
        </button>
      </div>

      {/* Donations list */}
      <div>
        <h3 className="font-cairo font-bold text-sm mb-2">{isRTL ? 'التبرعات الأخيرة' : 'Recent Donations'}</h3>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-brand-green-light" /></div>
        ) : donations.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <Heart className="w-10 h-10 mx-auto mb-3 text-[var(--text-muted)]" />
            <p className="font-tajawal text-[var(--text-muted)] text-sm">{isRTL ? 'لا توجد تبرعات بعد. كن أول المتبرعين!' : 'No donations yet. Be the first to donate!'}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {donations.map((d, i) => (
              <motion.div key={d.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.05 } }} className="glass-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-brand-green/15 flex items-center justify-center shrink-0">
                      <Package className="w-4 h-4 text-brand-green-light" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-cairo font-bold text-sm truncate">{d.medicine_name}</div>
                      <div className="text-xs text-[var(--text-muted)] font-tajawal flex items-center gap-1.5 flex-wrap">
                        <span>{d.generic_name || '—'}</span>
                        <span>·</span>
                        <span>{isRTL ? 'كمية' : 'Qty'}: {d.quantity}</span>
                        {d.expiry_date && (<><span>·</span><span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{d.expiry_date}</span></>)}
                        {d.area && (<><span>·</span><span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{d.area}</span></>)}
                      </div>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${statusColors[d.status]}`}>{statusLabels[d.status]}</span>
                </div>
                {d.notes && <p className="text-xs font-tajawal text-[var(--text-muted)] mt-2 ps-11">{d.notes}</p>}
                <div className="text-[10px] text-[var(--text-muted)] mt-1 ps-11">{isRTL ? 'من: ' : 'By: '}{d.donor_name || (isRTL ? 'مجهول' : 'Anonymous')}</div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Donation Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setShowForm(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-card p-5 w-full max-w-md max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-cairo font-bold text-base flex items-center gap-2"><Gift className="w-5 h-5 text-brand-green-light" />{isRTL ? 'نموذج التبرع' : 'Donation Form'}</h3>
                <button onClick={() => setShowForm(false)} className="text-[var(--text-muted)]"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-tajawal font-bold text-[var(--text-muted)] block mb-1">{isRTL ? 'اسم الدواء *' : 'Medicine Name *'}</label>
                  <input value={medicineName} onChange={(e) => setMedicineName(e.target.value)} className="w-full glass-card px-3 py-2.5 text-sm font-tajawal focus:outline-none focus:border-brand-green" placeholder={isRTL ? 'مثال: بانادول' : 'e.g. Panadol'} />
                </div>
                <div>
                  <label className="text-xs font-tajawal font-bold text-[var(--text-muted)] block mb-1">{isRTL ? 'المادة الفعالة' : 'Generic Name'}</label>
                  <input value={genericName} onChange={(e) => setGenericName(e.target.value)} className="w-full glass-card px-3 py-2.5 text-sm font-tajawal focus:outline-none focus:border-brand-green" placeholder={isRTL ? 'مثال: باراسيتامول' : 'e.g. Paracetamol'} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-tajawal font-bold text-[var(--text-muted)] block mb-1">{isRTL ? 'الكمية' : 'Quantity'}</label>
                    <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="w-full glass-card px-3 py-2.5 text-sm font-tajawal focus:outline-none focus:border-brand-green" />
                  </div>
                  <div>
                    <label className="text-xs font-tajawal font-bold text-[var(--text-muted)] block mb-1">{isRTL ? 'تاريخ الانتهاء' : 'Expiry Date'}</label>
                    <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="w-full glass-card px-3 py-2.5 text-sm font-tajawal focus:outline-none focus:border-brand-green" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-tajawal font-bold text-[var(--text-muted)] block mb-1">{isRTL ? 'الحالة' : 'Condition'}</label>
                  <div className="flex gap-2">
                    {(['sealed', 'loose'] as const).map((c) => (
                      <button key={c} onClick={() => setCondition(c)} className={`flex-1 py-2 rounded-xl text-sm font-tajawal font-bold transition-colors ${condition === c ? 'bg-brand-green text-white' : 'glass text-[var(--text-soft)]'}`}>
                        {c === 'sealed' ? (isRTL ? 'مغلق أصلي' : 'Sealed') : (isRTL ? 'مفتوح' : 'Loose')}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-tajawal font-bold text-[var(--text-muted)] block mb-1">{isRTL ? 'رقم الهاتف' : 'Phone Number'}</label>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full glass-card px-3 py-2.5 text-sm font-tajawal focus:outline-none focus:border-brand-green" placeholder={isRTL ? 'مثال: 0599123456' : 'e.g. 0599123456'} />
                </div>
                <div>
                  <label className="text-xs font-tajawal font-bold text-[var(--text-muted)] block mb-1">{isRTL ? 'المحافظة' : 'Governorate'}</label>
                  <input value={area} onChange={(e) => setArea(e.target.value)} className="w-full glass-card px-3 py-2.5 text-sm font-tajawal focus:outline-none focus:border-brand-green" placeholder={isRTL ? 'مثال: غزة' : 'e.g. Gaza'} />
                </div>
                <div>
                  <label className="text-xs font-tajawal font-bold text-[var(--text-muted)] block mb-1">{isRTL ? 'ملاحظات' : 'Notes'}</label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full glass-card px-3 py-2.5 text-sm font-tajawal focus:outline-none focus:border-brand-green resize-none" placeholder={isRTL ? 'أي تفاصيل إضافية...' : 'Any additional details...'} />
                </div>
                <div className="glass-card p-2.5 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-[10px] font-tajawal text-[var(--text-muted)]">{isRTL ? 'الأدوية المنتهية الصلاحية لا يمكن التبرع بها. سيتم التحقق من جميع التبرعات قبل التوزيع.' : 'Expired medicines cannot be donated. All donations are verified before distribution.'}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={submitDonation} disabled={!medicineName.trim() || actionLoading === 'new'} className="btn-primary flex-1 text-sm flex items-center justify-center gap-1.5 disabled:opacity-50">
                  {actionLoading === 'new' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  {isRTL ? 'تقديم التبرع' : 'Submit Donation'}
                </button>
                <button onClick={() => setShowForm(false)} className="btn-secondary text-sm px-4"><XCircle className="w-4 h-4 inline -mt-0.5" /> {isRTL ? 'إلغاء' : 'Cancel'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
